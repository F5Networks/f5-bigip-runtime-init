#!/bin/bash -x
# SUMMARY: This is an example for how to perform a NIC Swap for GCP

mkdir -p  /var/log/cloud /config/cloud /var/lib/cloud/icontrollx_installs /var/config/rest/downloads

LOG_FILE=/var/log/cloud/startup-script-pre-nic-swap.log
[[ ! -f $LOG_FILE ]] && touch $LOG_FILE || { echo "Run Only Once. Exiting"; exit; }
npipe=/tmp/$$.tmp
trap "rm -f $npipe" EXIT
mknod $npipe p
tee <$npipe -a $LOG_FILE /dev/ttyS0 &
exec 1>&-
exec 1>$npipe
exec 2>&1

cat << 'EOF' > /config/first-run.sh
#!/bin/bash

if [ ! -f /config/first_run_flag ]; then

    touch /config/first_run_flag
    chmod +w /config/startup
    chmod +x /config/startup-script.sh
    echo "/config/startup-script.sh" >> /config/startup

    /usr/bin/setdb provision.managementeth eth1
    /usr/bin/setdb provision.extramb 1000 || true
    /usr/bin/setdb provision.restjavad.extramb 1384 || /usr/bin/setdb restjavad.useextramb true || true
    /usr/bin/setdb iapplxrpm.timeout 300 || true
    /usr/bin/setdb icrd.timeout 180 || true
    /usr/bin/setdb restjavad.timeout 180 || true
    /usr/bin/setdb restnoded.timeout 180 || true
    reboot
fi
EOF

cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
controls:
  logLevel: silly
  logFilename: /var/log/cloud/bigIpRuntimeInit.log
pre_onboard_enabled: []
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: gcp
      type: SecretsManager
      version: latest
      secretId: ${secret_id}
  - name: HOST_NAME
    type: url
    value: http://169.254.169.254/computeMetadata/v1/instance/hostname
    headers:
       - name: Metadata-Flavor
         value: Google
  - name: MGMT_IP
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 1
        ipcalc: address
  - name: SELF_IP_EXTERNAL
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 0
        ipcalc: address
  - name: SELF_IP_INTERNAL
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 2
        ipcalc: address
  - name: MGMT_GW
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 1
        ipcalc: first
  - name: EXTERNAL_GW
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 0
        ipcalc: first
  - name: INTERNAL_GW
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 2
        ipcalc: first
  - name: MGMT_BITMASK
    type: metadata
    metadataProvider:
      environment: gcp
      type: network
      field: ip
      index: 1
      ipcalc: bitmask
  - name: EXTERNAL_BITMASK
    type: metadata
    metadataProvider:
      environment: gcp
      type: network
      field: ip
      index: 0
      ipcalc: bitmask
  - name: INTERNAL_BITMASK
    type: metadata
    metadataProvider:
      environment: gcp
      type: network
      field: ip
      index: 2
      ipcalc: bitmask
  - name: MGMT_NETWORK
    type: metadata
    metadataProvider:
      environment: gcp
      type: network
      field: ip
      index: 1
      ipcalc: base
  - name: EXTERNAL_NETWORK
    type: metadata
    metadataProvider:
      environment: gcp
      type: network
      field: ip
      index: 0
      ipcalc: base
  - name: INTERNAL_NETWORK
    type: metadata
    metadataProvider:
      environment: gcp
      type: network
      field: ip
      index: 2
      ipcalc: base
bigip_ready_enabled: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.44.0
      extensionHash: 3b05d9bcafbcf0b5b625ff81d6bab5ad26ed90c0dd202ded51756af3598a97ec
    - extensionType: as3
      extensionVersion: 3.51.0
      extensionHash: e151a9ccd0fd60c359f31839dc3a70bfcf2b46b9fedb8e1c37e67255ee482c0f
    - extensionType: ts
      extensionVersion: 1.35.0
      extensionHash: 839698d98a8651a90b3d509cde4b382338461a253878c9fd00c894699ef0e844
