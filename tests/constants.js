/**
 * Copyright 2020 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const path = require('path');
const PKG_JSON = require('../package.json');


/**
 * Constants used across two or more files
 *
 * @module
 */
module.exports = {
    PKG_NAME: PKG_JSON.name,
    PKG_VERSION: PKG_JSON.version,
    PKG_MIN_VERSION: '0.0.1',
    ARTIFACTS_LOGS_DIR: path.join(process.cwd(), 'logs'),
    REQUEST: {
        PORT: 443,
        PROTOCOL: 'https'
    },
    PACKAGES_URI: {
        as3: '/mgmt/shared/appsvcs/declare',
        do: '/mgmt/shared/declarative-onboarding/inspect'
    },
    DEPLOYMENT_FILE_VAR: 'BIGIP_RUNTIME_INIT_DEPLOYMENT_FILE',
    DEPLOYMENT_FILE: 'deployment_info.json',
    DECLARATION_FILE: 'f5-bigip-runtime-declaration.yaml',
    DECLARATION_FILE_VAR: 'BIGIP_RUNTIME_INIT_DECLARATION_FILE',
    AT_PACKAGES_METADATA_URI: 'https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json',
    RETRIES: {
        LONG: 500,
        MEDIUM: 100,
        SHORT: 10
    },
    LOG_LEVELS: {
        silly: 0,
        verbose: 1,
        debug: 2,
        info: 3,
        warning: 4,
        error: 5
    }
};
