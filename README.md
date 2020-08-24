
# f5-bigip-runtime-init
## NOTE: This project is under active development.

F5 BIG-IP runtime init installs and configures BIG-IP Toolchain components, while also providing runtime rendering of entities such as secrets, metadata values, etc. into the Toolchain declarations resulting in a complete overlay deployment tool for configuring a BIG-IP.
<br>
<br>
RPM's, file hashes, and installer are located on cdn using the following url's:
* Examples using version v0.9.0 release 1
  * [f5-bigip-runtime-init installer](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/f5-bigip-runtime-init-0.9.0-1.gz.run)
  * RPMS & checksum file
    * [All clouds rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm)
    * [All checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm.sha256)
    * [Azure rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm)
    * [Azure checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm.sha256)
    * [AWS rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm)
    * [AWS checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm.sha256)
    * [GCP rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm)
    * [GCP checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm.sha256)


## Value

The F5 BIG-IP runtime init package will eliminate the need for inscrutable, inflexible, and error-prone custom scripting in our cloud templates. It will allow us to easily extend our popular solutions for use with other provisioning tools, such as Terraform and Ansible, as well as any new cloud environments we may choose support in the future. It will also provide a mechanism for rendering secrets and other runtime variables (such as hostname and license key) into Automation Toolchain declaration files, removing the need to encrypt and store sensitive information locally on BIG-IP.

![F5 BIG-IP Runtime Init](diagrams/f5_bigip_runtime_init.gif)

## Requirements

This repository includes both the F5 BIG-IP runtime init source code and an installer script for onboarding the main package.

The installer script will do the following:

- Determine the cloud environment where the script is running
- Download the appropriate cloud-specific source archive (or the all-inclusive package if cloud is not detected)
- Install the source archive and create a command alias for f5-bigip-runtime-init

Based on the content of the provided cloud_config.yaml file, F5 BIG-IP runtime init will do the following:

- Download, verify, and install F5 Automation Toolchain components (DO, AS3, TS, CFE)
- Accept Automation Toolchain declarations in the form of URLs and/or local files
- Get secrets from cloud provider secret management APIs (Azure KeyVault, AWS Secret Manager, GCP Secrets Manager)
- Render valid Automation Toolchain declarations based on rendered runtime variables (such as secrets above) and provided declarations
- POST rendered declarations to Automation Toolchain endpoints and verify success or failure

## Pre-requisites

- Node.js v8.0.0 or later (to run locally)
- BIG-IP 15.0 or later
- A mechanism to copy the configuration file to the BIG-IP instance (cloud-init, custom data)
- Internet access for downloading installer script and runtime init package

## Usage

- Install F5 BIG-IP runtime init: ```curl https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/scripts/install.sh | bash```
- Use F5 BIG-IP runtime init: ```f5-bigip-runtime-init --config-file /config/cloud/cloud_config.yaml```

## Configuration Files
- Config examples and schema: ./examples/config
- Declaration examples: ./examples/declarations

Example 1: Verifies and installs toolchain components (DO, AS3) on a local BIG-IP and then configures AS3 from a local declaration file.

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

Example 2: Verifies and installs DO and myIlxApp RPMs from local directories and configures DO from a local declaration file. Note: Install operations with an extensionUrl value that points to a local file may only be installed from the /var/lib/cloud or /var/lib/cloud/icontrollx_installs directories.

```yaml
runtime_parameters: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionUrl: file:///var/lib/cloud/icontrollx_installs/f5-declarative-onboarding-1.10.0-2.noarch.rpm
      extensionHash: 95c2b76fb598bbc36fb93a2808f2e90e6c50f7723d27504f3eb2c2850de1f9e1
    - extensionType: ilx
      extensionUrl: file:///var/lib/cloud/myIlxApp.rpm
      extensionVerificationEndpoint: /mgmt/shared/myIlxApp/info
      extensionHash: 4477f84d0be2fa8fb551109a237768c365c4d17b44b2665e4eb096f2cfd3c4f1
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: file:///var/lib/cloud/do.json
```

Example 3: Installs toolchain components (DO, AS3) on a local BIG-IP and renders Azure service principal into AS3 service discovery declaration downloaded from a URL

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
                    "apiAccessKey": "{{AZURE_SERVICE_PRINCIPAL}}",
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

- F5 BIGIP Runtime Init declaration which provides secret metadata via runtime_parameters for Azure Servce Principal
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

Example 4: Replaces secret used within DO declaration to configure admin password on AWS BIGIP device

- in AWS Secret Manager, secrets will be stored in plain text mapped via secretId
```json
  "test-document-01": "StrongPassword212+"
  "test-document-02": "StrongPassword212*"
```
- do declaration with token: 
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
            "password": "{{{ ADMIN_PASS }}}",
            "shell": "bash"
        },
        "root": {
            "class": "User",
            "userType": "root",
            "oldPassword": "default",
            "newPassword": "{{{ ROOT_PASS }}}"
        }
    }
}
```

- F5 BIGIP Runtime Init declaration which provides secret metadata via runtime_parameters for AWS
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

Example 5: Replaces secret used within DO declaration to configure admin password on GCP BIG-IP device

- In Google Secret Manager, secrets will be stored and mapped via secretId
```json
  "my-secret-id-01": "StrongPassword212+"
  "my-secret-id-02": "StrongPassword212*"
