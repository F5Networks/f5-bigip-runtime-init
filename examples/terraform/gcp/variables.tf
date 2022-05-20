variable "project_id" {
  description = "REQUIRED: GCP project where resources will be created (Note: This can be configured using environment variable GOOGLE_PROJECT_ID)"
  type        = string
}

variable "AllowedIPs" {
  description = "REQUIRED: List of source address prefixes allowed to go to Mgmt Interface. ex. [\"5.5.5.5/32\"]"
}

variable "global_tags" {
  description = "Tags to add to all resources"
  type = map
  default = {
    owner   = "f5owner"
    creator = "terraform"
  }
}

variable "region" {
  description = "The GCP Region in which the resources in this example should exist"
  type        = string
  default     = "us-west1"
}

variable "primary_zone" {
  description = "The primary GCP Zone in which resources should exist"
  type        = string
  default     = "us-west1-a"
}

variable "bigip_version" {
  description = "The BIG-IP version for the virtual machine"
  type        = string
  default     = "f5-bigip-16-1-2-2-0-0-28-payg-best-25mbps-220505074742"
}

variable "imageProjectId" {
  description = "GCP project where images are located"
  type        = string
  default     = "f5-7626-networks-public"
}

variable "bigip_runtime_init_package_url" {
  description = "The delivery url for BIGIP Runtime Init package"
  type        = string
  default     = "https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.4.3/dist/f5-bigip-runtime-init-1.4.3-1.gz.run"
}

variable "instance-type" {
  description = "Google Cloud instance type"
  type        = string
  default     = "n1-standard-8"
}

variable "wait_bigip_ready" {
  description = "The number of seconds/minutes of delay to build into creation of BIG-IP VMs; default is 250. BIG-IP requires a few minutes to complete the onboarding process and this value can be used to delay the processing of dependent Terraform resources."
  type        = string
  default     = "300s"
}

