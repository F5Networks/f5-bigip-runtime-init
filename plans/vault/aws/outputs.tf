output "endpoints" {
  value = <<EOF

  NOTE: While Terraform's work is done, these instances need time to complete
        their own installation and configuration. Progress is reported within
        the log file `/var/log/tf-user-data.log` and reports 'Complete' when
        the instance is ready.

  vault_1 (${aws_instance.vault-transit.public_ip}) | internal: (${aws_instance.vault-transit.private_ip})
    - Initialized and unsealed.
    - The root token creates a transit key that enables the other Vaults to auto-unseal.
    - Does not join the High-Availability (HA) cluster.

  vault_2 (${aws_instance.vault-server[0].public_ip}) | internal: (${aws_instance.vault-server[0].private_ip})
    - Initialized and unsealed.
    - The root token and recovery key is stored in /tmp/key.json.
    - K/V-V2 secret engine enabled and secret stored.
    - Leader of HA cluster

    $ ssh -l ubuntu ${aws_instance.vault-server[0].public_ip} -i ${var.key_name}.pem

    # Root token:
    $ ssh -l ubuntu ${aws_instance.vault-server[0].public_ip} -i ${var.key_name}.pem "cat ~/root_token"
    # Recovery key:
    $ ssh -l ubuntu ${aws_instance.vault-server[0].public_ip} -i ${var.key_name}.pem "cat ~/recovery_key"

EOF
}

output "vault_server_public_ip" {
  description = "Public IP of the Vault server"
  value       = "${aws_instance.vault-server[0].public_ip}"
}

output "vault_server_public_http" {
  description = "Public HTTP of the Vault server"
  value       = "http://${aws_instance.vault-server[0].public_ip}:8200"
}

output "role_id" {
  description = "Command to retrieve the app role role-id"
  value       = "ssh -l ubuntu ${aws_instance.vault-server[0].public_ip} -i ${var.key_name}.pem 'cat /tmp/role-id | jq -r .data.role_id'"
}

output "secret_id" {
  description = "Command to retrieve the app role secret-id"
  value       = "ssh -l ubuntu ${aws_instance.vault-server[0].public_ip} -i ${var.key_name}.pem 'cat /tmp/secret-id | jq -r .data.secret_id'"
}