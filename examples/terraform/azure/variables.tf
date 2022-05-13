variable "AllowedIPs" {
  description = "REQUIRED: List of source address prefixes allowed to go to Mgmt Interface. ex. [\"5.5.5.5/32\"]"
  type        = list
}

variable "f5_ssh_publickey" {
  description = "REQUIRED: Path to the public key to be used for ssh access to the virtual machine. If specifying a path to a certification on a Windows machine to provision a linux vm use the / in the path versus backslash. e.g. c:/home/id_rsa.pub"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "admin_username" {
  description = "The admin username for the virtual machine"
  type        = string
  default     = "azureuser"
}

variable "global_tags" {
  description = "Tags to add to all resources"
  type = map
  default = {
    owner   = "f5owner"
    creator = "terraform"
  }
}

variable "azure_environment" {
  type    = string
  default = "public"
}

variable "location" {
  description = "The Azure Region in which the resources in this example should exist"
  type        = string
  default     = "westus"
}

variable "publisher" {
  description = "The BIG-IP publisher for the virtual machine"
  type        = string
  default = "f5-networks"
}

variable "offer" {
  description = "The BIG-IP offer for the virtual machine"
  type        = string
  default = "f5-big-ip-best"
}

variable "sku" {
  description = "The BIG-IP sku for the virtual machine"
  type        = string
  default = "f5-bigip-virtual-edition-25m-best-hourly"
}

variable "bigip_version" {
  description = "The BIG-IP version for the virtual machine"
  type        = string
  default     = "latest"
}

variable "bigip_runtime_init_package_url" {
  description = "The delivery url for BIGIP Runtime Init package"
  type        = string
  default =  "https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.4.1/dist/f5-bigip-runtime-init-1.4.1-1.gz.run"
}

variable "instance_size" {
  description = "The instance size for the virtual machine"
  type        = string
  default     = "Standard_DS3_v2"
}

variable "boot_diagnostics" {
  description = "(Optional) Enable Boot Dignostics"
  type        = bool
  default     = true
}

variable "boot_diagnostics_sa_type" {
  description = "(Optional) Storage account type for boot diagnostics."
  type        = string
  default     = "Standard_LRS"
}

variable "wait_bigip_ready" {
  description = "The number of seconds/minutes of delay to build into creation of BIG-IP VMs; default is 250. BIG-IP requires a few minutes to complete the onboarding process and this value can be used to delay the processing of dependent Terraform resources."
  type        = string
  default     = "300s"
}
