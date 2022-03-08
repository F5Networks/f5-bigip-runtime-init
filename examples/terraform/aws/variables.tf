variable "AllowedIPs" {
  description = "REQUIRED: List of source address prefixes allowed to go to Mgmt Interface. ex. [\"5.5.5.5/32\"]"
  type        = list
}

variable "ssh_key_name" {
  description = "REQUIRED: The ssh key name used for accessing the virtual machine"
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
  description = "The AWS Region in which the resources in this example should exist"
  default     = "us-west-2"
}

variable "f5_ami_search_name" {
  description = "BIG-IP AMI name to search for"
  type        = string
  default     = "F5 BIGIP-16* PAYG-Best 25Mbps*"
}

variable "bigip_runtime_init_package_url" {
  description = "The delivery url for BIGIP Runtime Init package"
  default =  "https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.4.1/dist/f5-bigip-runtime-init-1.4.1-1.gz.run"
}

variable "instance_type" {
  description = "The instance type for the virtual machine"
  default     = "m5.xlarge"
}

variable "wait_bigip_ready" {
  type        = string
  default     = "300s"
  description = "The number of seconds/minutes of delay to build into creation of BIG-IP VMs; default is 250. BIG-IP requires a few minutes to complete the onboarding process and this value can be used to delay the processing of dependent Terraform resources."
}

