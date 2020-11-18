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
SKIP_VERIFICATION=""

HELP_MENU()
{
    echo "Usage: $0 [params]"
    echo "params can be one or more of the following:"
    echo "    --cloud | -c                          : Specifies cloud provider name. Allowed values: ( all, aws, azure, or gcp ). When not provided, integrations with Public Clouds (AWS, Azure or/and GCP) are disabled"
    echo "    --key   | -k                          : Provides location for GPG key used for verifying signature on RPM file"
    echo "    --skip-verify                         : Disables RPM signature verification and AT metadata verification"
    echo "    --skip-toolchain-metadata-sync        : Disables automation toolchains metadata sync"
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
    --skip-verify)
	SKIP_VERIFICATION=y
	shift
	;;
    --skip-toolchain-metadata-sync)
	SKIP_AT_METADATA_SYNC=y
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
    echo "--cloud parameter value is not in one of allowed values. Please see help menu for more details"
    HELP_MENU
    exit 1;
fi

NAME="f5-bigip-runtime-init"

rpm_filename=$(ls | grep $CLOUD | grep -v "sha256")
rpm_sha256_filename=$(ls | grep $CLOUD | grep "sha256")
install_location="/tmp/${NAME}"
utility_location="/usr/local/bin/${NAME}"
# usage: logger "log message"
logger() {
    echo "${1}"
}

# usage: platform_check
# returns: LINUX|BIGIP
platform_check() {
    platform="LINUX"
    if [ -f "/VERSION" ]; then
        platform="BIGIP"
    fi
    echo ${platform}
}

echo "Running RPM install script."

echo "Verifying RPM file integrity..."
cat $rpm_sha256_filename | sha256sum -c | grep OK
if [[ $? -ne 0 ]]; then
    echo "Couldn't verify the f5-bigip-runtime-init package, exiting."
    exit 1
fi

if [[ -z $SKIP_VERIFICATION ]]; then
    echo "Verifying signature..."
    echo "GPG PUB Key location: $GPG_PUB_KEY_LOCATION"
    curl --retry 5 --retry-max-time 25 --max-time 5 --location $GPG_PUB_KEY_LOCATION --output /var/tmp/gpg.key
    rpm --import /var/tmp/gpg.key
    rpm --checksig $rpm_filename | grep "rsa sha1 (md5) pgp md5 OK"
    if [[ $? -ne 0 ]]; then
        echo "Couldn't verify the f5-bigip-runtime-init package signature"
        exit 1
    fi
else
    echo "Skipping RPM signature verification"
fi

echo "Checking if package is already installed"
if [[ -d $install_location && -f $utility_location && ! -z "$(ls -A $install_location)" ]]; then
    echo "Package is already installed and utility is created. Exiting with status:0"
    exit 0
else
    echo "Package is not installed. Preparing for installation."
    if [[ -d $install_location ]]; then
        echo "Install location $install_location already exists"
        echo "Clearing out install location: $install_location"
        find ${install_location} -type f -delete
        sleep 1
    else
        echo "Install location $install_location does not exist. Creating install location."
        mkdir -p $install_location
    fi
fi

echo "Install package $rpm_filename"
rpm2cpio $rpm_filename | cpio -idmv
mv $NAME-$CLOUD/* /tmp/$NAME

if [[ -z $SKIP_AT_METADATA_SYNC ]]; then
    echo "Getting lastest AT metadata."
    # try to get the latest metadata
    curl --retry 5 --retry-max-time 25 --max-time 5 --location https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json --output toolchain_metadata_tmp.json
    cat toolchain_metadata_tmp.json | jq empty > /dev/null 2>&1
    if [[ $? -eq 0 ]]; then
        diff=$(jq -n --slurpfile latest toolchain_metadata_tmp.json --slurpfile current ${install_location}/src/lib/bigip/toolchain/toolchain_metadata.json '$latest != $current')
        if [[ $diff == "true" ]]; then
            cp toolchain_metadata_tmp.json ${install_location}/src/lib/bigip/toolchain/toolchain_metadata.json
            rm toolchain_metadata_tmp.json
        fi
    else
        echo "Couldn't get the latest toolchain metadata, using local copy."
    fi
else
    echo "Skipping verification for AT Metadata, using local copy."
fi

echo "Creating command utility."
if [[ "$(platform_check)" == "LINUX" ]]; then
    echo "node ${install_location}/src/cli.js \"\$@\"" > ${utility_location}
    chmod 744 ${utility_location}
else
    mount -o remount,rw /usr
    echo "f5-rest-node ${install_location}/src/cli.js \"\$@\"" > ${utility_location}
    chmod 744 ${utility_location}
    mount -o remount,ro /usr
fi
echo "RPM installation is completed."
