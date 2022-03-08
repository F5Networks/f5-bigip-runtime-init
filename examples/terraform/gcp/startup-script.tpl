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
    /usr/bin/setdb provision.extramb 1000
    /usr/bin/setdb restjavad.useextramb true
    reboot
fi
EOF

cat << 'EOF' > /config/cloud/runtime-init-conf.yaml
---
controls:
  logLevel: debug
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
  - name: MGMT_GW
    type: url
    value: http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/1/gateway
    headers:
       - name: Metadata-Flavor
         value: Google
  - name: SELF_IP_EXTERNAL
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 0
  - name: SELF_IP_INTERNAL
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 2
  - name: DEFAULT_GW
    type: url
    value: http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/gateway
    headers:
       - name: Metadata-Flavor
         value: Google
bigip_ready_enabled: []
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.27.0
      extensionHash: 2aee4a29ac64b38ac5af7d41607a966cac063c99a339b228225ffa38f8f9a4cf
    - extensionType: as3
      extensionVersion: 3.34.0
      extensionHash: 05a80ec0848dc5b8876b78a8fbee2980d5a1671d635655b3af604dc830d5fed4
    - extensionType: ts
      extensionVersion: 1.26.0
      extensionHash: 128ec4fb6fd93e4dd7f43520a58f4810a9e20d45b60e7098a3c65ee960964bfa
    - extensionType: fast
      extensionVersion: 1.15.0
      extensionHash: 4980984355ef03cfe61442e8c0563518e292961aaca0da024d2a038d1c8601ca
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
            provision.extramb: 1000
            restjavad.useextramb: true
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
          defaultManagementRoute:
            class: ManagementRoute
            mtu: 1460
            network: default
            gw: '{{{MGMT_GW}}}'
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
            address: '{{{ SELF_IP_EXTERNAL }}}'
            vlan: external
            allowService: none
            trafficGroup: traffic-group-local-only
          internal-self:
            class: SelfIp
            address: '{{{ SELF_IP_INTERNAL }}}'
            vlan: internal
            allowService: default
            trafficGroup: traffic-group-local-only
          default:
            class: Route
            gw: '{{{ DEFAULT_GW }}}'
            network: default
            mtu: 1500
post_onboard_enabled:
  - name: create_google_routes
    type: inline
    commands:
    - "EXT_GW=$(curl -sH 'Metadata-Flavor: Google' http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/gateway); tmsh create net route ext_gw_int network $EXT_GW/32 interface external"
    - "INT_GW=$(curl -sH 'Metadata-Flavor: Google' http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/2/gateway); tmsh create net route int_gw_int network $INT_GW/32 interface internal"
    - "MGMT_SELF_IP=$(curl -sH 'Metadata-Flavor: Google' http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/ip); MGMT_MASK=$(curl -sH 'Metadata-Flavor: Google' http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/subnetmask); MGMT_NETWORK=$(ipcalc -n $MGMT_SELF_IP $MGMT_MASK | sed -n 's/^NETWORK=\\(.*\\)/\\1/p'); MGMT_PREFIX=$(ipcalc -p $MGMT_SELF_IP $MGMT_MASK | sed -n 's/^PREFIX=\\(.*\\)/\\1/p'); tmsh create sys management-route dhclient_route1 network $MGMT_SELF_IP/32 type interface; tmsh create sys management-route dhclient_route2 gateway $MGMT_SELF_IP network $MGMT_NETWORK/$MGMT_PREFIX"
    - tmsh save sys config
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
tmsh create sys management-route defaultManagementRoute network default gateway $MGMT_GW mtu 1460
tmsh modify sys global-settings remote-host add { metadata.google.internal { hostname metadata.google.internal addr 169.254.169.254 } }
tmsh save /sys config

# Download
for i in {1..30}; do
    curl -fv --retry 1 --connect-timeout 5 -L "${package_url}" -o "/var/config/rest/downloads/f5-bigip-runtime-init.gz.run" && break || sleep 10
done
# Install
bash /var/config/rest/downloads/f5-bigip-runtime-init.gz.run -- "--cloud gcp"
# Run
f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml

EOF

chmod 755 /config/first-run.sh
nohup /config/first-run.sh &
