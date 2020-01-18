# f5-cloud-onboarder

The "Onboarder" installs and configures BIG-IP Toolchain components, while also providing runtime rendering of entities such as secrets, metadata values, etc. into the Toolchain declarations resulting in a complete overlay deployment tool for configuring a BIG-IP.

## Usage

- Install Onboarder: ```curl https://raw.githubusercontent.com/jsevedge/f5-cloud-onboarder/v0.9.0/scripts/install.sh | bash```
- Use Onboarder: ```f5-cloud-onboarder --config-file test.yaml```