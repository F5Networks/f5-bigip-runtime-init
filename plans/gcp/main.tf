module "utils" {
  source = "../../modules/utils"
}

variable "global_tags" {
  type = "map"
  default = {
    creator = "terraform"
    delete  = true
  }
}

locals {
  hostname_suffix = "c.${var.project_id}.internal"
}

provider "google" {
  project = "${var.project_id}"
  region  = "${var.region}"
  zone    = "${var.primary_zone}"
  version = "3.33"
}

data "google_compute_image" "f5-bigip-image" {
  name    = "${var.bigip_version}"
  project = "${var.imageProjectId}"
}

resource "google_compute_network" "ext_network" {
  name                    = "ext-net-${module.utils.env_prefix}"
  auto_create_subnetworks = false
  description             = "${var.reaper_tag}"
}

resource "google_compute_subnetwork" "ext_subnetwork" {
  name          = "ext-subnet-${module.utils.env_prefix}"
  region        = "${var.region}"
  ip_cidr_range = "${var.ext-subnet-cidr-range}"
  network       = "${google_compute_network.ext_network.self_link}"
  description   = "${var.reaper_tag}"
}

resource "google_compute_network" "mgmt_network" {
  name                    = "mgmt-net-${module.utils.env_prefix}"
  auto_create_subnetworks = false
  description             = "${var.reaper_tag}"
}

resource "google_compute_subnetwork" "mgmt_subnetwork" {
  name          = "mgmt-subnet-${module.utils.env_prefix}"
  region        = "${var.region}"
  ip_cidr_range = "${var.mgmt-subnet-cidr-range}"
  network       = "${google_compute_network.mgmt_network.self_link}"
  description   = "${var.reaper_tag}"
}

resource "google_compute_network" "int_network" {
  name                    = "int-net-${module.utils.env_prefix}"
  auto_create_subnetworks = false
  description             = "${var.reaper_tag}"
}

resource "google_compute_subnetwork" "int_subnetwork" {
  name          = "int-subnet-${module.utils.env_prefix}"
  region        = "${var.region}"
  ip_cidr_range = "${var.int-subnet-cidr-range}"
  network       = "${google_compute_network.int_network.self_link}"
  description   = "${var.reaper_tag}"
}

resource "google_compute_target_instance" "vm" {
  name        = "tf-func-test-bigip-runtime-init-${module.utils.env_prefix}"
  nat_policy  = "NO_NAT"
  instance    = "${google_compute_instance.vm.self_link}"
  zone        = google_compute_instance.vm.zone
  description = "${var.reaper_tag}"
}

resource "google_compute_firewall" "internal" {
  name    = "tf-func-test-bigip-traffic-internal-firewall-${module.utils.env_prefix}"
  network = "${google_compute_network.int_network.name}"
  description = "${var.reaper_tag}"

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["4353"]
  }

  allow {
    protocol = "udp"
    ports = ["1026"]
  }

}

resource "google_compute_firewall" "mgmt" {
  name    = "tf-func-test-bigip-traffic-mgmt-firewall-${module.utils.env_prefix}"
  network = "${google_compute_network.mgmt_network.name}"
  description = "${var.reaper_tag}"

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["4353"]
  }

  allow {
    protocol = "tcp"
    ports    = ["443", "22"]
  }

}

resource "google_compute_firewall" "ext" {
  name    = "tf-func-test-bigip-traffic-ext-firewall-${module.utils.env_prefix}"
  network = "${google_compute_network.ext_network.name}"
  description = "${var.reaper_tag}"

  allow {
    protocol = "tcp"
    ports    = ["443", "22"]
  }

  allow {
    protocol = "icmp"
  }

}

resource "google_storage_bucket" "file-store" {
  name = "${module.utils.env_prefix}"
  force_destroy = true

  labels = merge(var.global_tags, {f5_bigip_runtime_init = "${module.utils.env_prefix}"})
}

