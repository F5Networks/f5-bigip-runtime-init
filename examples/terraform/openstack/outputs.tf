output "deployment_info" {
  value = {
    instances : [
      {
        admin_username = "admin"
        admin_password = module.utils.admin_password,
        mgmt_address   = openstack_networking_port_v2.mgmt_port.all_fixed_ips[0],
        mgmt_port      = 443
      },
    ],
    deploymentId : module.utils.env_unique_id,
    environment : "openstack"
  }
}
