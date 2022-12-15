# Terraform Examples

## Description

This directory provides a simple Terraform example to demonstrate provisioning and onboarding a BIG-IP system using F5 BIG-IP Runtime-Init in AWS.

## Prerequisites
 * Terraform (v1.1.6)
 * Credentials for the Terraform Cloud Provider with sufficient permissions to create the resources in the example. See the Terraform Provider for details.
 *  An SSH Key pair in AWS for management access to BIG-IP VE. For more information about creating and/or importing the key pair in AWS, see AWS's SSH key [documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html).
 * Accepted the EULA for the F5 image in the AWS marketplace. If you have not deployed BIG-IP VE in your environment before, search for F5 in the Marketplace and then click **Accept Software Terms**. This only appears the first time you attempt to launch an F5 image. By default, this solution deploys the [F5 BIG-IP BEST with IPI and Threat Campaigns (PAYG, 25Mbps)](https://aws.amazon.com/marketplace/pp/prodview-nlakutvltzij4) images. For more information, see [K14810: Overview of BIG-IP VE license and throughput limits](https://support.f5.com/csp/article/K14810).

## Deployment Steps
 * Update terraform.tfvars with any required variables *(ex. AllowedIps, ssh_key_name )*
 * `terraform init`
 * `terraform apply`
