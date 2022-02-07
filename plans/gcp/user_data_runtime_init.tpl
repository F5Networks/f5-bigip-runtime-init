#!/bin/bash
# SUMMARY: This is an example for how to perform a NIC Swap for GCP using maximal runtime-init config instead of user-data

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
runtime_parameters:
  - name: USER_NAME
    type: static
    value: ${admin_username}
  - name: ADMIN_PASS
    type: static
    value: ${admin_password}
  - name: ROOT_PASS
    type: secret
    secretProvider:
      type: Vault
      environment: hashicorp
      vaultServer: vault_server_public_http
      secretsEngine: kv2
      secretPath: kv/data/credential
      field: password
      version: "1"
      authBackend:
        type: approle
        roleId:
          type: inline
          value: vault_app_role
        secretId:
          type: inline
          value: vault_secret_id
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
  - name: SELF_IP_INTERNAL
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 2
  - name: SELF_IP_EXTERNAL
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 0
  - name: DEFAULT_GW
    type: url
    value: http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/gateway
    headers:
       - name: Metadata-Flavor
         value: Google
  - name: TEST_TAG
    type: tag
    tagProvider:
      environment: gcp
      key: test_key
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: v1.23.0
      extensionUrl: https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.21.0/f5-declarative-onboarding-1.21.0-3.noarch.rpm
    - extensionType: as3
      extensionVersion: v3.30.0
      extensionUrl: https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.30.0/f5-appsvcs-3.30.0-5.noarch.rpm
    - extensionType: ts
      extensionVersion: v1.20.0
      extensionUrl: https://github.com/F5Networks/f5-telemetry-streaming/releases/download/v1.20.0/f5-telemetry-1.20.0-3.noarch.rpm
    - extensionType: cf
      extensionVersion: v1.8.0
      extensionUrl: https://github.com/F5Networks/f5-cloud-failover-extension/releases/download/v1.8.0/f5-cloud-failover-1.8.0-0.noarch.rpm

extension_services:
  service_operations:
    - extensionType: do
      type: inline
      value:
        schemaVersion: 1.0.0
        class: Device
        async: true
        label: Standalone 3NIC BIG-IP declaration for Declarative Onboarding with PAYG license
        Common:
          class: Tenant
          dbVars:
            class: DbVariables
            restjavad.useextramb: true
            provision.extramb: 1000
            ui.advisory.enabled: true
            ui.advisory.color: blue
            ui.advisory.text: "BIG-IP Quickstart"
          myNtp:
            class: NTP
            servers:
              - 0.pool.ntp.org
            timezone: UTC
          myDns:
            class: DNS
            nameServers:
              - 169.254.169.254
          mySystem:
            autoPhonehome: true
            class: System
            hostname: '{{{HOST_NAME}}}'
          '{{{USER_NAME}}}':
            class: User
            userType: regular
            password: '{{{ADMIN_PASS}}}'
            partitionAccess:
              all-partitions:
                role: admin
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
          external-self:
            class: SelfIp
            address: '{{{SELF_IP_EXTERNAL}}}'
            vlan: external
            allowService: none
            trafficGroup: traffic-group-local-only
          internal:
            class: VLAN
            tag: 4093
            mtu: 1500
            interfaces:
              - name: '1.2'
                tagged: false
          internal-self:
            class: SelfIp
            address: '{{{SELF_IP_INTERNAL}}}'
            vlan: internal
            allowService: default
            trafficGroup: traffic-group-local-only
          default:
            class: Route
            gw: '{{{DEFAULT_GW}}}'
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

# Begin as usual....
for i in {1..30}; do
   curl -fv --retry 1 --connect-timeout 5 -L https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v1.2.0/dist/f5-bigip-runtime-init-1.2.0-1.gz.run -o "/var/config/rest/downloads/f5-bigip-runtime-init.gz.run" && break || sleep 10
done

# Install
bash /var/config/rest/downloads/f5-bigip-runtime-init.gz.run -- '--cloud gcp'

/usr/local/bin/f5-bigip-runtime-init --config-file /config/cloud/runtime-init-conf.yaml
EOF

chmod 755 /config/first-run.sh
nohup /config/first-run.sh &
