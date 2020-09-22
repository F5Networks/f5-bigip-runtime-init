variable "location" {
  description = "The Azure Region in which the resources in this example should exist"
  default     = "westus"
}

variable "publisher" {
  default = "f5-networks"
}

variable "AZURE_OFFER" {
  default = ""
}

variable "AZURE_SKU" {
  default = ""
}

variable "AZURE_BIGIP_VERSION" {
  description = "The BIG-IP version for the virtual machine"
  default     = ""
}

variable "instance_size" {
  description = "The instance size for the virtual machine"
  default     = "Standard_DS3_v2"
}

variable "admin_username" {
  description = "The admin username for the virtual machine"
  default     = "azureuser"
}

variable "AZURE_TENANT_ID" {
  default = ""
}

variable "AZURE_OBJECT_ID" {
  default = ""
}

variable "AZURE_ENVIROMENT" {
  default = "public"
}


variable "DOMAIN" {
  default = "azure"
}
