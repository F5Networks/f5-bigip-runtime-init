#!/bin/bash

cat << 'EOF' > /config/onboard_config.yaml
---
runtime_parameters:
  - name: ADMIN_PASS
    type: secret
    secretProvider:
      type: KeyVault
      environment: azure
      vaultUrl: https://testvault-${deployment_id}.vault.azure.net
      secretId: test-azure-admin-secret
  - name: ROOT_PASS
    type: secret
    secretProvider:
      type: KeyVault
      environment: azure
      vaultUrl: https://testvault-${deployment_id}.vault.azure.net
      secretId: test-azure-root-secret
  - name: HOST_NAME
    type: metadata
    metadataProvider:
      environment: azure
      type: compute
      field: name
  - name: SELF_IP_INTERNAL
    type: metadata
    metadataProvider:
      environment: azure
      type: network
      field: ipv4
      index: 1
  - name: SELF_IP_EXTERNAL
    type: metadata
    metadataProvider:
      environment: azure
      type: network
      field: ipv4
      index: 2
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
extension_packages:
  install_operations:
    - extensionType: do
      extensionVersion: 1.10.0
    - extensionType: as3
      extensionVersion: 3.17.0
extension_services:
  service_operations:
    - extensionType: do
      type: url
      value: https://ak-f5-cft.s3-us-west-2.amazonaws.com/azure/do_3nic.json
    - extensionType: as3
      type: url
      value: https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_as3.json
