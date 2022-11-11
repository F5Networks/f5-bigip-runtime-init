# Terraform Examples

## Description

This directory provides a simple Terraform example to demonstrate provisioning and onboarding a BIG-IP system using BIG-IP Runtime-Init on Openstack.

## Prerequisites
 * Terraform (v1.1.6)
 * Credentials for the Terraform Cloud Provider with sufficient permissions to create the resources in the example. See the Terraform Provider for details.
 *  An SSH Key pair in Openstack for management access to BIG-IP VE. For more information about creating and/or importing the key pair in Openstack, see Openstack's SSH key [documentation](https://docs.openstack.org/horizon/latest/user/configure-access-and-security-for-instances.html).
 * A BYOL License [Registration Key](https://www.f5.com/trials/big-ip-virtual-edition).
 * Uploaded a BIG-IP Virtual Edition qcow image from [downloads.f5.com](https://downloads.f5.com) into Glance.
 * For more information, visit [https://www.f5.com/partners/technology-alliances/openstack](https://www.f5.com/partners/technology-alliances/openstack).

## Deployment Steps
 * Update terraform.tfvars with any required variables *(ex. AllowedIps, AllowedInternalIPs, ssh_key_name, bigip_license_key)*
 * `terraform init`
 * `terraform apply`