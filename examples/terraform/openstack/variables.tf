variable "AllowedIPs" {
  description = "REQUIRED: Source address prefix allowed to the Mgmt Interface. ex. [\"5.5.5.5/32\"]"
  type        = string
}

variable "AllowedInternalIPs" {
  description = "REQUIRED: Source address prefix allowed for internal communication between BIG-IPs. ex. [\"10.0.0.0/8\"]"
  type        = string
}

variable "ssh_key_name" {
  description = "REQUIRED: The ssh key name used for accessing the virtual machine"
}

variable "bigip_license_key" {
  type        = string
  description = "REQUIRED: BIG-IP license registration key"
}

variable "admin_username" {
  type        = string
  description = "Admin Username"
  default     = "admin"
}

variable "bigip_hostname" {
  type        = string
  description = "hostname"
  default     = "bigip1.example.net"
}

variable "image_name" {
  type        = string
  description = "Image Name"
  default     = "BIGIP-16.0.1.2-0.0.8"
}

variable "bigip_runtime_init_package_url" {
  type        = string
  description = "The delivery url for BIGIP Runtime Init package"
  default     = "https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.6.0/dist/f5-bigip-runtime-init-1.6.0-1.gz.run"
}

variable "instance_type" {
  type        = string
  description = "The flavor or instance type for the virtual machine"
  default     = "m1.xlarge"
}

variable "wait_bigip_ready" {
  type        = string
  description = "The number of seconds/minutes of delay to build into creation of BIG-IP VMs"
  default     = "20m"
}


# OPTIONAL: Existing Network Params

variable "network_mgmt" {
  type        = string
  description = "Name of an existing mgmt network. If provided, must also provide a mgmt subnet. If not provided, a mgmt network and subnet will be created."
  default     = ""
}

variable "subnet_mgmt" {
  type        = string
  description = "Name of an existing mgmt subnet. If provided, must also provide a mgmt network. If not provided, one will be created."
  default     = ""
}

variable "network_external" {
  type        = string
  description = "Name of an existing external network. If provided, must also provide an external subnet. If not provided, an external network and subnet will be created."
  default     = ""
}

variable "subnet_external" {
  type        = string
  description = "Name of an existing external subnet. If provided, must also provide an external network. If not provided, one will be created."
  default     = ""
}

variable "network_internal" {
  type        = string
  description = "Name of an existing internal network. If provided, must also provide an internal subnet. If not provided, an internal network and subnet will be created."
  default     = ""
}

variable "subnet_internal" {
  type        = string
  description = "Name of an existing internal subnet. If provided, must also provide an internal network. If not provided, one will be created."
  default     = ""
}


# Some environments may not allow fixed ips or security groups per policy
# ex. Error: Error creating openstack_networking_port_v2: Request forbidden: [POST https://10.144.69.33:9696/v2.0/ports], 
# error message: {"NeutronError": {"type": "PolicyNotAuthorized", "message": "(rule:create_port and (rule:create_port:fixed_ips
# and (rule:create_port:fixed_ips:ip_address and rule:create_port:fixed_ips:subnet_id))) is disallowed by policy", "detail": ""}}

# if port security and security groups are NOT allowed, set to port_security_enabled to false

variable "port_security_enabled" {
  type        = bool
  description = "Enable Port Security"
  default     = true
}

# If fixed IPs are allowed, set to dhcp_enabled to false and provide a cidr host # to use in cidr_host variable below

variable "dhcp_enabled" {
  type        = bool
  description = "Use DHCP for BIG-IP's addresses"
  default     = true
}

variable "cidr_host" {
  type        = number
  description = "cidr host number to use for BIG-IP fixed ip addresses. Ex. 11 will create Self IPs on the 11th host on each subnet. Mgmt = 10.0.0.11, External Self = 10.0.1.11. Internal Self = 10.0.2.11."
  default     = 11
}