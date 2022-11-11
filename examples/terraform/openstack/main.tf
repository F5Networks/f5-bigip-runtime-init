#
# Example of deploying a 3NIC BIG-IP in OpenStack
#
# MGMT NIC must be routable to the internet to download
# bigip-runtime-init and A&O ToolChain.
# 
# Assumes Metadata Service is on the first host on the mgmt subnet
# Assumes Gateways are on the first host on the subne
# Assumes Default Gateway is first host on External Subnet (2nd NIC)
#
# MTU is hard-coded to 1460 for VXLAN network
#
# Check Onboard Script Requires Terraform client to be able to reach BIG-IP Management IP 
#
# See more details in comments below
# 
module "utils" {
  source = "../utils"
}


# Networks

# If Existing Newtork
data "openstack_networking_network_v2" "network_mgmt" {
  count = var.network_mgmt == "" ? 0 : 1
  name  = var.network_mgmt
}

data "openstack_networking_subnet_v2" "subnet_mgmt" {
  count      = var.network_mgmt == "" ? 0 : 1
  name       = var.subnet_mgmt
  network_id = data.openstack_networking_network_v2.network_mgmt[count.index].id
}

# If Creating New Network
resource "openstack_networking_network_v2" "network_mgmt" {
  count          = var.network_mgmt == "" ? 1 : 0
  name           = "network-${module.utils.env_unique_id}-mgmt"
  admin_state_up = "true"
}

resource "openstack_networking_subnet_v2" "subnet_mgmt" {
  count      = var.network_mgmt == "" ? 1 : 0
  name       = "subnet-${module.utils.env_unique_id}-mgmt"
  network_id = openstack_networking_network_v2.network_mgmt[count.index].id
  cidr       = "10.0.0.0/24"
  ip_version = 4
}

# If Existing Newtork
data "openstack_networking_network_v2" "network_external" {
  count = var.network_external == "" ? 0 : 1
  name  = var.network_external
}

data "openstack_networking_subnet_v2" "subnet_external" {
  count      = var.network_external == "" ? 0 : 1
  name       = var.subnet_external
  network_id = data.openstack_networking_network_v2.network_external[count.index].id
}

# If Creating New Network
resource "openstack_networking_network_v2" "network_external" {
  count          = var.network_external == "" ? 1 : 0
  name           = "network-${module.utils.env_unique_id}-external"
  admin_state_up = "true"
}

resource "openstack_networking_subnet_v2" "subnet_external" {
  count      = var.network_external == "" ? 1 : 0
  name       = "subnet-${module.utils.env_unique_id}-external"
  network_id = openstack_networking_network_v2.network_external[count.index].id
  cidr       = "10.0.1.0/24"
  ip_version = 4
}

# If Existing Newtork
data "openstack_networking_network_v2" "network_internal" {
  count = var.network_internal == "" ? 0 : 1
  name  = var.network_internal
}

data "openstack_networking_subnet_v2" "subnet_internal" {
  count      = var.network_internal == "" ? 0 : 1
  name       = var.subnet_internal
  network_id = data.openstack_networking_network_v2.network_internal[count.index].id
}

# If Creating New Network
resource "openstack_networking_network_v2" "network_internal" {
  count          = var.network_internal == "" ? 1 : 0
  name           = "network-${module.utils.env_unique_id}-internal"
  admin_state_up = "true"
}

resource "openstack_networking_subnet_v2" "subnet_internal" {
  count      = var.network_internal == "" ? 1 : 0
  name       = "subnet-${module.utils.env_unique_id}-internal"
  network_id = openstack_networking_network_v2.network_internal[count.index].id
  cidr       = "10.0.2.0/24"
  ip_version = 4
}

# If Create New Network

# │ Error: Error creating openstack_networking_network_v2: Request forbidden: [POST https://10.144.69.33:9696/v2.0/networks], error message: {"NeutronError": {"type": "PolicyNotAuthorized", "message": "(rule:create_network and rule:create_network:router:external) is disallowed by policy", "detail": ""}}

