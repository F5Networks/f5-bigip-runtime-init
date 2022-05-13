resource "random_string" "env_unique_id" {
  length  = 8
  upper   = false
  special = false
}

resource "random_string" "admin_password" {
  length      = 16
  min_upper   = 1
  min_lower   = 1
  min_numeric = 1
  special     = false
}

output "env_unique_id" {
  value = random_string.env_unique_id.result
}

output "admin_password" {
  value = random_string.admin_password.result
}

