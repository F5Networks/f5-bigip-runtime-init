#!/usr/bin/env bash

checks=0
exitCode=1
while [ $checks -lt 120 ];
do
    response=$(sshpass -p ${PASSWORD} ssh -o StrictHostKeyChecking=no -o ConnectionAttempts=120 ${USERNAME}@${MGMT_IP} "bash --version")
    if [[ ! -z $response ]]; then
        echo 'BIGIP is ready to accept bash commands. Continue installation...'
        exitCode=0
        break
    else
        echo 'BIGIP is not ready to accept bash commands'
        exitCode=1
        ((checks=checks+1))
    fi
 done

echo "verify_bash_availability: exitCode: $exitCode"
exit $exitCode
