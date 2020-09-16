# F5 BIG-IP Runtime Init
## NOTE: This project is in preview and under active development.

[![Slack Status](https://f5cloudsolutions.herokuapp.com/badge.svg)](https://f5cloudsolutions.herokuapp.com)
[![Releases](https://img.shields.io/github/release/f5devcentral/f5-bigip-runtime-init.svg)](https://github.com/f5devcentral/f5-bigip-runtime-init/releases)
[![Issues](https://img.shields.io/github/issues/f5devcentral/f5-bigip-runtime-init.svg)](https://github.com/f5devcentral/f5-bigip-runtime-init/issues)


## Contents
- [F5 BIG-IP Runtime Init](#f5-big-ip-runtime-init)
  - [NOTE: This project is in preview and under active development.](#note-this-project-is-in-preview-and-under-active-development)
  - [Contents](#contents)
  - [Introduction](#introduction)
  - [Overview](#overview)
  - [Features](#features)
  - [Prerequisites](#prerequisites)
  - [Validated BIG-IP versions](#validated-big-ip-versions)
  - [Configuration](#configuration)
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
  - [Configuration Examples](#configuration-examples)
  - [Troubleshooting](#troubleshooting)
    - [F5 Automation Toolchain Components](#f5-automation-toolchain-components)
    - [Logging](#logging)
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

- Step 1: Download OR render inline a runtime-init configuration file (runtime-init-conf.yaml).
  ```sh
  curl -o /config/cloud/runtime-init-conf.yaml https://my-source-host/my-repo/bigip-configs/0.0.1/runtime-init-conf.yaml 
  ```
  See [configuration](#configuration) details below.

- Step 2: Download and install F5 BIG-IP Runtime Init using the self-extracting installer: 
  ```sh
  curl -o /tmp/f5-bigip-runtime-init-1.0.0-1.gz.run https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run && bash /tmp/f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud azure'
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

| Attribute | Default Value | Rquired |	Description | 
| --- | --- | --- | --- | 
| extension_packages	| none	| No | List of URLs to download and install iControl LX extension packages before on-boarding. |
| extension_services | none	| No |	List of delclarations to to configure. |
| runtime_parameters | none	| No	| List of rutime parameters to gather. |
| pre_onboard_enabled | none | No	| List of commands to run before sending Lx declarations. |
| post_onboard_enabled | none	| No	| List of commands to run after sending Lx declarations. |
| post_hook | none | No  | Web Hook to send upon completion. |

See [examples](#configuration-examples) below.

## Installer

The self extracting installer accepts the following parameters:

```
--cloud  | -c  : Specifies cloud provider name; required parameter
--key    | -k  : Provides location for GPG key used for verifying signature on RPM file
--skip-verify  : Disables RPM signature verification
```

ex. Private Enviroments: By default, the installer tries to download the GPG key used to verify the package from F5 over the Internet. Below is example if hosting the key locally.
```
 curl https://mylocahost/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run && bash f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud aws --key https://mylocalhost/gpg.key'
```

ex. thisisinsecure
```
curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run && bash f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud aws --skip-verify'
```

## Downloads
Self-extracting installer, RPMs, and file hashes are available from the following locations:

| Cloud | Type | Location |
| --- | --- | --- |
| All | Self-extracting installer | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run |
| All | SHA256 | https://github.com/f5devcentral/f5-bigip-runtime-init/releases/download/1.0.0/f5-bigip-runtime-init-1.0.0-1.gz.run.sha256 |
| All | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-all-1.0.0-1-signed.noarch.rpm |
| All | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-all-1.0.0-1-signed.noarch.rpm.sha256 |
| AWS | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-aws-1.0.0-1-signed.noarch.rpm |
| AWS | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-aws-1.0.0-1-signed.noarch.rpm.sha256 |
| Azure | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-azure-1.0.0-1-signed.noarch.rpm |
| Azure | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-azure-1.0.0-1-signed.noarch.rpm.sha256 |
| GCP | RPM | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-gcp-1.0.0-1-signed.noarch.rpm |
| GCP | SHA256 | https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/rpms/f5-bigip-runtime-init-gcp-1.0.0-1-signed.noarch.rpm.sha256 |


## Usage Examples

### Azure (ARM Template) Virtual Machine extension snippet
#### Download F5 BIG-IP Runtime Config from URL
```json
"commandToExecute": "concat('mkdir -p /config/cloud; mkdir -p /var/log/cloud/azure; cp $(ls -v | tail -n1)/runtime-init-conf.yaml /config/cloud/runtime-init-conf.yaml; curl -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run && bash f5-bigip-runtime-init-1.0.0-1.gz.run -- ', variables('singleQuote'), '--cloud azure', variables('singleQuote'), ' 2>&1')",
"fileUris": [
  "https://example.com/runtime-init-conf.yaml"
]
```
#### Use inline F5 BIG-IP Runtime Config
```json
"commandToExecute": "[concat('mkdir -p /config/cloud; mkdir -p /var/log/cloud/azure; echo -e ', variables('singleQuote'), parameters('runtimeConfig'), variables('singleQuote'), ' > /config/cloud/runtime-init-conf.yaml; curl -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run; bash f5-bigip-runtime-init-1.0.0-1.gz.run -- ', variables('singleQuote'), '--cloud azure', variables('singleQuote'), ' 2>&1; f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml 2>&1')]"
```

### Terraform

Terraform plans will generally consist of the following, 

  - a startup_script template (.tpl)
  - passing the rendered startup script to the instance's startup script parameter 


#### Azure (Terraform) snippet
In this example, the F5 BIG-IP Runtime Init config is downloaded from a URL:
```
resource "azurerm_virtual_machine_extension" "run_startup_cmd" {
  name                 = "${module.utils.env_prefix}-run-startup-cmd"
  virtual_machine_id   = azurerm_virtual_machine.vm.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.0"
  settings             = <<SETTINGS
    {   
      "fileUris": [
        "https://example.com/runtime-init-conf.yaml"
      ],
      "commandToExecute": "mkdir -p /config/cloud; mkdir -p /var/log/cloud/azure; cp $(ls -v | tail -n1)/runtime-init-conf.yaml /config/cloud/runtime-init-conf.yaml; curl -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run && bash f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud azure' 2>&1; f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml 2>&1"
    }
  
SETTINGS

}
```

#### AWS (Terraform) snippet


In this AWS example snippet, 

```
data "template_file" "startup_script" {
  template = "${file("${path.module}/user_data.tpl")}"
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

the startup script is templatized in user_data.tpl and contains the following contents.

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
  - name: HOST_NAME
    type: metadata
    metadataProvider:
      environment: aws
      type: compute
      field: hostname
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.14.0
    - extensionType: as3
      extensionVersion: 3.20.0
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/declarations/do.json
    - extensionType: as3
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/declarations/as3.json

EOF

curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run && bash f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud aws'

f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
```

NOTE: ```--cloud aws``` is passed to the installer to specify the environment 

The terraform variable that is templatized is ```${secret_id}``` which will be rendered by terraform before sending to the instance's ```user_data``` parameter.  Ex. the rendered user_data finally sent to BIG-IP will contain the actual name of secret 'mySecret01' to gather at runtime:

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

When BIG-IP is launched, Runtime Init will fetch the **value** for the secret named```mySecret01``` from the native vault and set the runtime variable ``ADMIN_PASS``. Any declarations containing `````` (ex. do.json, as3.json templates formatted with mustache) will be populated with the secret **value** (ex. the password). 


#### GCP (Terraform) snippet

Similar to AWS example above, 

```
data "template_file" "startup_script" {
  template = "${file("${path.module}/user_data.tpl")}"
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

the startup script user_data.tpl is passed to via the instance's ```metadata_startup_script``` parameter


```sh
#!/bin/bash

mkdir -p /config/cloud
cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
        type: SecretsManager
        environment: gcp
        version: latest
        secretId: mySecret01
  - name: HOST_NAME
    type: metadata
    metadataProvider:
        environment: gcp
        type: compute
        field: name
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.14.0
    - extensionType: as3
      extensionVersion: 3.20.0
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/declarations/do.json
    - extensionType: as3
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/declarations/as3.json

EOF

curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o f5-bigip-runtime-init-1.0.0-1.gz.run && bash f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud gcp'

f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
```

NOTE: ```--cloud gcp``` is passed to the installer to specify the environment 


## Configuration Examples
- Configuration examples and schema: ./examples/config
- Declaration examples: ./examples/declarations

Example 1: Verifies and installs Automation Toolchain components (DO, AS3) on a local BIG-IP and then configures AS3 from a local declaration file.

```yaml
runtime_parameters: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
      extensionHash: 95c2b76fb598bbc36fb93a2808f2e90e6c50f7723d27504f3eb2c2850de1f9e1
    - extensionType: as3
      extensionVersion: 3.19.1
      extensionHash: 4477f84d0be2fa8fb551109a237768c365c4d17b44b2665e4eb096f2cfd3c4f1
extension_services:
  service_operations:
    - extensionType: as3
      type: url
      value: file:///examples/declarations/as3.json
```

Example 2: Verifies and installs DO and myIlxApp RPMs from local directories and configures DO from a local declaration file. **Note**: Install operations with an extensionUrl value that points to a local file may only be installed from the ***/var/lib/cloud*** or ***/var/lib/cloud/icontrollx_installs*** directories.

```yaml
runtime_parameters: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionUrl: file:///var/lib/cloud/icontrollx_installs/f5-declarative-onboarding-1.10.0-2.noarch.rpm
      extensionHash: 95c2b76fb598bbc36fb93a2808f2e90e6c50f7723d27504f3eb2c2850de1f9e1
    - extensionType: ilx
      extensionUrl: file:///var/lib/cloud/myIlxApp.rpm
      extensionVersion: 1.1.0
      extensionVerificationEndpoint: /mgmt/shared/myIlxApp/info
      extensionHash: 4477f84d0be2fa8fb551109a237768c365c4d17b44b2665e4eb096f2cfd3c4f1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: file:///var/lib/cloud/do.json
```

Example 3: Installs DO and AS3 on a local BIG-IP and renders the Azure service principal secret into an AS3 declaration downloaded from a URL.

AS3 declaration:
```json
{
    "class": "AS3",
    "action": "deploy",
    "persist": true,
    "declaration": {
      "class": "ADC",
      "schemaVersion": "3.0.0",
      "label": "Sample 1",
      "remark": "HTTP with custom persistence",
      "Sample_http_01": {
        "class": "Tenant",
        "A1": {
          "class": "Application",
          "template": "http",
          "serviceMain": {
            "class": "Service_HTTP",
            "virtualAddresses": [
              "10.1.0.4"
            ],
            "pool": "webPool",
            "policyWAF": {
                "use": "My_ASM_Policy"
            }
          },
          "webPool": {
            "class": "Pool",
            "monitors": [
                "http"
            ],
            "members": [
                {
                    "servicePort": 80,
                    "addressDiscovery": "azure",
                    "updateInterval": 10,
                    "tagKey": "foo",
                    "tagValue": "bar",
                    "addressRealm": "private",
                    "resourceGroup": "myResourceGroup",
                    "subscriptionId": "7fb1006f943a",
                    "directoryId": "f98586303b68",
                    "applicationId": "c9c4d0f9aa7",
                    "apiAccessKey": "",
                    "credentialUpdate": true
                }
            ]
          },
          "My_ASM_Policy": {
            "class": "WAF_Policy",
            "url": "https://cdn.f5.com/product/cloudsolutions/solution-scripts/asm-policy-linux/asm-policy-linux-medium.xml",
            "ignoreChanges": true
          }
        }
      }
    }
  }
```

F5 BIGIP Runtime Init declaration which provides secret metadata via runtime_parameters for Azure Servce Principal (**Note**: Be sure to replace vaultUrl and secretId with your values):
```yaml
runtime_parameters:
  - name: AZURE_SERVICE_PRINCIPAL
    type: secret
    secretProvider: 
      type: KeyVault
      environment: azure
      vaultUrl: https://my-keyvault.vault.azure.net
      secretId: my_azure_secret
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_do.json
    - extensionType: as3
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_as3.json
```

Example 4: Renders secret referenced within DO declaration to configure the admin password on a BIG-IP device in AWS.

In AWS Secret Manager, secrets will be stored in plain text mapped via secretId:
```json
  "test-document-01": "StrongPassword212+"
  "test-document-02": "StrongPassword212*"
```
F5 DO declaration with token: 
```json
{
    "schemaVersion": "1.0.0",
    "class": "Device",
    "async": true,
    "label": "my BIG-IP declaration for declarative onboarding",
    "Common": {
        "class": "Tenant",
        "hostname": "bigip1.example.com",
        "myDns": {
            "class": "DNS",
            "nameServers": [
                "8.8.8.8"
            ]
        },
        "myNtp": {
            "class": "NTP",
            "servers": [
                "0.pool.ntp.org"
            ],
            "timezone": "UTC"
        },
        "admin": {
            "class": "User",
            "userType": "regular",
            "password": "",
            "shell": "bash"
        },
        "root": {
            "class": "User",
            "userType": "root",
            "oldPassword": "default",
            "newPassword": ""
        }
    }
}
```

F5 BIG-IP Runtime Init declaration providing secret value via runtime_parameters for AWS:
```yaml
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      type: SecretManager
      environment: aws
      version: AWSCURRENT
      secretId: test-document-01
  - name: ROOT_PASS
    type: secret
    secretProvider:
      type: SecretManager
      environment: aws
      version: AWSCURRENT
      secretId: test-document-02
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: file:///examples/declarations/do.json
```

Example 5: Renders secret referenced within DO declaration to configure the admin password on a BIG-IP device in GCP.

In Google Secret Manager, secrets will be stored and mapped via secretId:
```json
{
  "my-secret-id-01": "StrongPassword212+",
  "my-secret-id-02": "StrongPassword212*"
}
```
F5 DO declaration with token: 
```json
{
    "schemaVersion": "1.0.0",
    "class": "Device",
    "async": true,
    "label": "my BIG-IP declaration for declarative onboarding",
    "Common": {
        "class": "Tenant",
        "hostname": "bigip1.example.com",
        "myDns": {
            "class": "DNS",
            "nameServers": [
                "8.8.8.8"
            ]
        },
        "myNtp": {
            "class": "NTP",
            "servers": [
                "0.pool.ntp.org"
            ],
            "timezone": "UTC"
        },
        "admin": {
            "class": "User",
            "userType": "regular",
            "password": "",
            "shell": "bash"
        },
        "root": {
            "class": "User",
            "userType": "root",
            "oldPassword": "default",
            "newPassword": ""
        }
    }
}
```

F5 BIGIP Runtime Init declaration which provides secret metadata via runtime_parameters for GCP:
```yaml
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      type: SecretsManager
      environment: gcp
      version: latest
      secretId: my-secret-id-01
  - name: ROOT_PASS
    type: secret
    secretProvider:
      type: SecretsManager
      environment: gcp
      version: latest
      secretId: my-secret-id-02
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_do.json
```

Example 6: Replaces variables used within DO declaration with properties from instance metadata to configure hostname and self IP addresses on BIGIP device.

F5 DO declaration (**Note**: Triple mustache required for fields containing a forward slash): 
```json
{
    "schemaVersion": "1.0.0",
    "class": "Device",
    "async": true,
    "label": "my BIG-IP declaration for declarative onboarding",
    "Common": {
        "class": "Tenant",
        "hostname": ".local",
        "internal": {
            "class": "VLAN",
            "tag": 4093,
            "mtu": 1500,
            "interfaces": [
                {
                    "name": "1.2",
                    "tagged": true
                }
            ]
        },
        "internal-self": {
            "class": "SelfIp",
            "address": "",
            "vlan": "internal",
            "allowService": "default",
            "trafficGroup": "traffic-group-local-only"
        },
        "external": {
            "class": "VLAN",
            "tag": 4094,
            "mtu": 1500,
            "interfaces": [
                {
                    "name": "1.1",
                    "tagged": true
                }
            ]
        },
        "external-self": {
            "class": "SelfIp",
            "address": "",
            "vlan": "external",
            "allowService": "none",
            "trafficGroup": "traffic-group-local-only"
        }
    }
}
```

F5 BIGIP Runtime Init declaration which renders Azure instance metadata via runtime_parameters:
```yaml
runtime_parameters:
  - name: HOST_NAME
    type: metadata
    metadataProvider:
      environment: azure
      type: compute
      field: name
  - name: SELF_IP_INTERNAL
    type: metadata
    metadataProvider:
      environment: azure
      type: network
      field: ipv4
      index: 1
  - name: SELF_IP_EXTERNAL
    type: metadata
    metadataProvider:
      environment: azure
      type: network
      field: ipv4
      index: 2
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: file:///examples/declarations/do.json
```
F5 BIGIP Runtime Init declaration which renders AWS instance metadata via runtime_parameters:
```yaml
runtime_parameters:
  - name: HOST_NAME
    type: metadata
    metadataProvider:
      environment: aws
      type: compute
      field: hostname
  - name: SELF_IP_EXTERNAL
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: local-ipv4s
      index: 1
  - name: SELF_IP_INTERNAL
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: local-ipv4s
      index: 2
  - name: DEFAULT_ROUTE
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: subnet-ipv4-cidr-block
      index: 1
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: file:///examples/declarations/do.json
```

Example 7: Installs AS3 and DO and uses an inline AS3 declaration to setup the BIG-IP.
Using a YAML-based config file:
```yaml
runtime_parameters: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.5.0
    - extensionType: as3
      extensionVersion: 3.13.0
extension_services:
  service_operations:
    - extensionType: as3
      type: inline
      value: 
        class: AS3
        action: deploy
        persist: true
        declaration:
          class: ADC
          schemaVersion: 3.0.0
          id: urn:uuid:33045210-3ab8-4636-9b2a-c98d22ab915d
          label: Sample 1
          remark: Simple HTTP Service with Round-Robin Load Balancing
          Sample_01:
            class: Tenant
            A1:
              class: Application
              template: http
              serviceMain:
                class: Service_HTTP
                virtualAddresses:
                - 10.0.1.10
                pool: web_pool
              web_pool:
                class: Pool
                monitors:
                - http
                members:
                - servicePort: 80
                  serverAddresses:
                  - 192.0.1.10
                  - 192.0.1.11

```
Using a JSON-based config file:
```json
{
   "runtime_parameters": [],
   "extension_packages": {
      "install_operations": [
         {
            "extensionType": "do",
            "extensionVersion": "1.5.0"
         },
         {
            "extensionType": "as3",
            "extensionVersion": "3.13.0"
         }
      ]
   },
   "extension_services": {
      "service_operations": [
         {
            "extensionType": "as3",
            "type": "inline",
            "value": {
               "class": "AS3",
               "action": "deploy",
               "persist": true,
               "declaration": {
                  "class": "ADC",
                  "schemaVersion": "3.0.0",
                  "id": "urn:uuid:33045210-3ab8-4636-9b2a-c98d22ab915d",
                  "label": "Sample 1",
                  "remark": "Simple HTTP Service with Round-Robin Load Balancing",
                  "Sample_01": {
                     "class": "Tenant",
                     "A1": {
                        "class": "Application",
                        "template": "http",
                        "serviceMain": {
                           "class": "Service_HTTP",
                           "virtualAddresses": [
                           "10.0.1.10"
                           ],
                           "pool": "web_pool"
                        },
                        "web_pool": {
                           "class": "Pool",
                           "monitors": [
                           "http"
                           ],
                           "members": [
                              {
                                 "servicePort": 80,
                                 "serverAddresses": [
                                    "192.0.1.10",
                                    "192.0.1.11"
                                 ]
                              }
                           ]
                        }
                     }
                  }
               }
            }
         }
      ]
   }
}
```

Example 8: Using runtime parameters with inline Automation Toolchain declarations.
Using a YAML-based config file:
```yaml
---
runtime_parameters:
- name: SCHEMA_VERSION
  type: static
  value: 3.0.0
- name: HOST_NAME
  type: static
  value: bigip1.example.com
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.5.0
    - extensionType: as3
      extensionVersion: 3.13.0
extension_services:
  service_operations:
    - extensionType: do
      type: inline
      value: 
        schemaVersion: 1.0.0
        class: Device
        async: true
        label: my BIG-IP declaration for declarative onboarding
        Common:
          class: Tenant
          hostname: HOST_NAME
          myDns:
            class: DNS
            nameServers:
            - 8.8.8.8
          myNtp:
            class: NTP
            servers:
            - 0.pool.ntp.org
            timezone: UTC
          myProvisioning:
            class: Provision
            ltm: nominal
            asm: nominal
          dbvars:
            class: DbVariables
            provision.extramb: 500
            restjavad.useextramb: true
    - extensionType: as3
      type: inline
      value:
        class: AS3
        action: deploy
        persist: true
        declaration:
          class: ADC
          schemaVersion: ""
          label: Sample 1
          remark: Simple HTTP Service with Round-Robin Load Balancing
          Sample_01:
            class: Tenant
            A1:
              class: Application
              template: http
              serviceMain:
                class: Service_HTTP
                virtualAddresses:
                - 10.0.1.10
                pool: web_pool
              web_pool:
                class: Pool
                monitors:
                - http
                members:
                - servicePort: 80
                  serverAddresses:
                  - 192.0.1.10
                  - 192.0.1.11
```

Using a JSON-based config file:
```json
{
  "runtime_parameters": [
    {
      "name": "SCHEMA_VERSION",
      "type": "static",
      "value": "3.0.0"
    },
    {
      "name": "HOST_NAME",
      "type": "static",
      "value": "bigip1.example.com"
    }
  ],
  "extension_packages": {
    "install_operations": [
      {
        "extensionType": "do",
        "extensionVersion": "1.5.0"
      },
      {
        "extensionType": "as3",
        "extensionVersion": "3.13.0"
      }
    ]
  },
  "extension_services": {
    "service_operations": [
      {
        "extensionType": "do",
        "type": "inline",
        "value": {
          "schemaVersion": "1.0.0",
          "class": "Device",
          "async": true,
          "label": "my BIG-IP declaration for declarative onboarding",
          "Common": {
            "class": "Tenant",
            "hostname": "HOST_NAME",
            "myDns": {
              "class": "DNS",
              "nameServers": [
                "8.8.8.8"
              ]
            },
            "myNtp": {
              "class": "NTP",
              "servers": [
                "0.pool.ntp.org"
              ],
              "timezone": "UTC"
            },
            "myProvisioning": {
              "class": "Provision",
              "ltm": "nominal",
              "asm": "nominal"
            },
            "dbvars": {
              "class": "DbVariables",
              "provision.extramb": 500,
              "restjavad.useextramb": true
            }
          }
        }
      },
      {
        "extensionType": "as3",
        "type": "inline",
        "value": {
          "class": "AS3",
          "action": "deploy",
          "persist": true,
          "declaration": {
            "class": "ADC",
            "schemaVersion": "",
            "label": "Sample 1",
            "remark": "Simple HTTP Service with Round-Robin Load Balancing",
            "Sample_01": {
              "class": "Tenant",
              "A1": {
                "class": "Application",
                "template": "http",
                "serviceMain": {
                  "class": "Service_HTTP",
                  "virtualAddresses": [
                    "10.0.1.10"
                  ],
                  "pool": "web_pool"
                },
                "web_pool": {
                  "class": "Pool",
                  "monitors": [
                    "http"
                  ],
                  "members": [
                    {
                      "servicePort": 80,
                      "serverAddresses": [
                        "192.0.1.10",
                        "192.0.1.11"
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ]
  }
}
```

Example 9: Using custom pre-onboard and post-onboard commands.

Runtime init allows to specify custom onboard actions/commands using "pre_onboard_enabled" and/or "post_onboard_enabled".
There are a few options/types to provide custom onboard script:
  - inline: The command is included within the declaration
  - file: Specifies a local path to the custom script
  - url: Specifies a URL for the custom script

```yaml
runtime_parameters: []
pre_onboard_enabled:
  - name: example_inline_command
    type: inline
    commands:
      - touch /tmp/pre_onboard_script.sh
      - chmod 777 /tmp/pre_onboard_script.sh
      - echo "touch /tmp/create_by_autogenerated_pre_local" > /tmp/pre_onboard_script.sh
  - name: example_local_exec
    type: file
    commands:
      - /tmp/pre_onboard_script.sh
  - name: example_remote_exec
    type: url
    commands:
      - https://the-delivery-location.com/remote_pre_onboard.sh
post_onboard_enabled:
  - name: example_inline_command
    type: inline
    commands:
      - touch /tmp/post_onboard_script.sh
      - chmod 777 /tmp/post_onboard_script.sh
      - echo "touch /tmp/create_by_autogenerated_post_local" > /tmp/post_onboard_script.sh
  - name: example_local_exec
    type: file
    commands:
      - /tmp/post_onboard_script.sh
  - name: example_remote_exec
    type: url
    commands:
      - https://the-delivery-location.com/remote_post_onboard.sh
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations: []
```

Example 10: Sending a customized webhook on completion.

This example installs DO and AS3, then sends a webhook to a user-defined URL on completion of onboarding. Optional properties are added to the standard webhook payload.
**Note**: The webhook destination must be able to receive a POST request.  The standard payload is defined below the following example.

```yaml
runtime_parameters: []
pre_onboard_enabled: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations: []
post_onboard_enabled: []
post_hook:
  - name: example_webhook
    type: webhook
    url: https://webhook.site
    verifyTls: true
    properties:
      optionalKey1: optional_value1
      optionalKey2: optional_value2
```

The following standard payload with custom properties will be sent securely to https://webhook.site:
**Note**: The payload is customizable by adding attributes to the properties object.

```json
{
  "cpuCount": 2,
  "diskSize": 157696,
  "environment": {
    "libraries": {
      "ssh": "OpenSSH_7.4p1, OpenSSL 1.0.2s-fips  28 May 2019"
    },
    "nodeVersion": "v6.9.1",
    "pythonVersion": "Python 2.7.5",
    "pythonVersionDetailed": "2.7.5 (default, Jan 21 2020, 10:23:35)\n[GCC 4.8.5 20150623 (Red Hat 4.8.5-16)]"
  },
  "hostname": "bigip1.azure.com",
  "id": "422523af-d321-e711-e8cbbe41b2c3",
  "installedPackages": {
    "f5-appsvcs-3.20.0-3.noarch": "3.20.0",
    "f5-appsvcs-templates-1.1.0-1.noarch": "1.1.0",
    "f5-declarative-onboarding-1.10.0-2.noarch": "1.10.0",
    "f5-service-discovery-1.2.9-2.noarch": "1.2.9"
  },
  "management": "10.145.67.83/18",
  "memoryInMb": 14016,
  "nicCount": 2,
  "platformId": "Z100",
  "product": "BIG-IP",
  "provisionedModules": {
    "asm": "nominal",
    "ltm": "nominal"
  },
  "regKey": "XXXX-DDDD-AAAA-DDDDD-IAWCOJO",
  "version": "15.1.0.1",
  "properties": {
     "optionalKey1": "optional_value1",
     "optionalKey2": "optional_value2"
  }
}
```

F5 BIG-IP Runtime Init is integrated with F5 TEEM; the following payload is used for sending information via F5 TEEM:
```json
{
    "id": "3d8261e0-4324-11ea-9d73-752bc4d5342d",
    "digitalAssetId": "aa2dabc4-cfbc-5ae0-bd0c-ec1c4f48b631",
    "rawTelemetry": {
        "documentType": "f5-bigip-runtime-init",
        "documentVersion": "1",
        "digitalAssetId": "aa2dabc4-cfbc-5ae0-bd0c-ec1c4f48b631",
        "digitalAssetName": "f5-image-generator",
        "digitalAssetVersion": "1.0.0",
        "observationStartTime": "2020-01-30T05:49:04.493Z",
        "observationEndTime": "2020-01-30T05:49:04.493Z",
        "epochTime": 1580363344493,
        "telemetryId": "cc3b812b-1fba-431d-b07c-e6f8a60d737f",
        "telemetryRecords": [
            {  
                "platform": {
                    "platform": "BIG-IP",
                    "platformVersion": "15.0.1",
                    "platformId": "z100",
                    "system": {
                        "cpuCount": 4,
                        "memory": 2048,
                        "diskSize": 100000
                    },
                    "nicCount": "3",
                    "regKey": "XXXX-XXXXX-XXXX-XXXXXX",
                    "deployment": {
                        "cloud": "aws",
                        "customerId": "911584398073"
                    },
                    "modules": {
                                "ltm": "nominal",
                                "asm": "nominal",
                                "afm": null //wouldn't show up in payload
                    },
                    "packages": {
                                "f5-declarative-onboarding": "1.10.0",
                                "f5-appsvcs": "3.20.0",
                                "f5-service-discovery": "1.2.9",
                                "f5-telemetry-streaming": "1.0.0",
                                "f5-cloud-failover": "1.0.3",
                                "f5-appsvcs-templates": "1.1.0"
                    },
                    "environment": {
                        "pythonVersion": "Python 2.6.6",
                        "pythonVersionDetailed": "2.6.6 (r266:84292, Aug 14 2019, 11:37:50) [GCC 4.4.7 20120313 (Red Hat 4.4.7-3)]",
                        "nodeVersion": "v6.9.1",
                        "goVersion": null,
                        "libraries": {
                            "git": null,
                            "ssh": "OpenSSH_6.6.1p1, OpenSSL 1.0.1l-fips 15 Jan 2015"
                        }
                    }
                },
                "product": {
                    "version": "0.0.8",
                    "locale": "en_US,UTF-8",
                    "installDate": "2020-01-30T05:49:04.992Z",
                    "installationId": "fde0cdd8-d0d6-11e9-8307-0242ac110002",
                    "installedComponents": {
                        "commander": "^4.1.0",
                        "js-yaml": "^3.13.1",
                        "mustache": "^4.0.0",
                        "request": "^2.88.0",
                        "google-auth-library": "^5.9.2",
                        "@google-cloud/secret-manager": "^1.1.2",
                        "aws-sdk": "^2.610.0",
                        "@azure/keyvault-secrets": "^4.0.2",
                        "@azure/ms-rest-nodeauth": "^3.0.3"
                    }
                },
                "operation": {
                    "clientRequestId": "87036fc2-94a9-11ea-a317-acde48001122",
                    "rawCommand": "f5-runtime-init -c config.yaml",
                    "pre_onboard_enabled": {
                        "commands": 3
                    },
                    "runtime_params": {
                        "secrets": 3,
                        "custom": 1
                    },
                    "vaults": {
                        "aws": 1
                    },
                    "extension_packages": {
                        "as3": 1,
                        "do": 1,
                        "ts": 1
                    },
                    "extension_services": {
                        "as3": 1,
                        "do": 1,
                        "ts": 1
                    },
                    "post_onboard_enabled": {
                        "commands": 3,
                        "post_hooks": 2
                    },
                    "result": "SUCCESS",
                    "resultSummary": "Configuration Successful",
                    "startTime": "2020-01-30T05:49:04.992Z",
                    "endTime": "2020-01-30T05:49:04.992Z"
                }
            }
        ]
    },
    "telemetryReceivedDate": "2020-01-30T05:49:11.806Z",
    "unregisteredAsset": false,
    "_rid": "PuQMAIrsNvOAlScAAAAAAA==",
    "_self": "dbs/PuQMAA==/colls/PuQMAIrsNvM=/docs/PuQMAIrsNvOAlScAAAAAAA==/",
    "_etag": "\"06000f5f-0000-0800-0000-5e326e570000\"",
    "_attachments": "attachments/",
    "_ts": 1580363351
}
```

F5 TEEM can be disabled via BIGIP homephone feature as documented here: https://www.npmjs.com/package/@f5devcentral/f5-teem#advanced-usage
 
Example using TMSH pre_onboard command:
 ```yaml
runtime_parameters: []
pre_onboard_enabled:
  - name: disable_homephone_feature
    type: inline
    commands:
      - tmsh modify sys software update auto-phonehome disabled
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.12.0
    - extensionType: as3
      extensionVersion: 3.19.1
extension_services:
  service_operations: []
```

Example using Declarative Onboarding:
```json
{
    "schemaVersion": "1.0.0",
    "class": "Device",
    "async": true,
    "webhook": "https://example.com/myHook",
    "label": "my BIG-IP declaration for declarative onboarding",
    "Common": {
        "class": "Tenant",
        "mySystem": {
            "class": "System",
            "hostname": "bigip.example.com",
            "cliInactivityTimeout": 1200,
            "consoleInactivityTimeout": 1200,
            "autoPhonehome": false
        }
    }
}
```


F5 BIG-IP Runtime Init provides a verifyTls parameter intended to enable certificate verification/validation on all external HTTPS requests.

By default, verifyTls is always set to "true" and therefore, certificate validation/verification is enabled by default.

The following declaration items support overriding certificate validation/verification by setting verifyTls to "false":
  - pre_onboard_enabled and post_onboard_enabled for all url commands
  - extensions_packages.install_operations 
  - extension_services.service_operations
  - post_hook
 
Example:
```yaml
runtime_parameters: []
pre_onboard_enabled:
  - name: example_remote_exec
    type: url
    commands:
      - https://ak-metadata-package-poc.s3.amazonaws.com/remote_pre_onboard.sh
post_onboard_enabled:
  - name: example_inline_command
    type: inline
    commands:
      - touch /tmp/post_onboard_script.sh
      - chmod 777 /tmp/post_onboard_script.sh
      - echo "touch /tmp/created_by_autogenerated_post_local" > /tmp/post_onboard_script.sh
  - name: example_local_exec
    type: file
    commands:
      - /tmp/post_onboard_script.sh
  - name: example_remote_exec
    type: url
    commands:
      - https://ak-metadata-package-poc.s3.amazonaws.com/remote_post_onboard.sh
    verifyTls: false
  - name: example_remote_exec
    type: url
    commands:
      - https://ak-metadata-package-poc.s3.amazonaws.com/remote_post_onboard.sh
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.10.0
    - extensionType: as3
      extensionVersion: 3.20.0
      verifyTls: false
      extensionUrl: https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.20.0/f5-appsvcs-3.20.0-3.noarch.rpm
      extensionHash: ba2db6e1c57d2ce6f0ca20876c820555ffc38dd0a714952b4266c4daf959d987
    - extensionType: ilx
      extensionUrl: file:///var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.1.0-1.noarch.rpm
      extensionVersion: 1.1.0
      extensionVerificationEndpoint: /mgmt/shared/fast/info
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/declarations/autoscale-waf/autoscale_do_payg.json
      verifyTls: false
    - extensionType: as3
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_as3.json
post_hook:
  - name: example_webhook
    type: webhook
    verifyTls: false
    url: https://postman-echo.com/post
    properties:
      optionalKey1: optional_value1
      optionalKey2: optional_value2
```


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

Example of how to set the log level using an environment variable: ```export F5_BIGIP_RUNTIME_INIT_LOG_LEVEL=silly && bash /var/tmp/f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud ${CLOUD}'```


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