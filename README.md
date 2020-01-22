# f5-cloud-onboarder

The "Onboarder" installs and configures BIG-IP Toolchain components, while also providing runtime rendering of entities such as secrets, metadata values, etc. into the Toolchain declarations resulting in a complete overlay deployment tool for configuring a BIG-IP.

## Usage

- Install Onboarder: ```curl https://raw.githubusercontent.com/jsevedge/f5-cloud-onboarder/v0.9.0/scripts/install.sh | bash```
- Use Onboarder: ```f5-cloud-onboarder --config-file test.yaml```

## Configuration Files

Installs DO and AS3 on a remote BIG-IP.

```yaml
runtime_parameters: []
extension_packages:
    install_operations:
        - extensionType: do
          extensionVersion: 1.5.0
        - extensionType: as3
          extensionVersion: 3.13.0
extension_services:
    service_operations: []
host:
  address: 192.0.2.1
  port: 443
  protocol: 'https'
  username: admin
  password: admin
```