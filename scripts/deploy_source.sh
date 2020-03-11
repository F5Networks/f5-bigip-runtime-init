#!/usr/bin/env bash

PATH_TO_DEPLOYMENT_INFO=${1:-deployment_info.json}
PATH_TO_DEPLOY_TO_SRC=${2}
INSTANCES=$(cat $PATH_TO_DEPLOYMENT_INFO | jq .instances -r)

FIRST_IP=$(echo $INSTANCES | jq '.[] | .mgmt_address' -r)
USERNAME=$(echo $INSTANCES | jq '.[] | .admin_username' -r)
PASSWORD=$(echo $INSTANCES | jq '.[] | .admin_password' -r)

for HOST in ${FIRST_IP}; do
	echo "IP: ${HOST} USER: ${USERNAME} PASSWORD: ${PASSWORD}"PATH_TO_DEPLOY_TO
	echo "PATH TO DEST SRC: ${PATH_TO_DEPLOY_TO_SRC}"
    sshpass -p $PASSWORD scp -r src/* ${USERNAME}@${HOST}:${PATH_TO_DEPLOY_TO_SRC}
    sshpass -p $PASSWORD ssh -o "StrictHostKeyChecking no" ${USERNAME}@${HOST} 'bigstart restart restnoded'
    echo "done with ${HOST}"
done

echo "script execution completed"
