# Examples

## OpenStack

Example of deploying in OpenStack.  This hard-codes many values (see main.tf for details).

- Prereqs
    - Terraform
    - OpenStack
- Deploy
    - cd `examples/openstack/terraform`
    - `terraform init`
    - `terraform apply`

Sample `terraform.tfvars`

```
hostname = "bigip1"
external_net = "external"
mgmt_net = "mgmt"
internal_net  = "internal"
license = "XXXX-XXXX-XXX-XXXX-XXXX"
password = "[Secure password]
gateway = "10.10.10.1"
```