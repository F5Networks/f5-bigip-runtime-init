# Change this to a Trusted Network
AllowedIPs            = "X.X.X.X/X"
AllowedInternalIPs    = "10.0.0.0/8"

# Change this to your SSH Key Name
ssh_key_name          = "YourSSHKeyNameHere"

# Provide a BYOL License Registration Key
bigip_license_key     = "XXXXX-XXXXX-XXXXX-XXXXX-XXXXXXX"

# Provide a custom hostname
bigip_hostname        = "bigip1.example.net"


# OPTIONAL for Existing Network:
# network_mgmt          = "YourMgmtNetwork"
# subnet_mgmt           = "YourMgmtSubnet"
# network_external      = "YourExternalNetwork"
# subnet_external       = "YourExternalSubnet"
# network_internal      = "YourInternalNetwork"
# subnet_internal       = "YourInternalSubnet"
# port_security_enabled = true
# dhcp_enabled          = false
# cidr_host             = 11