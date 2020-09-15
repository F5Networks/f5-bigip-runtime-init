

variable "AWS_DEFAULT_REGION" {
  description = "The AWS Region in which the resources in this example should exist"
  default     = ""
}

variable "AWS_BIGIP_AMI_ID" {
  description = "The API ID used to specify which BIGIP image to use"
  default     = ""
}

variable "instance_size" {
  description = "The instance size for the virtual machine"
  default     = "Standard_DS3_v2"
}

variable "admin_username" {
  description = "The admin username for the virtual machine"
  default     = "awsuser"
}