data "template_file" "vm_cloud_init_script" {
  template = "${file("${path.module}/user_data.tpl")}"

  vars = {
    admin_username         = "${var.admin_username}"
    admin_password         = "${module.utils.admin_password}"
    ext_subnet_cidr_range  = "${var.ext-subnet-cidr-range}"
    int_subnet_cidr_range  = "${var.int-subnet-cidr-range}"
    mgmt_subnet_cidr_range = "${var.mgmt-subnet-cidr-range}"
    ext_subnet_gateway     = "${var.ext-subnet-getway}"
    int_subnet_gateway     = "${var.int-subnet-getway}"
    mgmt_subnet_gateway    = "${var.mgmt-subnet-getway}"
    ext_private_ip         = "${var.vm-ext-private-ip}"
    int_private_ip         = "${var.vm-int-private-ip}"
    mgmt_private_ip        = "${var.vm-mgmt-private-ip}/24"
    hostname_suffix        = "${local.hostname_suffix}"
    deployment_id          = "${module.utils.env_prefix}"
  }
}

resource "google_service_account" "sa" {
  account_id   = "tf-func-test-sa-${module.utils.env_prefix}"
  display_name = "tf-func-test-sa-${module.utils.env_prefix}"
  description = "${var.reaper_tag}"
}


resource "google_project_iam_member" "gcp_role_member_assignment" {
  project = var.project_id
  role    = "projects/${var.project_id}/roles/tfCustomRole.${module.utils.env_prefix}"
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_project_iam_custom_role" "gcp_custom_roles" {
  role_id = "tfCustomRole.${module.utils.env_prefix}"
  title = "tfCustomRole.${module.utils.env_prefix}"
  description = "${var.reaper_tag}"
  permissions = ["secretmanager.versions.access"]
}


resource "google_secret_manager_secret" "secret-01" {
  secret_id = "secret-01-${module.utils.env_prefix}"
  labels = {
    delete = "true"
  }
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "secret-version-01" {
  secret      = google_secret_manager_secret.secret-01.id
  secret_data = "StrongPassword212+"
}

resource "google_secret_manager_secret" "secret-02" {
  secret_id = "secret-02-${module.utils.env_prefix}"
  labels = {
    delete = "true"
  }
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "secret-version-02" {
  secret      = google_secret_manager_secret.secret-02.id
  secret_data = "StrongPassword212*"
}

resource "google_compute_instance" "vm" {
  name         = "tf-func-test-vm-${module.utils.env_prefix}"
  machine_type = "${var.instance-type}"
  zone         = "${var.primary_zone}"
  can_ip_forward = true
  description = "${var.reaper_tag}"

  labels = {
    f5_bigip_runtime_init = "${module.utils.env_prefix}"
    another_tag = "with_a_value"
  }

  boot_disk {
    initialize_params {
      image = "${data.google_compute_image.f5-bigip-image.self_link}"
    }
  }

  network_interface {
    network = "${google_compute_network.ext_network.self_link}"
    subnetwork = "${google_compute_subnetwork.ext_subnetwork.self_link}"
    network_ip = "${var.vm-ext-private-ip}"

    access_config {
    }
  }

  network_interface {
    network = "${google_compute_network.mgmt_network.self_link}"
    subnetwork = "${google_compute_subnetwork.mgmt_subnetwork.self_link}"
    network_ip = "${var.vm-mgmt-private-ip}"

    access_config {
    }

  }

  network_interface {
    network = "${google_compute_network.int_network.self_link}"
    subnetwork = "${google_compute_subnetwork.int_subnetwork.self_link}"
    network_ip = "${var.vm-int-private-ip}"
  }

  metadata = {
    foo = "bar"
  }

  metadata_startup_script = "${data.template_file.vm_cloud_init_script.rendered}"

  service_account {
    email = google_service_account.sa.email
    scopes = ["cloud-platform"]
  }

}

resource "null_resource" "delay_five_minutes" {
  provisioner "local-exec" {
    command = "sleep 300"
  }
  depends_on = [google_compute_instance.vm]
}

output "deployment_info" {
  value = {
    instances: [
      {
        hostname = google_compute_instance.vm.name,
        admin_username = var.admin_username,
        admin_password = module.utils.admin_password,
        mgmt_address = google_compute_instance.vm.network_interface.1.access_config.0.nat_ip,
        mgmt_port = 443,
        zone: google_compute_instance.vm.zone
      }
    ],
    deploymentId: module.utils.env_prefix,
    environment: "gcp",
    region: "${var.region}",
    zone: "${var.primary_zone}",
    networkTopology: "sameNetwork"
  }
}
