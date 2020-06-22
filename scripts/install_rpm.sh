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
CLOUD=$1
NAME="f5-bigip-runtime-init"

rpm_filename=$(ls | grep $CLOUD | grep -v "sha256")
rpm_sha256_filename=$(ls | grep $CLOUD | grep "sha256")
install_location="/tmp/${NAME}"

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
echo "Creating install location."
mkdir -p $install_location

echo "Verifying RPM file integraty..."
cat $rpm_sha256_filename | sha256sum -c | grep OK
if [[ $? -ne 0 ]]; then
    echo "Couldn't verify the f5-bigip-runtime-init package, exiting."
    exit 1
fi

echo "Verifying signature..."
curl --location https://ak-metadata-package-poc.s3.amazonaws.com/gpg.key --output /var/tmp/gpg.key
rpm --import /var/tmp/gpg.key
rpm --checksig $rpm_filename | grep "rsa sha1 (md5) pgp md5 OK"
if [[ $? -ne 0 ]]; then
    echo "Couldn't verify the f5-bigip-runtime-init package signature"
    exit 1
fi

echo "Install package $rpm_filename"
rpm2cpio $rpm_filename | cpio -idmv
mv $NAME-$CLOUD/* /tmp/$NAME
echo "Getting lastest AT metadata."
# try to get the latest metadata
curl --location https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json --output toolchain_metadata_tmp.json
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

echo "Creating command utility."
utility_location="/usr/local/bin/${NAME}"
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
