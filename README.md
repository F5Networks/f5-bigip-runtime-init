# f5-cloud-onboarder

The "Onboarder" installs and configures BIG-IP Toolchain components, while also providing runtime rendering of entities such as secrets, metadata values, etc. into the Toolchain declarations resulting in a complete overlay deployment tool for configuring a BIG-IP.

## Usage

- Install Onboarder: ```curl https://raw.githubusercontent.com/jsevedge/f5-cloud-onboarder/v0.9.0/scripts/install.sh | bash```
- Use Onboarder: ```f5-cloud-onboarder --config-file test.yaml```

## Configuration Files

Installs toolchain components (DO, AS3) on a local BIG-IP and then configures AS3.

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
        type: file
        value: ./examples/declarations/as3.json
```

Installs toolchain components (DO, AS3) on a remote BIG-IP.

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

## Documentation Artifacts

- Code Documentation
  - Build: `npm run build-code-docs`
  - View: `code-docs/index.html`

## Testing

Tests exist for this project, see the [test readme](tests/README.md) for more details.