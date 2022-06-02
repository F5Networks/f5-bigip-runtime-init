# Terraform Examples

## Description

This directory provides a simple Terraform example to demonstrate provisioning and onboarding a BIG-IP system using BIG-IP Runtime-Init in Google Cloud.

## Prerequisites
 * Terraform (v1.1.6)
 * Credentials for the Terraform Cloud Provider with sufficient permissions to create the resources in the example. See the Terraform Provider for details.
* An [SSH key](https://cloud.google.com/compute/docs/instances/adding-removing-ssh-keys) for access to the BIG-IP instances.
- Accept any Google Cloud Marketplace "License/Terms and Conditions" for the images used in this solution.
  - By default, this solution uses [F5 BIG-IP BEST with IPI and Threat Campaigns (PAYG, 25Mbps)](https://console.cloud.google.com/marketplace/product/f5-7626-networks-public/f5-big-best-plus-payg-25mbps)


## Deployment Steps
 * Update terraform.tfvars with any required variables *(ex. AllowedIps, project_id )*
 * `terraform init`
 * `terraform apply`
