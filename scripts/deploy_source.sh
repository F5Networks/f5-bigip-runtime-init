#!/usr/bin/env bash

# usage examples
# deploy with deployment-info.json
# ./deploy_source.sh -c azure -f cloud_config_install_only.yaml -d deployment-info.json

# deploy with local RPM packages and passing credentials
# ./deploy_source.sh -c azure -r /Users/shimkus/Downloads/RPMs/ -f cloud_config_install_only.yaml -u azureuser -p Pass1word -m mydeployment.westus.cloudapp.azure.com

# deploy with a specific version
# ./deploy_source.sh -c azure -f cloud_config_install_only.yaml -d deployment-info.json -v 0.9.0 -e 1

# deploy skipping build process (for changes to config file, for example)
# ./deploy_source.sh -c azure -f cloud_config_install_only.yaml -u azureuser -p Pass1word -m mydeployment.westus.cloudapp.azure.com -b false

CLOUD='all'
CONFIG_FILE='cloud_config_local.yaml'
VERSION='0.9.0'
RELEASE='1'
BUILD='true'

while getopts d:m:u:p:c:f:r:v:e:b: option
    do case "$option" in
        d) PATH_TO_DEPLOYMENT_INFO=$OPTARG;;
        m) MGMT_IP=$OPTARG;;
        u) USERNAME=$OPTARG;;
        p) PASSWORD=$OPTARG;;
        c) CLOUD=$OPTARG;;
        f) CONFIG_FILE=$OPTARG;;
        r) PATH_TO_RPMS=$OPTARG;;
        v) VERSION=$OPTARG;;
        e) RELEASE=$OPTARG;;
        b) BUILD=$OPTARG;;
    esac
done

if [[ $BUILD == 'true' ]]; then
    npm run build
fi

if [[ -n $PATH_TO_DEPLOYMENT_INFO ]]; then
    MGMT_IP=$(cat ${PATH_TO_DEPLOYMENT_INFO} | jq .instances[].mgmt_address -r)
    USERNAME=$(cat ${PATH_TO_DEPLOYMENT_INFO}| jq .instances[].admin_username -r)
    PASSWORD=$(cat ${PATH_TO_DEPLOYMENT_INFO} | jq .instances[].admin_password -r)
fi

# DO workaround
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "modify sys global-settings mgmt-dhcp disabled"
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "save sys config"

# clean up
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash -c 'rm -rf /tmp/f5-bigip-runtime-init'"

echo "Unistalling all available packages"
installed_packages=$(curl -k -u ${USERNAME}:${PASSWORD} https://${MGMT_IP}/mgmt/shared/iapp/global-installed-packages | jq .items[].packageName)
echo "Packages for un-installation: ${installed_packages}"
for packageName in $installed_packages
do
  echo "Uninstalling package ${packageName}"
  echo $(curl -H "Content-Type: application/json" -k -u $USERNAME:$PASSWORD -X POST -d "{'operation': 'UNINSTALL','packageName': ${packageName}}" https://${MGMT_IP}/mgmt/shared/iapp/package-management-tasks | jq .)
done

# edit scp whitelist
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash -c 'echo /config/cloud/ >> /config/ssh/scp.whitelist'"

if [[ -n $PATH_TO_RPMS ]]; then
    sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash -c 'echo /var/lib/cloud/icontrollx_installs/ >> /config/ssh/scp.whitelist'"
fi

sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash -c 'bigstart restart sshd'"

# copy new
sshpass -p ${PASSWORD} scp -o StrictHostKeyChecking=no dist/f5-bigip-runtime-init-$VERSION-$RELEASE.gz.run $USERNAME@$MGMT_IP:/var/tmp/
sshpass -p ${PASSWORD} scp -o StrictHostKeyChecking=no scripts/config/* ${USERNAME}@${MGMT_IP}:/config/cloud/

if [[ -n $PATH_TO_RPMS ]]; then
    sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash -c 'mkdir -p /var/lib/cloud/icontrollx_installs'"
    sshpass -p ${PASSWORD} scp -o StrictHostKeyChecking=no ${PATH_TO_RPMS}* ${USERNAME}@${MGMT_IP}:/var/lib/cloud/icontrollx_installs/
fi

# install
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no $USERNAME@$MGMT_IP "bash /var/tmp/f5-bigip-runtime-init-$VERSION-$RELEASE.gz.run ${CLOUD}"
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash -c 'bigstart restart restnoded'"
sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no ${USERNAME}@${MGMT_IP} "bash f5-bigip-runtime-init -c /config/cloud/${CONFIG_FILE}"

echo "script execution completed"
