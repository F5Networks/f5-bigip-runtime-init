# Terraform Examples

## Description

This directory provides a simple Terraform example to demonstrate provisioning and onboarding a BIG-IP system using F5 BIG-IP Runtime-Init in Azure.

## Prerequisites
 * Terraform (v1.1.6)
 * Credentials for the Terraform Cloud Provider with sufficient permissions to create the resources in the example. See the Terraform Provider for details.
 * An SSH public key for access to the BIG-IP instances.
 * Accepting any Azure Marketplace "License/Terms and Conditions" for the images used in this solution.
    - By default, this solution uses [F5 BIG-IP Virtual Edition - BEST (PAYG 25Mbps)](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/f5-networks.f5-big-ip-best?tab=PlansAndPrice)
    - Azure CLI: 
        ```bash
        az vm image terms accept --publisher f5-networks --offer f5-big-ip-best --plan f5-big-best-plus-hourly-25mbps
        ```
    - For more marketplace terms information, see Azure [documentation](https://docs.microsoft.com/en-us/azure/virtual-machines/linux/cli-ps-findimage#deploy-an-image-with-marketplace-terms).

## Deployment Steps
 * Update terraform.tfvars with any required variables *(ex. AllowedIps, f5_ssh_publickey )*
 * `terraform init`
 * `terraform apply`
