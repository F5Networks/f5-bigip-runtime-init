#!/bin/bash

# disable 1nic auto configuration
/usr/bin/setdb provision.1nicautoconfig disable

# wait for mcpd ready before attempting any tmsh command(s)
source /usr/lib/bigstart/bigip-ready-functions
wait_bigip_ready

# create user
tmsh create auth user ${admin_username} password ${admin_password} shell tmsh partition-access replace-all-with { all-partitions { role admin } }

# save config
tmsh save sys config

/bin/curl -L -o /tmp/hello-world-0.1.0-0001.noarch.rpm https://github.com/f5devcentral/f5-ilx-example/releases/download/v1.0.0/hello-world-0.1.0-0001.noarch.rpm

mkdir -p /var/config/rest/downloads
cp /tmp/hello-world-0.1.0-0001.noarch.rpm /var/config/rest/downloads/hello-world-0.1.0-0001.noarch.rpm

mkdir /config/cloud

cat << 'EOF' > /config/cloud/onboard_config.yaml
---
controls:
  logLevel: silly
  logFilename: /var/log/cloud/bigIpRuntimeInit-test.log
  logToJson: true
  extensionInstallDelayInMs: 6000
runtime_parameters:
  - name: REGION
    type: url
    value: http://169.254.169.254/latest/dynamic/instance-identity/document
    query: region
    headers:
      - name: Content-Type
        value: json
      - name: User-Agent
        value: func-test
      - name: X-aws-ec2-metadata-token
        value: "{{{AWS_SESSION_TOKEN}}}"
  - name: AWS_SESSION_TOKEN
    type: url
    value: http://169.254.169.254/latest/api/token
    headers:
      - name: Content-Type
        value: json
      - name: User-Agent
        value: func-test
      - name: method
        value: PUT
      - name: X-aws-ec2-metadata-token-ttl-seconds
        value: 21600
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      environment: aws
      type: SecretsManager
      secretId: ${secret_id}
      version: AWSCURRENT
      field: password
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
  - name: GATEWAY
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: local-ipv4s
      index: 1
      ipcalc: first
  - name: ADDRESS_SIZE
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: local-ipv4s
      index: 1
      ipcalc: size
  - name: DEFAULT_ROUTE
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: subnet-ipv4-cidr-block
      index: 1
  - name: MGMT_ROUTE
    type: metadata
    metadataProvider:
      environment: aws
      type: network
      field: subnet-ipv4-cidr-block
      index: 0
  - name: REGION02
    type: url
    value: http://169.254.169.254/latest/dynamic/instance-identity/document
    query: region
    headers:
      - name: Content-Type
        value: json
      - name: User-Agent
        value: func-test
      - name: X-aws-ec2-metadata-token
        value: "{{{AWS_SESSION_TOKEN}}}"
pre_onboard_enabled:
  - name: provision_rest
    type: inline
    commands:
      - /usr/bin/setdb provision.extramb 500
      - /usr/bin/setdb restjavad.useextramb true
bigip_ready_enabled:
  - name: provision_asm
    type: inline
    commands:
      - tmsh modify sys provision asm level nominal
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
      - https://cdn.f5.com/product/cloudsolutions/templates/f5-aws-cloudformation/examples/scripts/remote_pre_onboard.sh
  - name: save_sys_config
    type: inline
    commands:
      - tmsh save sys config
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
      - https://cdn.f5.com/product/cloudsolutions/templates/f5-aws-cloudformation/examples/scripts/remote_post_onboard.sh
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.23.0
    - extensionType: as3
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
          mySystem:
            class: System
            hostname: '{{ HOST_NAME }}'
            cliInactivityTimeout: 1200
            consoleInactivityTimeout: 1200
            autoPhonehome: false
          myDns:
            class: DNS
            nameServers:
              - 8.8.8.8
          myNtp:
            class: NTP
            servers:
              - 0.pool.ntp.org
            timezone: UTC
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
            partitionAccess:
              all-partitions:
                role: admin
          vaultadmin2:
            class: User
            userType: regular
            password: '{{ SECOND_PASS.bigiq_admin_password }}'
            shell: bash
            partitionAccess:
              all-partitions:
                role: admin
          myProvisioning:
            class: Provision
            ltm: nominal
            asm: nominal
          external:
            class: VLAN
            tag: 4094
            mtu: 1500
            interfaces:
              - name: '1.1'
                tagged: true
          external-self:
            class: SelfIp
            address: '{{{ SELF_IP_EXTERNAL }}}'
            vlan: external
            allowService: default
            trafficGroup: traffic-group-local-only
          dbvars:
            class: DbVariables
            provision.extramb: 500
            restjavad.useextramb: true
    - extensionType: as3
      type: url
      value: https://f5-cft.s3.amazonaws.com/autoscale_as3_aws.json
