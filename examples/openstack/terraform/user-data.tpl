#!/bin/bash

# Send output to log file and serial console
mkdir -p  /var/log/cloud /config/cloud /var/config/rest/downloads
LOG_FILE=/var/log/cloud/startup-script.log
[[ ! -f $LOG_FILE ]] && touch $LOG_FILE || { echo "Run Only Once. Exiting"; exit; }
npipe=/tmp/$$.tmp
trap "rm -f $npipe" EXIT
mknod $npipe p
tee <$npipe -a $LOG_FILE /dev/ttyS0 &
exec 1>&-
exec 1>$npipe
exec 2>&1

cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
runtime_parameters: []
pre_onboard_enabled:
  - name: disable root
    type: inline
    commands:
      - tmsh modify /sys db systemauth.disablerootlogin value true
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
      - /usr/bin/setdb setup.run false
  - name: disable_homephone_feature
    type: inline
    commands:
      - tmsh modify sys software update auto-phonehome disabled
  - name: disable mitigations
    type: inline
    commands:
      - tmsh modify sys db kernel.pti value disable
  - name: save config
    type: inline
    commands:
      - tmsh save sys config
extension_packages:
    install_operations:
        - extensionType: do
          extensionVersion: 1.17.0
          extensionUrl: file:///var/config/rest/downloads/f5-declarative-onboarding-1.17.0-3.noarch.rpm
        - extensionType: as3
          extensionVersion: 3.24.0
          extensionUrl: file:///var/config/rest/downloads/f5-appsvcs-3.24.0-5.noarch.rpm
        - extensionType: ts
          extensionVersion: 1.16.0
          extensionUrl: file:///var/config/rest/downloads/f5-telemetry-1.16.0-4.noarch.rpm
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: file:///config/cloud/do.json
post_onboard_enabled:
    - name: custom-config
      type: inline
      commands:
        - bash /config/custom-config.sh

EOF

cat << 'EOF' > /config/cloud/do.json
{
    "schemaVersion": "1.0.0",
    "class": "Device",
    "async": true,
    "label": "my BIG-IP declaration for declarative onboarding",
    "Common": {
        "class": "Tenant",
        "hostname": "${HOST_NAME}.local",
        "myLicense": {
          "class": "License",
          "licenseType": "regKey",
          "regKey": "${LICENSE}"
         },
        "admin": {
            "class": "User",
            "userType": "regular",
            "password": "${PASSWORD}",
            "shell": "bash"
        },
        "internal": {
            "class": "VLAN",
            "tag": 4093,
            "mtu": 1450,
            "interfaces": [
                {
                    "name": "1.2",
                    "tagged": false
                }
            ]
        },
        "internal-self": {
            "class": "SelfIp",
            "address": "${SELF_IP_INTERNAL}/24",
            "vlan": "internal",
            "allowService": "default",
            "trafficGroup": "traffic-group-local-only"
        },
        "external": {
            "class": "VLAN",
            "tag": 4094,
            "mtu": 1450,
            "interfaces": [
                {
                    "name": "1.1",
                    "tagged": false
                }
            ]
        },
        "external-self": {
            "class": "SelfIp",
            "address": "${SELF_IP_EXTERNAL}/24",
            "vlan": "external",
            "allowService": "none",
            "trafficGroup": "traffic-group-local-only"
        },
       "default": {
           "class": "Route",
           "gw": "${GATEWAY}",
           "network": "default",
           "mtu": 1450
        }
    }
}
EOF

cat << 'EOF' > /config/custom-config.sh
#!/bin/bash
# place your custom code here
rm -f /config/cloud/do.json
EOF

source /usr/lib/bigstart/bigip-ready-functions
wait_bigip_ready

for i in {1..30}; do
    curl -fv --retry 1 --connect-timeout 5 -L "https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.1.0/dist/f5-bigip-runtime-init-1.1.0-1.gz.run" -o "/var/config/rest/downloads/f5-bigip-runtime-init-1.1.0-1.gz.run" && break || sleep 10
done


for i in {1..30}; do
	    curl -fv --retry 1 --connect-timeout 5 -L "https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.24.0/f5-appsvcs-3.24.0-5.noarch.rpm" -o "/var/config/rest/downloads/f5-appsvcs-3.24.0-5.noarch.rpm" && break || sleep 10
done

for i in {1..30}; do
	    curl -fv --retry 1 --connect-timeout 5 -L "https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.17.0/f5-declarative-onboarding-1.17.0-3.noarch.rpm" -o "/var/config/rest/downloads/f5-declarative-onboarding-1.17.0-3.noarch.rpm" && break || sleep 10
done

for i in {1..30}; do
	    curl -fv --retry 1 --connect-timeout 5 -L "https://github.com/F5Networks/f5-telemetry-streaming/releases/download/v1.16.0/f5-telemetry-1.16.0-4.noarch.rpm" -o "/var/config/rest/downloads/f5-telemetry-1.16.0-4.noarch.rpm" && break || sleep 10
done

bash /var/config/rest/downloads/f5-bigip-runtime-init-1.1.0-1.gz.run -- '--skip-toolchain-metadata-sync'
# workaround for issues with 15.1.2 /mgmt/sys/ready returnning errors
bigstart restart restjavad

f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml --skip-telemetry
