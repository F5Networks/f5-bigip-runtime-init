

# Embed Post-NIC-Swap
cat << 'EOF' > /config/post-nic-swap.sh
      #!/bin/bash
      # STAGE 2
      source /usr/lib/bigstart/bigip-ready-functions
      wait_bigip_ready
      /usr/bin/setdb restjavad.useextramb true
      /usr/bin/setdb provision.extramb 500
      tmsh delete sys management-route default
      tmsh delete sys management-ip all
      tmsh create sys management-ip $(cat /config/mgmt_private_ip.txt)
      tmsh create sys management-route default network default gateway $(cat /config/mgmt_subnet_gateway.txt)
      tmsh modify sys global-settings remote-host add { metadata.google.internal { hostname metadata.google.internal addr 169.254.169.254 } }
      tmsh save /sys config

      tmsh create net vlan external interfaces add { 1.0 } mtu 1460
      tmsh create net self $(cat /config/ext_private_ip.txt)/32 vlan external
      tmsh create net route ext_gw_int network $(cat /config/ext_subnet_gateway.txt)/32 interface external
      tmsh create net route ext_rt network $(cat /config/ext_subnet_cidr_range.txt) gw $(cat /config/ext_subnet_gateway.txt)
      tmsh create net route default gw $(cat /config/ext_subnet_gateway.txt)
      tmsh create net vlan internal interfaces add { 1.2 } mtu 1460
      tmsh create net self $(cat /config/int_private_ip.txt)/32 vlan internal allow-service add { tcp:4353 udp:1026 }
      tmsh create net route int_gw_int network $(cat /config/int_subnet_gateway.txt)/32 interface internal
      tmsh create net route int_rt network $(cat /config/int_subnet_cidr_range.txt) gw $(cat /config/int_subnet_gateway.txt)
      tmsh modify cm device $(cat /config/hostname.txt) unicast-address { { effective-ip $(cat /config/int_private_ip.txt) effective-port 1026 ip $(cat /config/int_private_ip.txt) } }
      tmsh modify sys global-settings hostname $(cat /config/hostname.txt)
      tmsh modify sys db failover.selinuxallowscripts value enable

      tmsh save /sys config

      mkdir /config/cloud
      cp /config/onboard_config.yaml /config/cloud/onboard_config.yaml
EOF

cat << 'EOF' > /config/first-run.sh
    #!/bin/bash
    source /usr/lib/bigstart/bigip-ready-functions
    # Wait for mcpd to get ready
    wait_bigip_ready

    if [ ! -f /config/first_run_flag ]; then
        touch /config/first_run_flag
        sleep 15

        adminUsername='${admin_username}'
        adminPassword='${admin_password}'
        tmsh create auth user $${adminUsername} password $${adminPassword} shell tmsh partition-access replace-all-with { all-partitions { role admin } }
        tmsh save /sys config

        echo "$(curl -s -f --retry 5 'http://metadata.google.internal/computeMetadata/v1/instance/name' -H 'Metadata-Flavor: Google').${hostname_suffix}" > /config/hostname.txt
        echo ${ext_private_ip} > /config/ext_private_ip.txt
        echo ${int_private_ip} > /config/int_private_ip.txt
        echo ${mgmt_private_ip} > /config/mgmt_private_ip.txt

        echo ${int_subnet_gateway} > /config/int_subnet_gateway.txt
        echo ${ext_subnet_gateway} > /config/ext_subnet_gateway.txt
        echo ${mgmt_subnet_gateway} > /config/mgmt_subnet_gateway.txt

        echo ${int_subnet_cidr_range} > /config/int_subnet_cidr_range.txt
        echo ${ext_subnet_cidr_range} > /config/ext_subnet_cidr_range.txt
        echo ${mgmt_subnet_cidr_range} > /config/mgmt_subnet_cidr_range.txt

        chmod +w /config/startup
        chmod +x /config/post-nic-swap.sh
        echo "/config/post-nic-swap.sh" >> /config/startup

        /usr/bin/setdb provision.managementeth eth1
        tmsh save /sys config
        reboot
    fi
EOF

