#!/bin/bash

# Send output to log file and serial console
mkdir -p  /var/log/cloud /config/cloud
LOG_FILE=/var/log/cloud/startup-script.log
touch $LOG_FILE
exec 1<&-
exec 2<&-
npipe=/tmp/$$.tmp
trap "rm -f $npipe" EXIT
mknod $npipe p
tee <$npipe -a $LOG_FILE &
tee <$npipe /dev/ttyS0 &
exec 1>&-
exec 1>$npipe
exec 2>&1

### write_files:
# Download or Render BIG-IP Runtime Init Config 
cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
runtime_parameters: []
pre_onboard_enabled:
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
      - /usr/bin/setdb setup.run false
extension_packages:
    install_operations:
        - extensionType: do
          extensionVersion: 1.16.0
        - extensionType: as3
          extensionVersion: 3.23.0
        - extensionType: ts
          extensionVersion: 1.12.0
extension_services:
    service_operations: []
post_onboard_enabled: []
EOF


### runcmd:
# Download
curl -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.0.0/dist/f5-bigip-runtime-init-1.0.0-1.gz.run -o /var/tmp/f5-bigip-runtime-init-1.0.0-1.gz.run
# Install
bash /var/tmp/f5-bigip-runtime-init-1.0.0-1.gz.run -- '--cloud azure'
# Run
f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml

