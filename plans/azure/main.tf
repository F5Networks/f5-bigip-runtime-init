module "utils" {
  source = "../../modules/utils"
}

provider "azurerm" {
  version = "=2.5.0"
  features {
  }
  environment = var.AZURE_ENVIROMENT
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


data "template_file" "init_declaration" {
  template = "${file("${path.module}/user_data.tpl")}"
  vars = {
    deployment_id = "${module.utils.env_prefix}"
    domain = "${var.DOMAIN}"
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
  sku                 = "Standard"
}

data "http" "my_public_ip" {
  url = "https://ifconfig.co/json"
  request_headers = {
    Accept = "application/json"
  }
}

locals {
  ifconfig_co_json = jsondecode(data.http.my_public_ip.body)
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
    source_address_prefixes    = ["${local.ifconfig_co_json.ip}/32", "10.0.0.0/16"]
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

resource "azurerm_user_assigned_identity" "user_identity" {
  name                = "${module.utils.env_prefix}-ident"
  resource_group_name = azurerm_resource_group.deployment.name
  location            = azurerm_resource_group.deployment.location
}

resource "azurerm_key_vault" "keyvault" {
  name                        = "testvault-${module.utils.env_prefix}"
  location                    = azurerm_resource_group.deployment.location
  resource_group_name         = azurerm_resource_group.deployment.name
  enabled_for_disk_encryption = true
  tenant_id                   = "${var.AZURE_TENANT_ID}"
  soft_delete_enabled         = true
  purge_protection_enabled    = false

  sku_name = "standard"

  access_policy {
    tenant_id  = "${var.AZURE_TENANT_ID}"
    object_id  = azurerm_user_assigned_identity.user_identity.principal_id


    key_permissions = [
      "get"
    ]

    secret_permissions = ["get","list","set","delete","recover","backup","restore","purge"]

    storage_permissions = [
      "get"
    ]
  }

  access_policy {
    tenant_id  = "${var.AZURE_TENANT_ID}"
    object_id = "${var.AZURE_OBJECT_ID}"


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

  tags = {
    environment = "f5-bigip-runtime-init-func-test"
  }
}

resource "azurerm_key_vault_secret" "adminsecret" {
  name = "test-azure-admin-secret"
  value = "StrongAdminPass212+"
  key_vault_id = azurerm_key_vault.keyvault.id
}

resource "azurerm_key_vault_secret" "rootsecret" {
  name = "test-azure-root-secret"
  value = "StrongRootPass212+"
  key_vault_id = azurerm_key_vault.keyvault.id
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
    offer     = "${var.AZURE_OFFER}"
    sku       = "${var.AZURE_SKU}"
    version   = "${var.AZURE_BIGIP_VERSION}"
  }

  plan {
    publisher = var.publisher
    product   = "${var.AZURE_OFFER}"
    name      = "${var.AZURE_SKU}"
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

    custom_data = "${data.template_file.init_declaration.rendered}"
  }

  os_profile_linux_config {
    disable_password_authentication = false
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.user_identity.id]
  }

  tags = {
    testKey   = "testValue"
  }

}

resource "azurerm_virtual_machine_extension" "run_startup_cmd" {
  name                 = "${module.utils.env_prefix}-run-startup-cmd"
  virtual_machine_id   = azurerm_virtual_machine.vm.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.0"
  settings             = <<SETTINGS
    {
      "fileUris": [
        "https://github.com/f5devcentral/f5-ilx-example/releases/download/v1.0.0/hello-world-0.1.0-0001.noarch.rpm"
      ],
      "commandToExecute": "mkdir -p /config/cloud /var/config/rest/downloads; cp /config/onboard_config.yaml /config/cloud/onboard_config.yaml; cp hello-world-0.1.0-0001.noarch.rpm /var/config/rest/downloads/hello-world-0.1.0-0001.noarch.rpm"
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
    deploymentId = module.utils.env_prefix,
    environment    = "azure",
    domain = var.DOMAIN
  }
}

