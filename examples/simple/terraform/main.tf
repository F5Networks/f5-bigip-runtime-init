module "utils" {
  source = "./utils"
}

provider "azurerm" {
  version = "=2.0.0"
  features {
  }
}

data "azurerm_subscription" "primary" {
}

resource "azurerm_resource_group" "deployment" {
  name     = module.utils.env_prefix
  location = var.location
  tags = {
    creator = "Terraform"
    delete  = "True"
  }
}

resource "azurerm_virtual_network" "deployment" {
  name                = "${module.utils.env_prefix}-network"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.deployment.location
  resource_group_name = azurerm_resource_group.deployment.name
}

resource "azurerm_subnet" "mgmt" {
  name                 = "mgmt"
  resource_group_name  = azurerm_resource_group.deployment.name
  virtual_network_name = azurerm_virtual_network.deployment.name
  address_prefix       = "10.0.0.0/24"
}

resource "azurerm_subnet" "external" {
  name                 = "external"
  resource_group_name  = azurerm_resource_group.deployment.name
  virtual_network_name = azurerm_virtual_network.deployment.name
  address_prefix       = "10.0.2.0/24"
}

resource "azurerm_subnet" "internal" {
  name                 = "internal"
  resource_group_name  = azurerm_resource_group.deployment.name
  virtual_network_name = azurerm_virtual_network.deployment.name
  address_prefix       = "10.0.1.0/24"
}

resource "azurerm_public_ip" "pip" {
  name                = "${module.utils.env_prefix}-mgmt-pip"
  location            = azurerm_resource_group.deployment.location
  resource_group_name = azurerm_resource_group.deployment.name
  allocation_method   = "Static"
}

resource "azurerm_network_security_group" "deployment" {
  name                = "${module.utils.env_prefix}-sg"
  location            = azurerm_resource_group.deployment.location
  resource_group_name = azurerm_resource_group.deployment.name
  security_rule {
    name                       = "allow_all"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_interface" "mgmt" {
  name                = "${module.utils.env_prefix}-mgmt"
  location            = azurerm_resource_group.deployment.location
  resource_group_name = azurerm_resource_group.deployment.name

  ip_configuration {
    name                          = "${module.utils.env_prefix}-mgmt"
    subnet_id                     = azurerm_subnet.mgmt.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.0.4"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }
}

resource "azurerm_network_interface" "external" {
  name                = "${module.utils.env_prefix}-ext"
  location            = azurerm_resource_group.deployment.location
  resource_group_name = azurerm_resource_group.deployment.name

  ip_configuration {
    name                          = "${module.utils.env_prefix}-ext"
    subnet_id                     = azurerm_subnet.external.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.2.4"
  }

  tags = {
    f5_cloud_failover_label   = "f5-bigip-runtime-init"
    f5_cloud_failover_nic_map = "external"
  }
}

resource "azurerm_network_interface_security_group_association" "mgmt" {
  network_interface_id      = azurerm_network_interface.mgmt.id
  network_security_group_id = azurerm_network_security_group.deployment.id
}

resource "azurerm_network_interface_security_group_association" "external" {
  network_interface_id      = azurerm_network_interface.external.id
  network_security_group_id = azurerm_network_security_group.deployment.id
}

resource "azurerm_network_interface" "internal" {
  name                = "${module.utils.env_prefix}-int"
  location            = azurerm_resource_group.deployment.location
  resource_group_name = azurerm_resource_group.deployment.name

  ip_configuration {
    name                          = "${module.utils.env_prefix}-int"
    subnet_id                     = azurerm_subnet.internal.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.1.4"
  }
}

resource "azurerm_virtual_machine" "vm" {
  name                             = "${module.utils.env_prefix}-vm0"
  location                         = azurerm_resource_group.deployment.location
  resource_group_name              = azurerm_resource_group.deployment.name
  network_interface_ids            = [azurerm_network_interface.mgmt.id, azurerm_network_interface.internal.id, azurerm_network_interface.external.id]
  primary_network_interface_id     = azurerm_network_interface.mgmt.id
  vm_size                          = var.instance_size
  delete_os_disk_on_termination    = true
  delete_data_disks_on_termination = true

  storage_image_reference {
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

  storage_os_disk {
    name              = "osdisk0"
    caching           = "ReadWrite"
    create_option     = "FromImage"
    managed_disk_type = "Standard_LRS"
  }

  os_profile {
    computer_name  = "f5vm"
    admin_username = var.admin_username
    admin_password = module.utils.admin_password

    custom_data = file("${path.module}/user_data.txt")
  }

  os_profile_linux_config {
    disable_password_authentication = false
  }
}

resource "azurerm_virtual_machine_extension" "run_startup_cmd" {
  name                 = "${module.utils.env_prefix}-run-startup-cmd"
  virtual_machine_id   = azurerm_virtual_machine.vm.id
  publisher            = "Microsoft.OSTCExtensions"
  type                 = "CustomScriptForLinux"
  type_handler_version = "1.2"
  settings             = <<SETTINGS
    {
      "commandToExecute": "bash /var/lib/waagent/CustomData; curl https://raw.githubusercontent.com/f5devcentral/f5-bigip-runtime-init/develop/scripts/install.sh | bash; f5-bigip-runtime-init -c /config/onboard_config.yaml"
    }
  
SETTINGS

}

output "deployment_info" {
  value = {
    instances = [
      {
        admin_username = var.admin_username
        admin_password = module.utils.admin_password
        mgmt_address   = azurerm_public_ip.pip.ip_address
        mgmt_port      = 443
      },
    ]
    deploymentId = module.utils.env_prefix
  }
}

