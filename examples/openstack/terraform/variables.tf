variable "hostname" {
  description = "hostname"
  default     = "bigip1"
}
variable "license" {
  description = "BIG-IP license"
}
variable "mgmt_net" {
  description = "Name of mgmt network"
}
variable "external_net" {
  description = "Name of external network"
}
variable "internal_net" {
  description = "Name of internal network"
}
variable "password" {
  description = "password to use for admin"
}
variable "gateway" {
  description = "network gateway for external net"
}
variable "image_id" {
  description = "Glance image_id"
}