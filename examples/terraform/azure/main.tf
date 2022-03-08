module "utils" {
  source = "../utils"
}

provider "azurerm" {
  features {
  }
  environment = var.azure_environment
}

data "azurerm_subscription" "current" {
}
data "azurerm_client_config" "current" {
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-${module.utils.env_unique_id}"
  location = var.location
  tags = merge(var.global_tags, { Name="rg-${module.utils.env_unique_id}" })
}

resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-${module.utils.env_unique_id}"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  tags = merge(var.global_tags, { Name="vnet-${module.utils.env_unique_id}" })

}

resource "azurerm_subnet" "subnet_mgmt" {
  name                 = "subnet-mgmt"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.0.0/24"]
}

resource "azurerm_subnet" "subnet_external" {
  name                 = "subnet-external"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "subnet_internal" {
  name                 = "subnet-internal"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]
}

## WARNING For Eval only, should not use PIP on MGMT in Production Env. Use Bastion Host/Service, VPN, etc.
resource "azurerm_public_ip" "pip_mgmt" {
  name                = "pip-${module.utils.env_unique_id}-bigip-mgmt"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"

  tags = merge(var.global_tags, { Name="pip-${module.utils.env_unique_id}-bigip-mgmt" })

}

resource "azurerm_public_ip" "pip_external" {
  name                = "pip-${module.utils.env_unique_id}-bigip-ext-self"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"

  tags = merge(var.global_tags, { Name="pip-${module.utils.env_unique_id}-bigip-ext-self" })

}

resource "azurerm_network_interface" "nic_mgmt" {
  name                = "nic-${module.utils.env_unique_id}-bigip-mgmt"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "ipconfig-${module.utils.env_unique_id}-bigip-mgmt"
    subnet_id                     = azurerm_subnet.subnet_mgmt.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.0.11"
    public_ip_address_id          = azurerm_public_ip.pip_mgmt.id
  }

  tags = merge(var.global_tags, { Name="nic-${module.utils.env_unique_id}-bigip-mgmt" })

}

resource "azurerm_network_interface" "nic_external" {
  name                = "nic-${module.utils.env_unique_id}-bigip-external"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  enable_accelerated_networking = true

  ip_configuration {
    name                          = "ipconfig-${module.utils.env_unique_id}-bigip-external-selfip"
    subnet_id                     = azurerm_subnet.subnet_external.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.11"
    public_ip_address_id          = azurerm_public_ip.pip_external.id
  }

  tags = merge(var.global_tags, { Name="nic-${module.utils.env_unique_id}-bigip-external" })

}

resource "azurerm_network_interface" "nic_internal" {
  name                = "nic-${module.utils.env_unique_id}-bigip-internal"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  enable_accelerated_networking = true

  ip_configuration {
    name                          = "ipconfig-${module.utils.env_unique_id}-bigip-internal-selfip"
    subnet_id                     = azurerm_subnet.subnet_internal.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.2.11"
  }

  tags = merge(var.global_tags, { Name="nic-${module.utils.env_unique_id}-bigip-internal" })

}

resource "azurerm_network_security_group" "nsg_mgmt" {
  name                = "nsg-${module.utils.env_unique_id}-bigip-mgmt"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow_mgmt_ssh"
    priority                   = 101
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefixes    = var.AllowedIPs
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_mgmt_gui"
    priority                   = 102
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefixes    = var.AllowedIPs
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_mgmt_outbound"
    priority                   = 103
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = merge(var.global_tags, { Name="nsg-${module.utils.env_unique_id}-bigip-mgmt" })

}

resource "azurerm_network_security_group" "nsg_external" {
  name                = "nsg-${module.utils.env_unique_id}-bigip-external"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow_service_http"
    priority                   = 101
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_service_https"
    priority                   = 102
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_external_outbound"
    priority                   = 103
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = merge(var.global_tags, { Name="nsg-${module.utils.env_unique_id}-bigip-external" })

}