# resource "openstack_networking_router_v2" "router_1" {
#   count = var.network_external == "" ? 1 : 0
#   name             = "router-${module.utils.env_unique_id}"
#   external_network_id = openstack_networking_network_v2.network_external[count.index].id
#   admin_state_up = "true"
# }

# resource "openstack_networking_router_interface_v2" "router_interface_2" {
#   count = var.network_mgmt == "" ? 1 : 0
#   router_id = openstack_networking_router_v2.router_1[count.index].id
#   subnet_id = openstack_networking_subnet_v2.subnet_mgmt[count.index].id
# }

# resource "openstack_networking_router_interface_v2" "router_interface_1" {
#   count = var.network_external == "" ? 1 : 0
#   router_id = openstack_networking_router_v2.router_1[count.index].id
#   subnet_id = openstack_networking_subnet_v2.subnet_external[count.index].id
# }


# Security Groups

# Unable to test applying Fixed IP/Security Group due to policy 
# │ Error: Error creating openstack_networking_port_v2: Request forbidden: [POST https://10.144.69.33:9696/v2.0/ports], error message: {"NeutronError": {"type": "PolicyNotAuthorized", "message": "((rule:create_port and (rule:create_port:fixed_ips and (rule:create_port:fixed_ips:ip_address and rule:create_port:fixed_ips:subnet_id))) and rule:create_port:port_security_enabled) is disallowed by policy", "detail": ""}}

resource "openstack_compute_secgroup_v2" "sg_mgmt" {
  name        = "sg-${module.utils.env_unique_id}-bigip-mgmt"
  description = "Mgmt interface rules"

  # Allows SSH access
  rule {
    from_port   = 22
    to_port     = 22
    ip_protocol = "tcp"
    cidr        = var.AllowedIPs
  }

  # Allows GUI access
  rule {
    from_port   = 443
    to_port     = 443
    ip_protocol = "tcp"
    cidr        = var.AllowedIPs
  }

  # Allows ICMP (Ping) access
  rule {
    from_port   = -1
    to_port     = -1
    ip_protocol = "icmp"
    cidr        = var.AllowedIPs
  }


}

resource "openstack_compute_secgroup_v2" "sg_external" {
  name        = "sg-${module.utils.env_unique_id}-bigip-external"
  description = "External interface rules"

  # Allows vip service http
  rule {
    from_port   = 80
    to_port     = 80
    ip_protocol = "tcp"
    cidr        = "0.0.0.0/0"
  }

  # Allows vip service https
  rule {
    from_port   = 443
    to_port     = 443
    ip_protocol = "tcp"
    cidr        = "0.0.0.0/0"
  }

  # Allows Config Sync  access
  rule {
    from_port   = 4353
    to_port     = 4353
    ip_protocol = "tcp"
    cidr        = var.AllowedInternalIPs
  }

  # Allows network failover
  rule {
    from_port   = 1026
    to_port     = 1026
    ip_protocol = "udp"
    cidr        = var.AllowedInternalIPs
  }

  # Allows ICMP (Ping) access
  rule {
    from_port   = -1
    to_port     = -1
    ip_protocol = "icmp"
    cidr        = "0.0.0.0/0"
  }


}

resource "openstack_compute_secgroup_v2" "sg_internal" {
  name        = "sg-${module.utils.env_unique_id}-bigip-internal"
  description = "Internal interface rules"

  # Allows Config Sync  access
  rule {
    from_port   = 4353
    to_port     = 4353
    ip_protocol = "tcp"
    cidr        = var.AllowedInternalIPs
  }

  # Allows network failover
  rule {
    from_port   = 1026
    to_port     = 1026
    ip_protocol = "udp"
    cidr        = var.AllowedInternalIPs
  }

  # Allows ICMP (Ping) access
  rule {
    from_port   = -1
    to_port     = -1
    ip_protocol = "icmp"
    cidr        = var.AllowedInternalIPs
  }


}