chmod 755 /config/first-run.sh
nohup /config/first-run.sh &

/bin/curl -L -o /tmp/hello-world-0.1.0-0001.noarch.rpm https://github.com/f5devcentral/f5-ilx-example/releases/download/v1.0.0/hello-world-0.1.0-0001.noarch.rpm
mkdir -p /var/config/rest/downloads
cp /tmp/hello-world-0.1.0-0001.noarch.rpm /var/config/rest/downloads/hello-world-0.1.0-0001.noarch.rpm

cat << 'EOF' > /config/onboard_config.yaml
---
controls:
  logLevel: silly
  logFilename: /var/log/cloud/bigIpRuntimeInit-test.log
  logToJson: true
  extensionInstallDelayInMs: 6000
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
        type: SecretsManager
        environment: gcp
        version: latest
        secretId: secret-01-${deployment_id}
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
          unwrap: false
  - name: SECOND_PASS
    type: secret
    secretProvider:
      type: Vault
      environment: hashicorp
      vaultServer: vault_server_public_http
      secretsEngine: kv2
      secretPath: kv/data/credential
      field: data
      version: "1"
      authBackend:
        type: approle
        roleId:
          type: inline
          value: vault_app_role
        secretId:
          type: inline
          value: vault_wrapped_secret_id
          unwrap: true
  - name: INSTANCE_ID
    type: url
    value: http://169.254.169.254/computeMetadata/v1/instance/id
    headers:
        - name: Metadata-Flavor
          value: Google
  - name: HOST_NAME
    type: metadata
    returnType: string
    metadataProvider:
        environment: gcp
        type: compute
        field: name
  - name: SELF_IP_INTERNAL
    type: metadata
    returnType: string
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
  - name: SELF_IP_EXTERNAL_ADDRESS
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 0
        ipcalc: address
  - name: GATEWAY
    type: metadata
    metadataProvider:
        environment: gcp
        type: network
        field: ip
        index: 0
        ipcalc: first
bigip_ready_enabled:
  - name: provision_modules
    type: inline
    commands:
      - tmsh modify sys provision asm level nominal
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
  - name: save_sys_config
    type: inline
    commands:
      - tmsh save sys config
pre_onboard_enabled:
  - name: example_inline_command
    type: inline
    commands:
      - touch /tmp/pre_onboard_script.sh
      - chmod 777 /tmp/pre_onboard_script.sh
      - echo "touch /tmp/created_by_autogenerated_pre_local" > /tmp/pre_onboard_script.sh
  - name: example_local_exec
    type: file
    commands:
      - /tmp/pre_onboard_script.sh
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
      extensionVersion: 1.23.0
    - extensionType: as3
      extensionVersion: 3.30.0
      verifyTls: false
      extensionUrl: https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.30.0/f5-appsvcs-3.30.0-5.noarch.rpm
      extensionHash: 47cc7bb6962caf356716e7596448336302d1d977715b6147a74a142dc43b391b
    - extensionType: fast
      extensionVersion: 1.11.0
    - extensionType: ilx
      extensionUrl: file:///var/config/rest/downloads/hello-world-0.1.0-0001.noarch.rpm
      extensionVerificationEndpoint: /mgmt/shared/echo
      extensionVersion: 0.1.0
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
          hostname: '{{{ HOST_NAME }}}.test'
          myProvisioning:
            class: Provision
            ltm: nominal
            asm: nominal
          admin:
            class: User
            userType: regular
            password: '{{ ADMIN_PASS }}'
            shell: bash
          vaultadmin:
            class: User
            userType: regular
            password: '{{ ROOT_PASS }}'
            shell: bash
          vaultadmin2:
            class: User
            userType: regular
            password: '{{ SECOND_PASS.bigiq_admin_password }}'
            shell: bash
            partitionAccess:
              all-partitions:
                role: admin
          dbvars:
            class: DbVariables
            provision.extramb: 500
            restjavad.useextramb: true
    - extensionType: as3
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_as3.json
post_hook:
  - name: example_webhook
    type: webhook
    url: https://postman-echo.com/post
    properties:
      optionalKey1: optional_value1
      optionalKey2: optional_value2
