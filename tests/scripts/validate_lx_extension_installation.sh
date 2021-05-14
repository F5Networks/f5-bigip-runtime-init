#!/usr/bin/env bash

echo "$(date "+%Y-%m-%dT%H:%M:%S") - Starting test"

COUNT=0

echo "$(date "+%Y-%m-%dT%H:%M:%S") - PHASE #1: Preparation"

mkdir -p /var/lib/cloud/icontrollx_installs/
echo "$(date "+%Y-%m-%dT%H:%M:%S") - Downloading LX Extensions RPMs"
echo "$(date "+%Y-%m-%dT%H:%M:%S") - Downloading AS3 for local installation"
curl  -sk -L -o /var/lib/cloud/icontrollx_installs/f5-appsvcs-3.27.0-3.noarch.rpm https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.27.0/f5-appsvcs-3.27.0-3.noarch.rpm
chmod +x /var/lib/cloud/icontrollx_installs/f5-appsvcs-3.27.0-3.noarch.rpm

echo "$(date "+%Y-%m-%dT%H:%M:%S") - Downloading DO for local installation"
curl -sk -L -o /var/lib/cloud/icontrollx_installs/f5-declarative-onboarding-1.20.0-2.noarch.rpm https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.20.0/f5-declarative-onboarding-1.20.0-2.noarch.rpm
chmod +x /var/lib/cloud/icontrollx_installs/f5-declarative-onboarding-1.20.0-2.noarch.rpm

echo "$(date "+%Y-%m-%dT%H:%M:%S") - Downloading FAST for local installation"
curl -sk -L -o /var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.8.1-1.noarch.rpm https://github.com/F5Networks/f5-appsvcs-templates/releases/download/v1.8.1/f5-appsvcs-templates-1.8.1-1.noarch.rpm
chmod +x /var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.8.1-1.noarch.rpm

echo "$(date "+%Y-%m-%dT%H:%M:%S") - Downloading TS for local installation"
curl -sk -L -o /var/lib/cloud/icontrollx_installs/f5-telemetry-1.19.0-3.noarch.rpm https://github.com/F5Networks/f5-telemetry-streaming/releases/download/v1.19.0/f5-telemetry-1.19.0-3.noarch.rpm
chmod +x /var/lib/cloud/icontrollx_installs/f5-telemetry-1.19.0-3.noarch.rpm

echo "$(date "+%Y-%m-%dT%H:%M:%S") - Starting while loop..."

while true;
do
	((COUNT=COUNT+1))
	echo "$(date "+%Y-%m-%dT%H:%M:%S") - Test attempt : $COUNT"

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - PHASE #2: Unistalling all available packages..."
	installed_packages=$(curl -sk -u admin: http://localhost:8100/mgmt/shared/iapp/global-installed-packages | jq .items[].packageName)
	echo "$(date "+%Y-%m-%dT%H:%M:%S") - Packages for un-installation: ${installed_packages}"
	for packageName in $installed_packages
	do
	  echo "$(date "+%Y-%m-%dT%H:%M:%S") - Uninstalling package ${packageName}"
	  echo $(curl -H "Content-Type: application/json" -sk -u admin: -X POST -d "{'operation': 'UNINSTALL','packageName': ${packageName}}" http://localhost:8100/mgmt/shared/iapp/package-management-tasks | jq .)
	done
	echo "$(date "+%Y-%m-%dT%H:%M:%S") - Finished un-install. Sleeping for 60 seconds."
	sleep 60

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - PHASE #3: Installing LX extensions..."

	curl -sk -u admin: -d '{"operation": "INSTALL","packageFilePath": "/var/lib/cloud/icontrollx_installs/f5-declarative-onboarding-1.20.0-2.noarch.rpm"}' http://localhost:8100/mgmt/shared/iapp/package-management-tasks
    sleep 15
	curl -sk -u admin: -d '{"operation": "INSTALL","packageFilePath": "/var/lib/cloud/icontrollx_installs/f5-appsvcs-3.27.0-3.noarch.rpm"}' http://localhost:8100/mgmt/shared/iapp/package-management-tasks
    sleep 15
	curl -sk -u admin: -d '{"operation": "INSTALL","packageFilePath": "/var/lib/cloud/icontrollx_installs/f5-telemetry-1.19.0-3.noarch.rpm"}' http://localhost:8100/mgmt/shared/iapp/package-management-tasks
    sleep 15
	curl -sk -u admin: -d '{"operation": "INSTALL","packageFilePath": "/var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.8.1-1.noarch.rpm"}' http://localhost:8100/mgmt/shared/iapp/package-management-tasks
	echo "$(date "+%Y-%m-%dT%H:%M:%S") - Finished LX Extension installation"

    echo "$(date "+%Y-%m-%dT%H:%M:%S") - Sleeping for 30 seconds"
	sleep 30

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - PHASE #4: Validating restnoded logs before BIGIP restart"

	response=$(egrep '(Startup Failed|Failed to complete|failed to register)' /var/log/restnoded/restnoded.log)
	echo "$(date "+%Y-%m-%dT%H:%M:%S") - RESPONSE FROM RESTNODED LOG GREP: $response"
	if [[ ! -z $response ]]; then
		echo "$(date "+%Y-%m-%dT%H:%M:%S") - Got repro before restart... Checking extensions availability"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/declarative-onboarding/info | jq .)
		echo "DO ext RESPONSE: $response"
		response="FOO"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/appsvcs/info | jq .)
		echo "AS3 ext RESPONSE: $response"
		response="FOO"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/telemetry/info | jq .)
		echo "TS ext RESPONSE: $response"
		response="FOO"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/fast/info | jq .)
		echo "FAST ext RESPONSE: $response"
		break;
	fi

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - Sleeping for 60 seconds"
	sleep 60

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - PHASE #5: Restarting BIGIP"
	bigstart restart

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - Sleeping for 60 seconds..."
	sleep 60

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - PHASE #6: Validating restnoded logs after BIGIP restart"

	response=$(egrep '(Startup Failed|Failed to complete|failed to register)' /var/log/restnoded/restnoded.log)
	echo "$(date "+%Y-%m-%dT%H:%M:%S") - RESPONSE FROM RESTNODED LOG GREP: $response"

	if [[ ! -z $response ]]; then
		echo "$(date "+%Y-%m-%dT%H:%M:%S") - Got repro after restart... Checking extensions availability"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/declarative-onboarding/info | jq .)
		echo "DO ext RESPONSE: $response"
		response="FOO"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/appsvcs/info | jq .)
		echo "AS3 ext RESPONSE: $response"
		response="FOO"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/telemetry/info | jq .)
		echo "TS ext RESPONSE: $response"
		response="FOO"
		response=$(curl -s -u admin: http://localhost:8100/mgmt/shared/fast/info | jq .)
		echo "FAST ext RESPONSE: $response"
		break;
	fi

	echo "$(date "+%Y-%m-%dT%H:%M:%S") - No repro this time. Continue...."
done;