locals {
  # Create lists of subnets to iterate over for dynamic blocks of fixed ips
  subnet_mgmt_id      = var.network_external == "" ? openstack_networking_subnet_v2.subnet_external[0].id : data.openstack_networking_subnet_v2.subnet_external[0].id
  subnet_mgmt_ids     = [local.subnet_mgmt_id]
  subnet_external_id  = var.network_external == "" ? openstack_networking_subnet_v2.subnet_external[0].id : data.openstack_networking_subnet_v2.subnet_external[0].id
  subnet_external_ids = [local.subnet_external_id]
  subnet_internal_id  = var.network_internal == "" ? openstack_networking_subnet_v2.subnet_internal[0].id : data.openstack_networking_subnet_v2.subnet_internal[0].id
  subnet_internal_ids = [local.subnet_internal_id]
}


resource "openstack_networking_port_v2" "mgmt_port" {
  # this must not be a "direct" port, virtio is OK
  name           = "bigip1_mgmt"
  network_id     = var.network_mgmt == "" ? openstack_networking_network_v2.network_mgmt[0].id : data.openstack_networking_network_v2.network_mgmt[0].id
  admin_state_up = "true"

  port_security_enabled = var.port_security_enabled ? true : null
  security_group_ids =  var.port_security_enabled ? [ openstack_compute_secgroup_v2.sg_mgmt.id ] : null

  dynamic "fixed_ip" {
    for_each = [for subnet in local.subnet_mgmt_ids: subnet if var.dhcp_enabled == false ]
    content {
      subnet_id = var.network_mgmt == "" ? openstack_networking_subnet_v2.subnet_mgmt[0].id : data.openstack_networking_subnet_v2.subnet_mgmt[0].id
      ip_address  = var.subnet_mgmt == "" ? cidrhost(openstack_networking_subnet_v2.subnet_mgmt[0].cidr, var.cidr_host) :  cidrhost(tostring(data.openstack_networking_subnet_v2.subnet_mgmt[0].cidr), var.cidr_host)
    }
  }
}

resource "openstack_networking_port_v2" "external_port" {
  name           = "bigip1_external"
  network_id     = var.network_external == "" ? openstack_networking_network_v2.network_external[0].id : data.openstack_networking_network_v2.network_external[0].id
  admin_state_up = "true"

  port_security_enabled = var.port_security_enabled ? true : null
  security_group_ids = var.port_security_enabled ? [ openstack_compute_secgroup_v2.sg_external.id ]: null

  dynamic "fixed_ip" {
    for_each = [for subnet in local.subnet_external_ids : subnet if var.dhcp_enabled == false]
    content {
      subnet_id  = var.network_external == "" ? openstack_networking_subnet_v2.subnet_external[0].id : data.openstack_networking_subnet_v2.subnet_external[0].id
      ip_address = var.subnet_external == "" ? cidrhost(openstack_networking_subnet_v2.subnet_external[0].cidr, var.cidr_host) : cidrhost(tostring(data.openstack_networking_subnet_v2.subnet_external[0].cidr), var.cidr_host)
    }
  }

}

resource "openstack_networking_port_v2" "internal_port" {
  name           = "bigip1_internal"
  network_id     = var.network_internal == "" ? openstack_networking_network_v2.network_internal[0].id : data.openstack_networking_network_v2.network_internal[0].id
  admin_state_up = "true"

  port_security_enabled = var.port_security_enabled ? true : null
  security_group_ids = var.port_security_enabled ? [ openstack_compute_secgroup_v2.sg_internal.id ] : [ ]

  dynamic "fixed_ip" {
    for_each = [for subnet in local.subnet_internal_ids : subnet if var.dhcp_enabled == false]
    content {
      subnet_id  = var.network_internal == "" ? openstack_networking_subnet_v2.subnet_internal[0].id : data.openstack_networking_subnet_v2.subnet_internal[0].id
      ip_address = var.subnet_internal == "" ? cidrhost(openstack_networking_subnet_v2.subnet_internal[0].cidr, var.cidr_host) : cidrhost(tostring(data.openstack_networking_subnet_v2.subnet_internal[0].cidr), var.cidr_host)
    }
  }
}