resource "azurerm_network_security_group" "nsg_internal" {
  name                = "nsg-${module.utils.env_unique_id}-bigip-internal"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow_config_sync"
    priority                   = 101
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "4353"
    source_address_prefixes    = ["10.0.0.0/16"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_network_failover"
    priority                   = 102
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Udp"
    source_port_range          = "*"
    destination_port_range     = "1026"
    source_address_prefixes    = ["10.0.0.0/16"]
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow_internal_outbound"
    priority                   = 103
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = merge(var.global_tags, { Name="nsg-${module.utils.env_unique_id}-bigip-internal" })

}

resource "azurerm_network_interface_security_group_association" "nic_sg_assoc_mgmt" {
  network_interface_id      = azurerm_network_interface.nic_mgmt.id
  network_security_group_id = azurerm_network_security_group.nsg_mgmt.id
}

resource "azurerm_network_interface_security_group_association" "nic_sg_assoc_external" {
  network_interface_id      = azurerm_network_interface.nic_external.id
  network_security_group_id = azurerm_network_security_group.nsg_external.id
}

resource "azurerm_network_interface_security_group_association" "nic_sg_assoc_internal" {
  network_interface_id      = azurerm_network_interface.nic_internal.id
  network_security_group_id = azurerm_network_security_group.nsg_internal.id
}

resource "azurerm_user_assigned_identity" "user_identity" {
  name                = "user-identity-${module.utils.env_unique_id}-bigip"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

resource "azurerm_key_vault" "key_vault" {
  name                        = "key-vault-${module.utils.env_unique_id}-bigip"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name = "standard"
  enabled_for_disk_encryption = true
  purge_protection_enabled    = false
  soft_delete_retention_days  = 7

  # Allows BIG-IP to Access the secret
  access_policy {
    tenant_id  = data.azurerm_client_config.current.tenant_id
    object_id  = azurerm_user_assigned_identity.user_identity.principal_id

    key_permissions = [
      "get"
    ]

    secret_permissions = ["get","list"]

    storage_permissions = [
      "get"
    ]
  }

  # Allows Terraform to create the the secret
  access_policy {
    tenant_id  = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "get"
    ]

    secret_permissions = ["get","list","set","delete","recover","backup","restore","purge"]

    storage_permissions = [
      "get"
    ]
  }

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }

  tags = merge(var.global_tags, { Name="key-vault-${module.utils.env_unique_id}-bigip" })

}

resource "azurerm_key_vault_secret" "adminsecret" {
  name = "bigIpPass"
  value = module.utils.admin_password
  key_vault_id = azurerm_key_vault.key_vault.id

  tags = merge(var.global_tags, { Name="key-vault-secret-${module.utils.env_unique_id}-bigip-secret" })

}

resource "azurerm_storage_account" "vm_sa" {
  count                    = var.boot_diagnostics ? 1 : 0
  name                     = "bootdiag${lower(module.utils.env_unique_id)}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = element(split("_", var.boot_diagnostics_sa_type), 0)
  account_replication_type = element(split("_", var.boot_diagnostics_sa_type), 1)

  tags = merge(var.global_tags, { Name="storage-acct-${module.utils.env_unique_id}-${count.index}-bigip-bootdiag" })

}


resource "azurerm_linux_virtual_machine" "vm" {
  name                  = "vm-${module.utils.env_unique_id}-bigip"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  size                  = var.instance_size
  admin_username        = var.admin_username

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.f5_ssh_publickey)
  }

 os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = var.publisher
    offer     = var.offer
    sku       = var.sku
    version   = var.bigip_version
  }

  plan {
    publisher = var.publisher
    product   = var.offer
    name      = var.sku
  }

  boot_diagnostics {
    storage_account_uri  = var.boot_diagnostics ? join(",", azurerm_storage_account.vm_sa.*.primary_blob_endpoint) : ""
  }

  network_interface_ids = [
      azurerm_network_interface.nic_mgmt.id, 
      azurerm_network_interface.nic_external.id, 
      azurerm_network_interface.nic_internal.id
  ]

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.user_identity.id]
  }

  custom_data = base64encode(templatefile("${path.module}/startup-script.tpl", {
    bigip_vault_name:   "key-vault-${module.utils.env_unique_id}-bigip",
    package_url:        var.bigip_runtime_init_package_url,
    admin_username:     var.admin_username,
  }))

  tags = merge(var.global_tags, { Name="vm-${module.utils.env_unique_id}-bigip" })

}

# NOTE: Startup Script is run once / initialization only (Cloud-Init behavior vs. typical re-entrant for Azure Custom Script Extension )
# For 15.1+ and above, Cloud-Init will run the script directly and can remove Azure Custom Script Extension below

resource "azurerm_virtual_machine_extension" "run_startup_cmd" {
  name                 = "run-startup-cmd-${module.utils.env_unique_id}"
  virtual_machine_id   = azurerm_linux_virtual_machine.vm.id
  publisher            = "Microsoft.OSTCExtensions"
  type                 = "CustomScriptForLinux"
  type_handler_version = "1.2"
  settings             = <<SETTINGS
    {
      "commandToExecute": "bash /var/lib/waagent/CustomData"
    }
  SETTINGS

  tags = merge(var.global_tags, { Name="az-vm-ext-${module.utils.env_unique_id}-bigip" })

}

resource "time_sleep" "wait_bigip_ready" {
  depends_on      = [azurerm_linux_virtual_machine.vm]
  create_duration = var.wait_bigip_ready
}