```
- do declaration with token: 
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
            "password": "{{{ ADMIN_PASS }}}",
            "shell": "bash"
        },
        "root": {
            "class": "User",
            "userType": "root",
            "oldPassword": "default",
            "newPassword": "{{{ ROOT_PASS }}}"
        }
    }
}
```

- F5 BIGIP Runtime Init declaration which provides secret metadata via runtime_parameters for GCP
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

Example 6: Replaces variables used within DO declaration with properties from instance metadata to configure hostname and self IP addresses on BIGIP device

- DO declaration (Note: Triple mustache required for fields containing a forward slash): 
```json
{
    "schemaVersion": "1.0.0",
    "class": "Device",
    "async": true,
    "label": "my BIG-IP declaration for declarative onboarding",
    "Common": {
        "class": "Tenant",
        "hostname": "{{{ HOST_NAME }}}.local",
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
            "address": "{{{ SELF_IP_INTERNAL }}}",
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
            "address": "{{{ SELF_IP_EXTERNAL }}}",
            "vlan": "external",
            "allowService": "none",
            "trafficGroup": "traffic-group-local-only"
        }
    }
}
```

- F5 BIGIP Runtime Init declaration which provides instance metadata via runtime_parameters for Azure
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
- F5 BIGIP Runtime Init declaration which provides instance metadata via runtime_parameters for AWS
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

Example 7: Installs AS3 and DO and uses an inline AS3 declaration to setup the BIG-IP
- Using a YAML based config file
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
- Using a JSON based config file
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

Example 8: Using runtime parameters with inline config
- Using a YAML based config file (please note - in order to passthrough the yaml processor, you have to use triple curly braces instead of the usual double)
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
          schemaVersion: "{{{ SCHEMA_VERSION }}}"
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

- Using a JSON based config file
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
            "schemaVersion": "{{{ SCHEMA_VERSION }}}",
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

Example 9: Using pre and post custom onboard commands

Runtime init allows to specify custom onboard actions/commands using "pre_onboard_enabled" and/or "post_onboard_enabled"
There are a few options/types to provide custom onboard script:
  - inline: command included within declaration
  - file: specifies path to custom script which should be stored on device
  - url: specifies url for custom script stored on delivery location (i.e CDN)

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

Example 10: Sending a customized webhook on completion

This example installs DO and AS3, then sends a webhook to a user-defined URL on completion of onboarding. Optional properties are added to the standard webhook payload.
Note: The webhook destination must be able to receive a POST request.  The standard payload is defined below the following example.

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

Standard payload with custom properties will be sent securely to https://webhook.site:

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

Runtime Init is integrated with F5 TEEM; payload used for F5 TEEM:
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
                    "platform": "BIG-IP"
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
                    }
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
                    "startTime": "2020-01-30T05:49:04.992Z", // Performance
                    "endTime": "2020-01-30T05:49:04.992Z"
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

 - F5 TEEM can be disabled via BIGIP homephone feature as documented here: https://www.npmjs.com/package/@f5devcentral/f5-teem#advanced-usage
 
 Example using TMSH command:
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

Example using Declarative On-boarding:
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


 - Runtime init provides "verifyTls" parameter intended to enable Certificate verification/validation on all external https requests.
 - By default, parameter is always set to "true" and therefore, certificate validation/verification is enabled by default
 - The following declaration items are allowed to override verifyTls parameter:
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

## Logging

 - The following enviroment variables can be used for setting logging options: 
    * F5_BIGIP_RUNTIME_INIT_LOG_LEVEL - defines log level
    ```json
        { 
          error: 0, 
          warn: 1, 
          info: 2, 
          debug: 5, 
          silly: 6 
        }
    ```
    * F5_BIGIP_RUNTIME_INIT_LOG_FILENAME - defines path to log file (i.e. /var/log/cloud/bigIpRuntimeInit.log)
    * F5_BIGIP_RUNTIME_INIT_LOG_TO_JSON - defines if logs should be outputed in JSON format:
    ```json
       {"message":"this is json message","level":"info","timestamp":"2020-08-04T00:22:28.069Z"}
    ```
Example how to set log level using env variable: ```export F5_BIGIP_RUNTIME_INIT_LOG_LEVEL=silly && bash /var/tmp/f5-bigip-runtime-init-$VERSION-$RELEASE.gz.run ${CLOUD}```

## Build Artifacts

- Create artifacts: `npm run build`
  * creates signed RPM files for each Public Cloud
  * creates SHA-256 checksums
  * packages all RPMs to makeself runner for furhter use
- Outputs:
  * Google: 
    - RMP: dist/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm
    - SHA-256: f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm.sha256
  * AWS: 
    - RPM: dist/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm
    - SHA-256: dist/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm.sha256
  * Azure: 
    - RPM: dist/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm
    - SHA-256: dist/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm.sha256
  * All clouds: 
    - RPM: dist/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm
    - f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm.sha256
- All artifacts are signed and install script verifies file integrity as well as signature

NOTE: *CM_SIGNER_ACCESS_TOKEN* - Access token used for communicating with the CM Signer service. 


## Documentation Artifacts

- Code Documentation
  - Build: `npm run build-code-docs`
  - View: `code-docs/index.html`

## Testing

Tests exist for this project, see the [test readme](tests/README.md) for more details.
