# F5 BIG-IP Runtime Init

[![Slack Status](https://f5cloudsolutions.herokuapp.com/badge.svg)](https://f5cloudsolutions.herokuapp.com)
[![Releases](https://img.shields.io/github/release/f5networks/f5-bigip-runtime-init.svg)](https://github.com/f5networks/f5-bigip-runtime-init/releases)
[![Issues](https://img.shields.io/github/issues/f5networks/f5-bigip-runtime-init.svg)](https://github.com/f5networks/f5-bigip-runtime-init/issues)


## Contents
- [F5 BIG-IP Runtime Init](#f5-big-ip-runtime-init)
  - [Contents](#contents)
  - [Introduction](#introduction)
  - [Overview](#overview)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Validated BIG-IP versions](#validated-big-ip-versions)
  - [Configuration](#configuration)
    - [Configuration Examples and Schema Documentation](#configuration-examples-and-schema-documentation)
  - [Installer](#installer)
  - [Downloads](#downloads)
  - [Usage Examples](#usage-examples)
    - [Azure (ARM Template) Virtual Machine extension snippet](#azure-arm-template-virtual-machine-extension-snippet)
      - [Download F5 BIG-IP Runtime Config from URL](#download-f5-big-ip-runtime-config-from-url)
      - [Use inline F5 BIG-IP Runtime Config](#use-inline-f5-big-ip-runtime-config)
    - [Terraform](#terraform)
      - [Azure (Terraform) snippet](#azure-terraform-snippet)
      - [AWS (Terraform) snippet](#aws-terraform-snippet)
      - [GCP (Terraform) snippet](#gcp-terraform-snippet)
  - [Runtime parameters](#runtime-parameters)
  - [Private Environments](#private-environments)
  - [Troubleshooting](#troubleshooting)
    - [F5 Automation Toolchain Components](#f5-automation-toolchain-components)
    - [Logging](#logging)
      - [Send output to log file and serial console](#send-output-to-log-file-and-serial-console)
  - [Documentation](#documentation)
  - [Getting Help](#getting-help)
    - [Filing Issues](#filing-issues)
  - [Copyright](#copyright)
  - [License](#license)
      - [Apache V2.0](#apache-v20)


## Introduction

The F5 BIG-IP Runtime Init is a tool that aims to simplify startup scripts for BIG-IP Virtual Edition. 

By providing a single convenient yaml or json-based configuration file which
* leverages [F5 Automation Tool Chain](https://www.f5.com/pdf/products/automation-toolchain-overview.pdf) declarations that are easier to author, validate and maintain as code (vs. bigip.conf files)
* renders secrets from public cloud vaults
* renders runtime variables from metadata services

resulting in a complete overlay deployment tool for configuring a BIG-IP instance, it allows us to extend our cloud solutions from native templates to other instance provisioning tools, such as Terraform and Ansible. For more information regarding sending startup scripts to BIG-IP VE, see VE [documentation](https://clouddocs.f5.com/cloud/public/v1/shared/cloudinit.html).


![F5 BIG-IP Runtime Init](diagrams/f5_bigip_runtime_init.gif)


## Overview

From a high level overview, using this tool involves three steps:

- Step 1: Download OR render inline a Runtime Init configuration file (runtime-init-conf.yaml).
  ```sh
  curl -o /config/cloud/runtime-init-conf.yaml https://my-source-host/my-repo/bigip-configs/0.0.1/runtime-init-conf.yaml 
  ```
  See [configuration](#configuration) details below.

- Step 2: Download and install F5 BIG-IP Runtime Init using the self-extracting installer: 
  ```sh
  curl -o /tmp/f5-bigip-runtime-init-1.1.0-1.gz.run https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run && bash /tmp/f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud azure'
  ```
  See [installer](#installer) details and [downloads](#downloads) below.

- Step 3: Load the configuration file: 
  ```sh
  f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
  ```

See usage [examples](#usage-examples) below.

## Features
This repository includes both the F5 BIG-IP Runtime Init source code and a self-extracting installer script for installing the main package.

The installer script will do the following:

- Determine the cloud environment where the script is running
- Extract and verify the appropriate cloud-specific package archive (or the all-inclusive package archive if cloud is not detected)
- Install the package archive and create a command alias for f5-bigip-runtime-init

Based on the content of the provided YAML or JSON conifguration file, F5 BIG-IP Runtime Init will do the following:

- Download, verify, and install F5 Automation Toolchain components (DO, AS3, TS, and CFE) from package metadata, URLs, or local files
- Download, verify, and install custom iApp LX packages from URLs or local files
- Accept Automation Toolchain declarations from URLs or local files
- Get secrets from cloud provider secret management APIs (Azure KeyVault, AWS Secret Manager, GCP Secrets Manager)
- Get select attributes from cloud provider instance and network metadata
- Render valid Automation Toolchain declarations based on rendered runtime variables (such as secrets and metadata attributes above) and provided declarations
- POST rendered declarations to Automation Toolchain endpoints and verify success or failure
- Run user-specified pre-onboard and post-onboard commands
- Send a webhook with a customizable telemetry data to a user-specified endpoint 


## Prerequisites
- BIG-IP 14.1.2.6 or later
- A mechanism to copy the configuration file to the BIG-IP instance (cloud-init, user data, provider-specific methods)
- Access to the Internet (or other network location if files are locally hosted) for downloading the self-extracting installer package, RPM files, and SHA256 checksums for package verification
- Access to the cloud provider metadata service, if rendering metadata runtime parameters
- An IAM identity associated to the BIG-IP instance(s) with sufficient roles/permissions for accessing cloud provider APIs


## Validated BIG-IP versions
F5 BIG-IP Runtime Init has been tested and validated with the following versions of BIG-IP:

| BIG-IP Version | Build Number |
| --- | --- |
| 15.1.0 | 0.0.4 |
| 14.1.2 | 0.0.6 |


## Configuration

The F5 BIG-IP Runtime Init configuration consists of the following attributes:

| Attribute | Default Value | Required |	Description | 
| --- | --- | --- | --- | 
| extension_packages	| none	| No | List of URLs to download and install iControl LX extension packages before onboarding. |
| extension_services | none	| No |	List of declarations to to configure. |
| runtime_parameters | none	| No	| List of runtime parameters to gather. |
| pre_onboard_enabled | none | No	| List of commands to run before sending iControl LX declarations. |
| post_onboard_enabled | none	| No	| List of commands to run after sending iControl LX declarations. |
| post_hook | none | No  | Webhook to send upon completion. |

### Configuration Examples and Schema Documentation
See [SCHEMA.md](https://github.com/F5Networks/f5-bigip-runtime-init/blob/main/SCHEMA.md) for complete schema documentation and configuration examples.

## Installer

The self extracting installer accepts the following parameters:

```
--cloud  | -c                   : Specifies cloud provider name. Allowed values: ( all, aws, azure, or gcp ). When not provided, intergrations with Public Clouds (AWS, Azure or/and GCP) are disabled
--key    | -k                   : Provides location for GPG key used for verifying signature on RPM file
--skip-verify                   : Disables RPM signature verification
--skip-toolchain-metadata-sync  : Disables downloading automation toolchain metadata from the Internet
```

ex:
```
 curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud aws'
```

See [Private Environments](#private-environments) section below.


## Downloads
Self-extracting installer, RPMs, and file hashes are available from the following locations:

| Cloud | Type | Location |
| --- | --- | --- |
| All | Self-extracting installer | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run |
| All | SHA256 | https://github.com/f5networks/f5-bigip-runtime-init/releases/download/1.1.0/f5-bigip-runtime-init-1.1.0-1.gz.run.sha256 |
| All | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-all-1.1.0-1-signed.noarch.rpm |
| All | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-all-1.1.0-1-signed.noarch.rpm.sha256 |
| AWS | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-aws-1.1.0-1-signed.noarch.rpm |
| AWS | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-aws-1.1.0-1-signed.noarch.rpm.sha256 |
| Azure | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-azure-1.1.0-1-signed.noarch.rpm |
| Azure | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-azure-1.1.0-1-signed.noarch.rpm.sha256 |
| GCP | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-gcp-1.1.0-1-signed.noarch.rpm |
| GCP | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-gcp-1.1.0-1-signed.noarch.rpm.sha256 |
| None | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-base-1.1.0-1-signed.noarch.rpm |
| None | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/rpms/f5-bigip-runtime-init-base-1.1.0-1-signed.noarch.rpm.sha256 |

## Usage Examples

### Azure (ARM Template) Virtual Machine extension snippet
#### Download F5 BIG-IP Runtime Config from URL
```json
"commandToExecute": "concat('mkdir -p /config/cloud; mkdir -p /var/log/cloud/azure; cp $(ls -v | tail -n1)/runtime-init-conf.yaml /config/cloud/runtime-init-conf.yaml; curl -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- ', variables('singleQuote'), '--cloud azure', variables('singleQuote'), ' 2>&1')",
"fileUris": [
  "https://example.com/runtime-init-conf.yaml"
]
```
#### Use inline F5 BIG-IP Runtime Config
```json
"commandToExecute": "[concat('mkdir -p /config/cloud; mkdir -p /var/log/cloud/azure; echo -e ', variables('singleQuote'), parameters('runtimeConfig'), variables('singleQuote'), ' > /config/cloud/runtime-init-conf.yaml; curl -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run; bash f5-bigip-runtime-init-1.1.0-1.gz.run -- ', variables('singleQuote'), '--cloud azure', variables('singleQuote'), ' 2>&1; f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml 2>&1')]"
```

### Terraform

Terraform plans will generally consist of the following, 

  - a startup_script template (.tpl)
  - passing the rendered startup script to the instance's startup script parameter 


#### Azure (Terraform) snippet

In this snippet, 

```
data "template_file" "startup_script" {
  template = "${file("${path.module}/startup-script.tpl")}"
  vars = {
    secret_id = "mySecret01"
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

  os_profile_linux_config {
    disable_password_authentication = false
  }

  os_profile {
    computer_name  = "f5vm"
    admin_username = var.admin_username
    admin_password = module.utils.admin_password
    custom_data =  "${data.template_file.startup_script.rendered}"
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
      "commandToExecute": "bash /var/lib/waagent/CustomData"
    }
SETTINGS
}
```

the startup script is templatized in startup-script.tpl and sent using the vm os_profile's ```custom_data``` parameter. On BIG-IP versions 15.1+ Cloud-Init will execute this script directly. However, for earlier versions, azurerm_virtual_machine_extension is used to run it. See BIG-IP's [Cloud-Init](!https://clouddocs.f5.com/cloud/public/v1/shared/cloudinit.html) documentation for more information.


The startup script contains the following contents.

```sh
#!/bin/bash

mkdir -p /config/cloud
cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: azure
      type: KeyVault
      vaultUrl: https://my-keyvault.vault.azure.net
      secretId: ${secret_id}
      field: password
pre_onboard_enabled:
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.17.0
    - extensionType: as3
      extensionVersion: 3.24.0
    - extensionType: ts
      extensionVersion: 1.16.0
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://raw.githubusercontent.com/F5Networks/f5-bigip-runtime-init/main/examples/declarations/do_w_admin.json
    - extensionType: as3
      type: url
      value: https://raw.githubusercontent.com/F5Networks/f5-bigip-runtime-init/main/examples/declarations/as3.json


EOF

curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud azure'

f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
```

NOTE: ```--cloud azure``` is passed to the installer to specify the environment 

The terraform variable that is templatized is ```${secret_id}``` which will be rendered by terraform before sending to the instance's ```custom_data``` parameter.  Ex. the rendered ```custom_data``` finally sent to BIG-IP will contain the actual key name 'mySecret01' to gather at runtime:

ex.

```yaml
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: azure
      type: KeyVault
      vaultUrl: https://my-keyvault.vault.azure.net
      secretId: mySecret01
      field: password
```

When BIG-IP is launched, Runtime Init will fetch the **value** for the secret named```mySecret01``` from the native vault and set the runtime variable ``ADMIN_PASS``. Any declarations containing ```{{{ ADMIN_PASS }}}``` (ex. do.json, as3.json templates formatted with mustache) will be populated with the secret **value** (ex. the admin password). ***field*** provides field name to which this secret is map to and it instructs Runtime Init to masks the secret value in any logging outputs. 


#### AWS (Terraform) snippet


In this AWS example snippet, 

```
data "template_file" "startup_script" {
  template = "${file("${path.module}/startup-script.tpl")}"
  vars = {
    secret_id = "${aws_secretsmanager_secret_version.AdminSecret.secret_id}"
  }
}


resource "aws_instance" "vm01" {
  ami = "${var.AWS_BIGIP_AMI_ID}"
  instance_type = "m5.xlarge"
  availability_zone = "${var.AWS_DEFAULT_REGION}a"
  network_interface {
    network_interface_id = "${aws_network_interface.mgmt1.id}"
    device_index = 0
  }
  network_interface {
    network_interface_id = "${aws_network_interface.external1.id}"
    device_index = 1
  }
  iam_instance_profile = "${aws_iam_instance_profile.instance_profile.name}"
  tags = merge(var.global_tags, {Name="runtime-init-vm0-${module.utils.env_prefix}"})
  user_data = "${data.template_file.startup_script.rendered}"
}
```

the startup script is templatized in startup-script.tpl and contains the following contents.

```sh
#!/bin/bash

mkdir -p /config/cloud
cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: aws
      type: SecretsManager
      version: AWSCURRENT
      secretId: ${secret_id}
pre_onboard_enabled:
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.17.0
    - extensionType: as3
      extensionVersion: 3.24.0
    - extensionType: ts
      extensionVersion: 1.16.0
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://raw.githubusercontent.com/F5Networks/f5-bigip-runtime-init/main/examples/declarations/do_w_admin.json
    - extensionType: as3
      type: url
      value: https://raw.githubusercontent.com/F5Networks/f5-bigip-runtime-init/main/examples/declarations/as3.json


EOF

curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud aws'

f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
```

NOTE: ```--cloud aws``` is passed to the installer to specify the environment 

The terraform variable that is templatized is ```${secret_id}``` which will be rendered by terraform before sending to the instance's ```user_data``` parameter.  Ex. the rendered ```user_data``` finally sent to BIG-IP will contain the actual name of secret 'mySecret01' to gather at runtime:

ex.

```yaml
---
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: aws
      type: SecretsManager
      version: AWSCURRENT
      secretId: mySecret01
```

When BIG-IP is launched, Runtime Init will fetch the **value** for the secret named ```mySecret01``` from the native vault and set the runtime variable ``ADMIN_PASS``. Any declarations containing ```{{{ ADMIN_PASS }}}``` (ex. do.json, as3.json templates formatted with mustache) will be populated with the secret **value** (ex. the password). 


#### GCP (Terraform) snippet

Similar to examples above, 

```
data "template_file" "startup_script" {
  template = "${file("${path.module}/startup-script.tpl")}"
  vars = {
    secret_id = "mySecret01"
  }
}

resource "google_compute_instance" "vm01" {
  name         = "tf-func-test-vm-${module.utils.env_prefix}"
  machine_type = "${var.instance-type}"
  zone         = "${var.primary_zone}"
  can_ip_forward = true
  description = "${var.reaper_tag}"

  labels = {
    f5_bigip_runtime_init = "${module.utils.env_prefix}"
    another_tag = "with_a_value"
  }

  boot_disk {
    initialize_params {
      image = "${data.google_compute_image.f5-bigip-image.self_link}"
    }
  }

  network_interface {
    network = "${google_compute_network.ext_network.self_link}"
    subnetwork = "${google_compute_subnetwork.ext_subnetwork.self_link}"
    network_ip = "${var.vm-ext-private-ip}"

    access_config {
    }
  }

  network_interface {
    network = "${google_compute_network.mgmt_network.self_link}"
    subnetwork = "${google_compute_subnetwork.mgmt_subnetwork.self_link}"
    network_ip = "${var.vm-mgmt-private-ip}"

    access_config {
    }

  }

  network_interface {
    network = "${google_compute_network.int_network.self_link}"
    subnetwork = "${google_compute_subnetwork.int_subnetwork.self_link}"
    network_ip = "${var.vm-int-private-ip}"
  }

  metadata = {
    foo = "bar"
  }

  metadata_startup_script = "${data.template_file.startup_script.rendered}"

  service_account {
    email = google_service_account.sa.email
    scopes = ["cloud-platform"]
  }

}
```

the startup script startup-script.tpl is passed to via the instance's ```metadata_startup_script``` parameter


```sh
#!/bin/bash

mkdir -p /config/cloud
cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: gcp
      type: SecretsManager
      version: latest
      secretId: ${secret_id}
pre_onboard_enabled:
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.17.0
    - extensionType: as3
      extensionVersion: 3.24.0
    - extensionType: ts
      extensionVersion: 1.16.0
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://raw.githubusercontent.com/F5Networks/f5-bigip-runtime-init/main/examples/declarations/do_w_admin.json
    - extensionType: as3
      type: url
      value: https://raw.githubusercontent.com/F5Networks/f5-bigip-runtime-init/main/examples/declarations/as3.json


EOF

curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud gcp'

f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
```

NOTE: ```--cloud gcp``` is passed to the installer to specify the environment 

## Runtime parameters

runtime_parameters allows to defined list of parameters and these parameters can be used for substituting tokens defined within declarations. There are a few types of parameters:
  
  * secret - fetches secret from Secret Vault 
      ```yaml
        runtime_parameters:
          - name: ADMIN_PASS
            type: secret
            secretProvider:
              environment: azure
              type: KeyVault
              vaultUrl: https://my-keyvault.vault.azure.net
              secretId: mySecret01
      ```
  * metadata - fetches common pre-defined metadata from the Metadata Service
    ```yaml
        runtime_parameters:
          - name: MGMT_ROUTE
            type: metadata
            metadataProvider:
              environment: aws
              type: network
              field: subnet-ipv4-cidr-block
              index: 0
    ```
  * static - defines a static value. Example below will replace AVAILABILITY_ZONE token with "us-west-2a" string
      ```yaml
        runtime_parameters:
          - name: AVAILABILITY_ZONE
            type: static
            value: us-west-2a
      ```
  * url - defines url to fetch a runtime parameter (ex. custom metadata). This parameter allows to provide HTTP headers as well as JMESPath query for querying JSON document/response. The headers and query fields are optional.
    ```yaml
        runtime_parameters:
          - name: REGION
            type: url
            value: http://169.254.169.254/latest/dynamic/instance-identity/document
            query: region
            headers:
              - name: Content-Type
                value: json
              - name: User-Agent
                value: some-user-agent
    ```
## Private Environments

By default, this tool makes calls to the Internet to download a GPG key [here](https://f5-cft.s3.amazonaws.com/f5-bigip-runtime-init/gpg.key) to verify RPM signatures, find the latest Automation Tool Chain packages and send usage data.  To disable calls to the Internet, you can use the examples below:

#### Disable Calls from the Installer

Example (secure) of hosting the gpg key locally and disabling checking for latest Automation Tool Chain packages.
```
 curl https://myprivatehost/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud aws --key https://mylocalhost/gpg.key --skip-toolchain-metadata-sync'
```

Example (thisisinsecure) of skipping downloading the GPG key and checking for latest Automation Tool Chain packages, using a local copy of the metadata instead. 
```
curl https://myprivatehost/f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run -o f5-bigip-runtime-init-1.1.0-1.gz.run && bash f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud aws --skip-verify --skip-toolchain-metadata-sync'
```

#### Disable Calls from the Command

To disable the f5-bigip-runtime-init command from sending usage reporting, you can include the '--skip-telemetry' parameter.
```
f5-bigip-runtime-init -c /config/cloud/runtime-init-conf.yaml --skip-telemetry
```

Or, if using the `extension_services` feature to send declarations, by disabling phone home with the [autoPhonehome property](https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html#system) in your Declarative Onboarding (DO) declaration.

For more information on how to disable Automatic Phone Home, see this [Overview of the Automatic Update Check and Automatic Phone Home features](https://support.f5.com/csp/article/K15000#1).


## Troubleshooting
### F5 Automation Toolchain Components
F5 BIG-IP Runtime Init uses the F5 Automation Toolchain for configuration of BIG-IP instances.  Any errors thrown from these components will be surfaced in the bigIpRuntimeInit.log (or a custom log location as specified below).  

Help with troubleshooting individual Automation Toolchain components can be found at F5's [Public Cloud Docs](http://clouddocs.f5.com/cloud/public/v1/):
- DO: https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/troubleshooting.html
- AS3: https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/userguide/troubleshooting.html
- TS: https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/userguide/troubleshooting.html
- CFE: https://clouddocs.f5.com/products/extensions/f5-cloud-failover/latest/userguide/troubleshooting.html

### Logging
The default log location is /var/log/cloud/bigIpRuntimeInit.log. This location can be customized (see below). 

The following enviroment variables can be used for setting logging options: 
- F5_BIGIP_RUNTIME_INIT_LOG_LEVEL (string) - Defines log level
```json
    { 
      error: 0, 
      warn: 1, 
      info: 2, 
      debug: 5, 
      silly: 6 
    }
```
- F5_BIGIP_RUNTIME_INIT_LOG_FILENAME (string) - Defines path to log file (i.e. /var/log/cloud/bigIpRuntimeInit.log)
- F5_BIGIP_RUNTIME_INIT_LOG_TO_JSON (boolean) - Defines if logs should be output in JSON format:
```json
    {"message":"this is a json message","level":"info","timestamp":"2020-08-04T00:22:28.069Z"}
```

Example of how to set the log level using an environment variable: ```export F5_BIGIP_RUNTIME_INIT_LOG_LEVEL=silly && bash /var/tmp/f5-bigip-runtime-init-1.1.0-1.gz.run -- '--cloud ${CLOUD}'```


By default, runtime will mask out (i.e. "********") the following common fields when logging:
```json
    [
        "password",
        "localPassword",
        "remotePassword",
        "bigIqPassword",
        "bigIpPassword",
        "passphrase",
        "cookiePassphrase",
        "certificate",
        "privateKey",
        "ciphertext",
        "protected",
        "secret",
        "sharedSecret",
        "secretAccessKey",
        "apiAccessKey",
        "encodedCredentials",
        "encodedToken",
        "oldPassword",
        "newPassword",
        "bindPassword",
        "checkBindPassword",
        "md5SignaturePassphrase"
    ]
```
However, it is possible to extend this list by providing additional metadata (***field***) for the Secret object:

```yaml
        runtime_parameters:
          - name: MY_SECRET
            type: secret
            secretProvider:
              environment: azure
              type: KeyVault
              vaultUrl: https://my-keyvault.vault.azure.net
              secretId: mySecret01
              field: newCustomSecretField
``` 
This example shows how to instruct Runtime Init to mask out the value for ```newCustomSecretField```.

#### Send output to log file and serial console

Add the following to the beginning of user data to log startup events to a local file/serial console. See the simple [example](https://github.com/F5Networks/f5-bigip-runtime-init/blob/main/examples/simple/terraform/startup-script.tpl) for more information.

```
mkdir -p  /var/log/cloud
LOG_FILE=/var/log/cloud/startup-script.log
npipe=/tmp/$$.tmp
trap "rm -f $npipe" EXIT
mknod $npipe p
tee <$npipe -a $LOG_FILE /dev/ttyS0 &
exec 1>&-
exec 1>$npipe
exec 2>&1
```

## Documentation
For more information on F5 cloud solutions, including manual configuration procedures for some deployment scenarios, see F5's [Public Cloud Docs](http://clouddocs.f5.com/cloud/public/v1/).


## Getting Help
The example declarations in this document are intended to provide reference onboarding configurations for F5 BIG-IP Virtual Editions. Read more about [Support Policies](https://www.f5.com/company/policies/support-policies). 

### Filing Issues
If you find an issue, we would love to hear about it.

- Use the **Issues** link on the GitHub menu bar in this repository for items such as enhancement or feature requests and non-urgent bug fixes. Tell us as much as you can about what you found and how you found it.


## Copyright
Copyright 2014-2020 F5 Networks Inc.


## License

#### Apache V2.0

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations
under the License.
