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

# catch 22, don't have package.json during remote install
#
# MAINDIR="$(dirname $0)/.."
# NAME=$(cat ${MAINDIR}/package.json | jq .name -r)
# VERSION=$(cat ${MAINDIR}/package.json | jq .version -r)
#
# TODO: figure out alternate mechanism to avoid version drift

NAME="f5-cloud-onboarder"
VERSION="0.9.0"

# usage: logger "log message"
logger() {
    echo "${1}"
}

logger "Package name: ${NAME}"
logger "Package version: ${VERSION}"

download_location="/tmp/${NAME}.tar.gz"
install_location="/tmp/${NAME}"

mkdir -p ${install_location}

# determine environment we are in

# install package
# - f5-cloud-onboarder-azure
# - f5-cloud-onboarder-aws
# - f5-cloud-onboarder-gcp

curl --location https://github.com/jsevedge/${NAME}/releases/download/v${VERSION}/${NAME}.tar.gz --output ${download_location}
tar xvfz ${download_location} --directory ${install_location}

# create alias - this will only work for this session
alias f5-onboarder="node ${install_location}/src/index.js"