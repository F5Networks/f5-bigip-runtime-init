output "deployment_info" {
  value = {
    instances: [
      {
        admin_username = "admin"
        admin_password = module.utils.admin_password,
        mgmt_address = aws_eip.eip_mgmt.public_ip,
        mgmt_port = 443
      },
    ],
    deploymentId: module.utils.env_unique_id,
    environment: "aws"
  }
}
