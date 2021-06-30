#!/usr/bin/env bash
# Copyright 2020 F5 Networks, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

CLOUD="base"
SUPPORTED_CLOUDS=(aws azure gcp all base)
GPG_PUB_KEY_LOCATION="https://f5-cft.s3.amazonaws.com/f5-bigip-runtime-init/gpg.key"
TOOLCHAIN_METADATA_FILE_URL="https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json"
SKIP_VERIFICATION=""

# usage: logger "log message"
logger() {
    echo "$(date "+%Y-%m-%dT%H:%M:%S") - ${1}"
}

# Retries settings for making https requests using curl command line tool
RETRY=${HTTP_RETRY:-3}
RETRY_MAX_TIME=${HTTP_RETRY_MAX_TIME:-180}
MAX_TIME=${HTTP_MAX_TIME:-5}
RETRY_DELAY=${HTTP_RETRY_DELAY:-60}

logger "HTTP Retry Settings:"
logger "RETRY: $RETRY"
logger "RETRY_MAX_TIME: $RETRY_MAX_TIME"
logger "MAX_TIME: $MAX_TIME"
logger "RETRY_DELAY: $RETRY_DELAY"

HELP_MENU()
{
    echo "Usage: $0 [params]"
    echo "params can be one or more of the following:"
    echo "    --cloud | -c                          : Specifies cloud provider name. Allowed values: ( all, aws, azure, or gcp ). When not provided, integrations with Public Clouds (AWS, Azure or/and GCP) are disabled"
    echo "    --key   | -k                          : Provides location for GPG key used for verifying signature on RPM file"
    echo "    --toolchain-metadata-file-url         : Provides overriding delivery url for toolchain extension metadata file"
    echo "    --skip-verify                         : Disables RPM signature verification and AT metadata verification"
    echo "    --skip-toolchain-metadata-sync        : Disables automation toolchains metadata sync"
    echo "    --telemetry-params                    : Specifies telemerty parameters"
    exit 1
}

while true
do
    case "$1" in
    --cloud | -c)
	CLOUD="$2"
        if ! shift 2; then HELP_MENU; exit 1; fi
	;;
    --key | -k)
	GPG_PUB_KEY_LOCATION="$2"
        if ! shift 2; then HELP_MENU; exit 1; fi
	;;
	--toolchain-metadata-file-url )
	TOOLCHAIN_METADATA_FILE_URL="$2"
        if ! shift 2; then HELP_MENU; exit 1; fi
	;;
    --skip-verify)
	SKIP_VERIFICATION=y
	shift
	;;
    --skip-toolchain-metadata-sync)
	SKIP_AT_METADATA_SYNC=y
	shift
	;;
    --telemetry-params)
	TELEMETRY_PARAMS=$2
	shift
	;;
    -h | --help)
	HELP_MENU
	;;
    -*)
	echo Unrecognized flag : "$1"
	HELP_MENU
	;;
    *)
	break
	;;
    esac
done

if [[ ! "${SUPPORTED_CLOUDS[@]}" =~ "${CLOUD}" ]]; then
    logger "--cloud parameter value is not in one of allowed values. Please see help menu for more details"
    HELP_MENU
    exit 1;
fi

NAME="f5-bigip-runtime-init"

# Processing TELEMETRY parameters and storing them into file for future use
rm /config/cloud/telemetry_install_params.tmp  2> /dev/null
for string in $(echo $TELEMETRY_PARAMS | tr ',' '\n')
do
    echo $string >> /config/cloud/telemetry_install_params.tmp
done

rpm_filename=$(ls | grep $CLOUD | grep -v "sha256")
rpm_sha256_filename=$(ls | grep $CLOUD | grep "sha256")
install_location="/tmp/${NAME}"
utility_location="/usr/local/bin/${NAME}"

# usage: platform_check
# returns: LINUX|BIGIP
platform_check() {
    platform="LINUX"
    if [ -f "/VERSION" ]; then
        platform="BIGIP"
    fi
    logger ${platform}
}

logger "Running RPM install script."

logger "Verifying RPM file integrity..."
cat $rpm_sha256_filename | sha256sum -c | grep OK
if [[ $? -ne 0 ]]; then
    logger "Couldn't verify the f5-bigip-runtime-init package, exiting."
    exit 1
fi

if [[ -z $SKIP_VERIFICATION ]]; then
    logger "Verifying signature..."
    logger "GPG PUB Key location: $GPG_PUB_KEY_LOCATION"
    for i in {1..24}; do
        curl --retry-delay $RETRY_DELAY --retry $RETRY --retry-max-time $RETRY_MAX_TIME --max-time $MAX_TIME --location $GPG_PUB_KEY_LOCATION --output /var/tmp/gpg.key && break || sleep 5
    done
    rpm --import /var/tmp/gpg.key
    rpm --checksig $rpm_filename | grep "rsa sha1 (md5) pgp md5 OK"
    if [[ $? -ne 0 ]]; then
        logger "Couldn't verify the f5-bigip-runtime-init package signature"
        exit 1
    fi
else
    logger "Skipping RPM signature verification"
fi

logger "Checking if package is already installed"
if [[ -d $install_location && -f $utility_location && ! -z "$(ls -A $install_location)" ]]; then
    logger "Package is already installed and utility is created. Exiting with status:0"
    exit 0
else
    logger "Package is not installed. Preparing for installation."
    if [[ -d $install_location ]]; then
        logger "Install location $install_location already exists"
        logger "Clearing out install location: $install_location"
        find ${install_location} -type f -delete
        sleep 1
    else
        logger "Install location $install_location does not exist. Creating install location."
        mkdir -p $install_location
    fi
fi

logger "Install package $rpm_filename"
rpm2cpio $rpm_filename | cpio -idmv
mv $NAME-$CLOUD/* /tmp/$NAME

if [[ -z $SKIP_AT_METADATA_SYNC ]]; then
    logger "Getting lastest AT metadata at $TOOLCHAIN_METADATA_FILE_URL"
    touch toolchain_metadata_tmp.json
    # try to get the latest metadata
    for i in {1..24}; do
        curl --retry-delay $RETRY_DELAY --retry $RETRY --retry-max-time $RETRY_MAX_TIME --max-time $MAX_TIME --location $TOOLCHAIN_METADATA_FILE_URL --output toolchain_metadata_tmp.json && break || sleep 5
    done
    cat toolchain_metadata_tmp.json | jq empty > /dev/null 2>&1
    if [[ $? -eq 0 ]]; then
        diff=$(jq -n --slurpfile latest toolchain_metadata_tmp.json --slurpfile current ${install_location}/src/lib/bigip/toolchain/toolchain_metadata.json '$latest != $current')
        if [[ $diff == "true" ]]; then
            cp toolchain_metadata_tmp.json ${install_location}/src/lib/bigip/toolchain/toolchain_metadata.json
        fi

    else
        logger "Couldn't get the latest toolchain metadata, using local copy."
    fi
    rm toolchain_metadata_tmp.json
else
    logger "Skipping verification for AT Metadata, using local copy."
fi

logger "Creating command utility."
if [[ "$(platform_check)" == "LINUX" ]]; then
    echo "node ${install_location}/src/cli.js \"\$@\"" > ${utility_location}
    chmod 744 ${utility_location}
else
    mount -o remount,rw /usr
    echo "f5-rest-node ${install_location}/src/cli.js \"\$@\"" > ${utility_location}
    chmod 744 ${utility_location}
    mount -o remount,ro /usr
fi
logger "RPM installation is completed."
