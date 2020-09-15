# Note: project_id is set via environment variable
# export TF_VAR_project_id='my_project_id'

variable "region" {
  description = "The GCP Region in which the resources in this example should exist"
  default     = "us-west1"
}

variable "primary_zone" {
  description = "The primary GCP Zone in which resources should exist"
  default     = "us-west1-a"
}

variable "secondary_zone" {
  description = "The secondary GCP Zone where resources should exist"
  default     = "us-west1-b"
}

variable "instance-type" {
  description = "Google Cloud instance type"
  default = "n1-standard-8"
}

variable "publisher" {
  default = "f5-networks"
}

variable "project_id" {
  description = "GCP project where resources will be created (Note: This should be configured using environment variable GOOGLE_PROJECT_ID)"
}

variable "imageProjectId" {
  default = "f5-7626-networks-public"
  description = "GCP project where resources will be created"
}

variable "int-subnet-cidr-range" {
  default = "10.0.2.0/24"
}

variable "ext-subnet-cidr-range" {
  default = "10.0.3.0/24"
}

variable "mgmt-subnet-cidr-range" {
  default = "10.0.1.0/24"
}

variable "int-subnet-getway" {
  default = "10.0.2.1"
}

variable "ext-subnet-getway" {
  default = "10.0.3.1"
}

variable "mgmt-subnet-getway" {
  default = "10.0.1.1"
}


variable "vm-mgmt-private-ip" {
  default = "10.0.1.2"
}

variable "vm-int-private-ip" {
  default = "10.0.2.2"
}

variable "vm-ext-private-ip" {
  default = "10.0.3.2"
}

variable "vm_instance01_name" {
  default = "tf-func-test-runtime-init"
}

variable "bigip_version" {
  description = "The BIG-IP version for the virtual machine"
  default     = "f5-bigip-15-1-0-4-0-0-6-payg-best-25mbps-200618231635"
}

variable "instance_size" {
  description = "The instance size for the virtual machine"
  default     = "Standard_DS3_v2"
}

variable "admin_username" {
  description = "The admin username for the virtual machine"
  default     = "gcpuser"
}


variable "reaper_tag" {
  description = "this value is used by resource reaper to locate resource which needs to be deleted"
  default = "delete=true"
}
