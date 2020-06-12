#!/usr/bin/env bash

CLOUD=$1

# Building package
npm run build

# Collection all deployment info
MGMT_IP=$(cat deployment_info.json | jq .instances[].mgmt_address -r)
USERNAME=$(cat deployment_info.json | jq .instances[].admin_username -r)
PASSWORD=$(cat deployment_info.json | jq .instances[].admin_password -r)
DEPLOYMENT_ID=$(cat deployment_info.json | jq .deploymentId -r)

# Display deployment data
echo "CLOUD: $CLOUD"
echo "MGMT_IP: $MGMT_IP"
echo "USERNAME: $USERNAME"
echo "PASSWORD: $PASSWORD"
echo "DEMPLOYMENT_ID: $DEPLOYMENT_ID"


echo "Starting deployment..."

echo "Cleanup BIGIP"
echo "Delete installed f5-bigip-runtime-init"
sshpass -p $PASSWORD ssh -o StrictHostKeyChecking=no $USERNAME@$MGMT_IP "bash -c 'rm -rf /tmp/f5-bigip-runtime-init/'"
echo "Unistalling all available packages"
installed_packages=$(curl -k -u $USERNAME:$PASSWORD https://$MGMT_IP/mgmt/shared/iapp/global-installed-packages | jq .items[].packageName)
echo "Packages for un-installation: ${installed_packages}"
for packageName in $installed_packages
do
  echo "Uninstalling package ${packageName}"
  echo $(curl -H "Content-Type: application/json" -k -u $USERNAME:$PASSWORD -X POST -d "{'operation': 'UNINSTALL','packageName': ${packageName}}" https://$MGMT_IP/mgmt/shared/iapp/package-management-tasks | jq .)
done
echo "Disalbing MGMT DHCP"
# dhcp must be disalbe to workaround DO bug https://github.com/F5Networks/f5-declarative-onboarding/issues/129
sshpass -p $PASSWORD ssh -o StrictHostKeyChecking=no $USERNAME@$MGMT_IP "modify sys global-settings mgmt-dhcp disabled"
sshpass -p $PASSWORD ssh -o StrictHostKeyChecking=no $USERNAME@$MGMT_IP "save sys config"
# end of workaround

echo "Copying over source code"
# Copying over source code of f5-bigip-runitme-init. installing and initializing
sshpass -p $PASSWORD scp -o StrictHostKeyChecking=no dist/${CLOUD}/f5-bigip-runtime-init-${CLOUD}.tar.gz $USERNAME@$MGMT_IP:/var/tmp/
sshpass -p $PASSWORD scp -o StrictHostKeyChecking=no dist/${CLOUD}/f5-bigip-runtime-init-${CLOUD}.tar.gz.sha256 $USERNAME@$MGMT_IP:/var/tmp/
sshpass -p $PASSWORD scp -o StrictHostKeyChecking=no scripts/local_install.sh $USERNAME@$MGMT_IP:/var/tmp/
echo "Installing f5-bigip-runtime-init"
sshpass -p $PASSWORD ssh -o StrictHostKeyChecking=no $USERNAME@$MGMT_IP "bash /var/tmp/local_install.sh ${CLOUD}"
echo "Executing f5-bigip-runtime-init"
sshpass -p $PASSWORD ssh -o StrictHostKeyChecking=no $USERNAME@$MGMT_IP "bash f5-bigip-runtime-init -c /config/cloud/onboard_config.yaml"
echo "Deployment completed"