extension_services:
  service_operations:
    - extensionType: do
      type: inline
      value:
        schemaVersion: 1.0.0
        class: Device
        async: true
        label: Example 3NIC BIG-IP with Runtime-Init
        Common:
          class: Tenant
          My_DbVariables:
            class: DbVariables
            ui.advisory.enabled: true
            ui.advisory.color: blue
            ui.advisory.text: BIG-IP VE Runtime Init Example
          My_System:
            class: System
            hostname: '{{{ HOST_NAME }}}'
            cliInactivityTimeout: 1200
            consoleInactivityTimeout: 1200
            autoPhonehome: true
          My_Dns:
            class: DNS
            nameServers:
              - 169.254.169.254
          My_Ntp:
            class: NTP
            servers:
              - 0.pool.ntp.org
            timezone: UTC
          My_Provisioning:
            class: Provision
            ltm: nominal
          admin:
            class: User
            userType: regular
            partitionAccess:
              all-partitions:
                role: admin
            password: '{{{ ADMIN_PASS }}}'
            shell: bash
          dhclient_route1:
            class: ManagementRoute
            network: '{{{ MGMT_IP }}}/32'         
            type: interface
          dhclient_route2:
            class: ManagementRoute
            network: '{{{ MGMT_NETWORK }}}/{{{ MGMT_BITMASK }}}'
            gw: '{{{ MGMT_IP }}}'
          default:
            class: ManagementRoute
            mtu: 1460
            network: default
            gw: '{{{ MGMT_GW }}}'
          external:
            class: VLAN
            tag: 4094
            mtu: 1500
            interfaces:
              - name: '1.0'
                tagged: false
          internal:
            class: VLAN
            tag: 4093
            mtu: 1500
            interfaces:
              - name: '1.2'
                tagged: false
          external-self:
            class: SelfIp
            address: '{{{ SELF_IP_EXTERNAL }}}/32'
            vlan: external
            allowService: none
            trafficGroup: traffic-group-local-only
          internal-self:
            class: SelfIp
            address: '{{{ SELF_IP_INTERNAL }}}/32'
            vlan: internal
            allowService: default
            trafficGroup: traffic-group-local-only
          externalGwRoute:
            class: Route
            target: external
            network: '{{{ EXTERNAL_GW }}}/32'
            mtu: 1460
          externalIntRoute:
            class: Route
            gw: '{{{ EXTERNAL_GW }}}'
            network: '{{{ EXTERNAL_NETWORK }}}/{{{ EXTERNAL_BITMASK }}}'
            mtu: 1460
          internalGwRoute:
            class: Route
            target: internal
            network: '{{{ INTERNAL_GW }}}/32'
            mtu: 1460
          internalIntRoute:
            class: Route
            gw: '{{{ EXTERNAL_GW }}}'
            network: '{{{ INTERNAL_NETWORK }}}/{{{ INTERNAL_BITMASK }}}'
            mtu: 1460
          defaultGateway:
            class: Route
            gw: '{{{ EXTERNAL_GW }}}'
            network: default
            mtu: 1460
post_onboard_enabled: []
EOF


# Run startup-script post nic-swap
cat << 'EOF' > /config/startup-script.sh
#!/bin/bash

LOG_FILE=/var/log/cloud/startup-script-post-swap-nic.log
[[ ! -f $LOG_FILE ]] && touch $LOG_FILE || { echo "Run Only Once. Exiting"; exit; }
npipe=/tmp/$$.tmp
trap "rm -f $npipe" EXIT
mknod $npipe p
tee <$npipe -a $LOG_FILE /dev/ttyS0 &
exec 1>&-
exec 1>$npipe
exec 2>&1

# Need to create a MGMT default route as not provided by DHCP on 2nd NIC Route name must be same as in DO config.
source /usr/lib/bigstart/bigip-ready-functions
wait_bigip_ready
# Wait until a little more until dhcp/chmand is finished re-configuring MGMT IP w/ "chmand[4267]: 012a0003:3: Mgmt Operation:0 Dest:0.0.0.0"
sleep 15
MGMT_GW=$(egrep static-routes /var/lib/dhclient/dhclient.leases | tail -1 | grep -oE '[^ ]+$' | tr -d ';')
tmsh create sys management-route default network default gateway $MGMT_GW mtu 1460
tmsh modify sys global-settings remote-host add { metadata.google.internal { hostname metadata.google.internal addr 169.254.169.254 } }
tmsh save /sys config

# Download
for i in {1..30}; do
    curl -fv --retry 1 --connect-timeout 5 -L "${package_url}" -o "/var/config/rest/downloads/f5-bigip-runtime-init.gz.run" && break || sleep 10
done
# Install
bash /var/config/rest/downloads/f5-bigip-runtime-init.gz.run -- "--cloud gcp --telemetry-params templateName:f5-bigip-runtime-init/examples/terraform/gcp/main.tf"
# Run
f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml

EOF

chmod 755 /config/first-run.sh
nohup /config/first-run.sh &
