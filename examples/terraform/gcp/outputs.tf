output "deployment_info" {
  value = {
    instances: [
      {
        admin_username = "admin"
        admin_password = module.utils.admin_password,
        mgmt_address = google_compute_instance.vm.network_interface.1.access_config.0.nat_ip,
        mgmt_port = 443,
      }
    ],
    deploymentId: module.utils.env_unique_id,
    environment: "gcp",
  }
}
