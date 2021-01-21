#!/usr/bin/env bash
# usage: ./ssh_to_instance.sh

INSTANCE_TO_USE=${1:-primary}
PATH_TO_DEPLOYMENT_INFO='deployment_info.json'

INSTANCES=$(cat $PATH_TO_DEPLOYMENT_INFO | jq .instances -r)
USERNAME=$(echo $INSTANCES | jq '.[0] | .admin_username' -r)
PASSWORD=$(echo $INSTANCES | jq '.[0] | .admin_password' -r)
HOST=$(echo $INSTANCES | jq '.[0] | .mgmt_address' -r)
sshpass -p $PASSWORD ssh -o "StrictHostKeyChecking no" ${USERNAME}@${HOST}
