# Terraform Examples

## Description

This directory provides simple Terraform examples to demonstrate provisioning and onboarding a BIG-IP system using BIG-IP Runtime-Init in the following public clouds:
 * AWS
 * Azure
 * Google Cloud Platform

## Prerequisites
 * Terraform (v1.1.6)
 * Credentials for the Terraform Cloud Provider with sufficient permissions to create the resources in the example. See the Terraform Provider for details.
 * SSH Keys (See individual Provider README for details)

## Deployment Steps

 * `cd `examples/[CLOUD_PROVIDER]/`
 * Update terraform.tfvars *(ex. the AllowedIps variable with your trusted network )*
 * `terraform init`
 * `terraform apply`
