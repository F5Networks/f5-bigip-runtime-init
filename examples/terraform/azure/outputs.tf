output "deployment_info" {
  value = {
    instances = [
      {
        admin_username = "admin"
        admin_password = module.utils.admin_password
        mgmt_address   = azurerm_public_ip.pip_mgmt.ip_address
        mgmt_port      = 443
      },
    ]
    DeploymentId = module.utils.env_unique_id,
    environment: "azure",
  }
}
