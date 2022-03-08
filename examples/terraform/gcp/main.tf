module "utils" {
  source = "../utils"
}

locals {
  hostname_suffix = "c.${var.project_id}.internal"
}

provider "google" {
  project = "${var.project_id}"
  region  = "${var.region}"
  zone    = "${var.primary_zone}"
}

data "google_compute_image" "image_bigip" {
  name    = "${var.bigip_version}"
  project = "${var.imageProjectId}"
}

resource "google_compute_network" "network_mgmt" {
  name                    = "network-${module.utils.env_unique_id}-mgmt"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnetwork_mgmt" {
  name          = "subnet-${module.utils.env_unique_id}-mgmt"
  region        = "${var.region}"
  ip_cidr_range = "10.0.0.0/24"
  network       = "${google_compute_network.network_mgmt.self_link}"
}

resource "google_compute_network" "network_external" {
  name                    = "network-${module.utils.env_unique_id}-external"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnetwork_external" {
  name          = "subnet-${module.utils.env_unique_id}-external"
  region        = "${var.region}"
  ip_cidr_range = "10.0.1.0/24"
  network       = "${google_compute_network.network_external.self_link}"
}


resource "google_compute_network" "network_internal" {
  name                    = "int-net-${module.utils.env_unique_id}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnetwork_internal" {
  name          = "subnet-${module.utils.env_unique_id}-internal"
  region        = "${var.region}"
  ip_cidr_range = "10.0.2.0/24"
  network       = "${google_compute_network.network_internal.self_link}"
}

resource "google_compute_firewall" "fw_mgmt" {
  name    = "fw-${module.utils.env_unique_id}-mgmt"
  network = "${google_compute_network.network_mgmt.name}"

  # Allows SSH and GUI access
  allow {
    protocol = "tcp"
    ports    = ["443", "22"]
  }

  allow {
    protocol = "icmp"
  }
  source_ranges = var.AllowedIPs
}

resource "google_compute_firewall" "fw_external" {
  name    = "fw-${module.utils.env_unique_id}-external"
  network = "${google_compute_network.network_external.name}"

  # Allows vip services 
  allow {
    protocol = "tcp"
    ports    = ["443", "80"]
  }

}

resource "google_compute_firewall" "fw_internal" {
  name    = "fw-${module.utils.env_unique_id}-internal"
  network = "${google_compute_network.network_internal.name}"

  # Allows config-sync
  allow {
    protocol = "tcp"
    ports    = ["4353"]
  }

  # Allows network failover
  allow {
    protocol = "udp"
    ports = ["1026"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.2.0/24"]
}


resource "google_compute_address" "pip_mgmt" {
  name    = "pip-${module.utils.env_unique_id}-bigip-mgmt"
  # beta
  # labels = merge(var.global_tags, { Name="pip-${module.utils.env_unique_id}-bigip-mgmt" })
}

resource "google_compute_address" "pip_external" {
  name    = "pip-${module.utils.env_unique_id}-bigip-external-selfip"
  # beta
  # labels = merge(var.global_tags, { Name="pip-${module.utils.env_unique_id}-bigip-external-selfip" })
}

resource "google_service_account" "sa" {
  account_id   = "sa-${module.utils.env_unique_id}-bigip"
  display_name = "sa-${module.utils.env_unique_id}-bigip"
}

resource "google_project_iam_member" "role_member_assignment" {
  project = var.project_id
  role    = "projects/${var.project_id}/roles/tfCustomRole.${module.utils.env_unique_id}"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_custom_role" "custom_role" {
  role_id = "tfCustomRole.${module.utils.env_unique_id}"
  title = "tfCustomRole.${module.utils.env_unique_id}"
  permissions = ["secretmanager.versions.access", "compute.instances.get"]
}

resource "google_secret_manager_secret" "secret_01" {
  secret_id = "bigIpPass-${module.utils.env_unique_id}"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "secret_version_01" {
  secret      = google_secret_manager_secret.secret_01.id
  secret_data = module.utils.admin_password
}

resource "google_compute_instance" "vm" {
  name         = "vm-${module.utils.env_unique_id}-bigip"
  machine_type = "${var.instance-type}"
  zone         = "${var.primary_zone}"
  can_ip_forward = true

  boot_disk {
    initialize_params {
      image = "${data.google_compute_image.image_bigip.self_link}"
    }
  }

  network_interface {
    network = "${google_compute_network.network_external.self_link}"
    subnetwork = "${google_compute_subnetwork.subnetwork_external.self_link}"
    network_ip = "10.0.1.11"

    access_config {
      nat_ip = google_compute_address.pip_external.address
    }

  }

  network_interface {
    network = "${google_compute_network.network_mgmt.self_link}"
    subnetwork = "${google_compute_subnetwork.subnetwork_mgmt.self_link}"
    network_ip = "10.0.0.11"

    access_config {
      nat_ip = google_compute_address.pip_mgmt.address
    }

  }

  network_interface {
    network = "${google_compute_network.network_internal.self_link}"
    subnetwork = "${google_compute_subnetwork.subnetwork_internal.self_link}"
    network_ip = "10.0.2.11"
  }

  service_account {
    email = google_service_account.sa.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script =  templatefile("${path.module}/startup-script.tpl", {
    ext_subnet_cidr_range: "10.0.1.0/24",
    int_subnet_cidr_range: "10.0.2.0/24",
    mgmt_subnet_cidr_range: "10.0.0.0/24",
    ext_subnet_gateway: "10.0.1.1",
    int_subnet_gateway: "10.0.2.1",
    mgmt_subnet_gateway: "10.0.0.1",
    ext_private_ip: "10.0.1.11",
    int_private_ip: "10.0.2.11",
    mgmt_private_ip: "10.0.0.11/24",
    hostname_suffix: local.hostname_suffix,
    secret_id: "bigIpPass-${module.utils.env_unique_id}",
    package_url: var.bigip_runtime_init_package_url,
  })

  metadata = merge(var.global_tags, { Name="vm-${module.utils.env_unique_id}-bigip" })
  labels   = merge(var.global_tags, { name="vm-${module.utils.env_unique_id}-bigip" })

}

resource "time_sleep" "wait_bigip_ready" {
  depends_on      = [google_compute_instance.vm]
  create_duration = var.wait_bigip_ready
}