data "template_file" "bigip_init" {
  template = file("startup-script.tpl")
  vars = {
    hostname       = var.bigip_hostname
    admin_username = var.admin_username
    # Note that initial autogenerated password should only be temporary as
    # the password will be cached by tfstate, in cloud-drive, and initially on the device
    # Not recommended for production.
    # Recommend changing password immediately 
    # For production, F5 also recommends customizing the user-data.tpl to using Hashicorp Vault to fetch the secret/password
    # See https://github.com/F5Networks/f5-bigip-runtime-init#runtime_parameters
    admin_password = module.utils.admin_password
    package_url    = var.bigip_runtime_init_package_url
    license_key    = var.bigip_license_key
    # Network Info:
    mgmt_ip                 = openstack_networking_port_v2.mgmt_port.all_fixed_ips[0]
    self_ip_external        = openstack_networking_port_v2.external_port.all_fixed_ips[0]
    self_ip_external_prefix = var.subnet_external == "" ? split("/", openstack_networking_subnet_v2.subnet_external[0].cidr)[1] : split("/", tostring(data.openstack_networking_subnet_v2.subnet_external[0].cidr))[1]
    self_ip_internal        = openstack_networking_port_v2.internal_port.all_fixed_ips[0]
    self_ip_internal_prefix = var.subnet_internal == "" ? split("/", openstack_networking_subnet_v2.subnet_internal[0].cidr)[1] : split("/", tostring(data.openstack_networking_subnet_v2.subnet_internal[0].cidr))[1]
    # Route Info: 
    #     Assumes Gateways are on the first host on the subnet
    #     Assumes Metadata Service is on the first host on the mgmt subnet
    mgmt_gateway    = var.subnet_mgmt == "" ? cidrhost(openstack_networking_subnet_v2.subnet_mgmt[0].cidr, 1) : cidrhost(tostring(data.openstack_networking_subnet_v2.subnet_mgmt[0].cidr), 1)
    metadata_route  = var.subnet_mgmt == "" ? cidrhost(openstack_networking_subnet_v2.subnet_mgmt[0].cidr, 1) : cidrhost(tostring(data.openstack_networking_subnet_v2.subnet_mgmt[0].cidr), 1)
    default_gateway = var.subnet_external == "" ? cidrhost(openstack_networking_subnet_v2.subnet_external[0].cidr, 1) : cidrhost(tostring(data.openstack_networking_subnet_v2.subnet_external[0].cidr), 1)
  }
}

resource "openstack_compute_instance_v2" "vm" {
  name            = "vm-${module.utils.env_unique_id}-bigip"
  image_name      = var.image_name
  flavor_name     = var.instance_type
  key_pair        = var.ssh_key_name
  security_groups = ["default"]

  user_data    = data.template_file.bigip_init.rendered
  config_drive = true

  network {
    port = openstack_networking_port_v2.mgmt_port.id
  }
  network {
    port = openstack_networking_port_v2.external_port.id
  }
  network {
    port = openstack_networking_port_v2.internal_port.id
  }

  tags = ["vm-${module.utils.env_unique_id}-bigip"]

  # Check Onboard Script Requires Terraform client to be able to reach BIG-IP Management IP 
  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = var.admin_username
      password    = module.utils.admin_password
      host        = self.network.0.fixed_ip_v4
      timeout     = var.wait_bigip_ready
      script_path = "/var/tmp/check_onboard_complete.sh"
    }
    script = "${path.module}/scripts/check_onboard_complete.sh"
  }
}
