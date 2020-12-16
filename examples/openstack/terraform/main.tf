#
# Example of deploying a 3NIC BIG-IP in OpenStack
#
# Network ranges are hard-coded to /24
# MTU is hard-coded for VXLAN network
# security group set to default
#
# MGMT must be routable to the internet to download
# bigip-runtime-init and A&O ToolChain.
#
# Default GW is expected to be 1.1 interface (2nd NIC)
#
data "openstack_networking_network_v2" "external_net" {
  name = var.external_net
}

data "openstack_networking_network_v2" "internal_net" {
  name = var.internal_net
}

data "openstack_networking_network_v2" "mgmt_net" {
  name = var.mgmt_net
}

data "template_file" "bigip_init" {
  template = file("user-data.tpl")
  vars = {
    HOST_NAME        = var.hostname
    LICENSE          = var.license
    # note that the password will be cached by tfstate
    # in cloud-drive, and initially on the device
    # not recommended for production
    PASSWORD	     = var.password
    SELF_IP_EXTERNAL = openstack_networking_port_v2.external_port.all_fixed_ips[0]
    SELF_IP_INTERNAL = openstack_networking_port_v2.internal_port.all_fixed_ips[0]
    GATEWAY	     = var.gateway
  }
}

resource "openstack_compute_instance_v2" "bigip1" {
  name      = var.hostname
  image_id  = var.image_id
  flavor_id = var.flavor_id

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

}

resource "openstack_networking_port_v2" "mgmt_port" {
  name           = "bigip1_mgmt"
  network_id     = data.openstack_networking_network_v2.mgmt_net.id
  admin_state_up = "true"
  # this must not be a "direct" port, virtio is OK
}

resource "openstack_networking_port_v2" "external_port" {
  name           = "bigip1_external"
  network_id     = data.openstack_networking_network_v2.external_net.id
  admin_state_up = "true"
}

resource "openstack_networking_port_v2" "internal_port" {
  name           = "bigip1_internal"
  network_id     = data.openstack_networking_network_v2.internal_net.id
  admin_state_up = "true"
}

