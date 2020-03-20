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

const { SecretClient } = require('@azure/keyvault-secrets');
const { ManagedIdentityCredential } = require('@azure/identity');

const CLOUDS = require('../../../constants').CLOUDS;
const AbstractCloudClient = require('../abstract/cloudClient.js').AbstractCloudClient;


class CloudClient extends AbstractCloudClient {
    constructor(options) {
        super(CLOUDS.AZURE, options);
        this.credentials = {};
        this.keyVaultSecretClient = {};
    }

    /**
     * See the parent class method for details
     */
    init() {
        this.credentials = new ManagedIdentityCredential();
    }

    /**
     * Gets secret from Azure Kay Vault
     *
     * @param {String} secretId                      - secret name
     * @param {Object} [options]                     - cloud specific metadata for getting secret value
     * @param {Object} [options.vaultUrl]            - vault to get secret from
     * @param {Object} [options.versionInfo]         - version value for secret
     * @param {Object} [options.debug]               - debug option specifically for testing
     *
     * @returns {Promise}
     */
    getSecret(secretId, options) {

        const vaultUrl = options ? options.vaultUrl : undefined;

        if (!vaultUrl) {
            throw new Error('Azure Cloud Client vault url is missing');
        }


        if (!secretId) {
            throw new Error('Azure Cloud Client secret id is missing');
        }

        const versionInfo = options ? options.versionInfo : undefined;

        const debug = options.debug ? options.debug : false;

        if (debug === false) {
            this.keyVaultSecretClient = SecretClient(vaultUrl, this.credentials);
        }

        if (typeof versionInfo === 'undefined') {
            return this.keyVaultSecretClient.getSecret(secretId)
                .promise()
                .then((result) => ({
                                    return Promise.resolve(result);
                                })
                )
                .catch(err => Promise.reject(err));
            }
        else {
            return this.keyVaultSecretClient.getSecret(secretId, {version: versionInfo})
                .promise()
                .then((result) => ({
                                    return Promise.resolve(result);
                                })
                )
                .catch(err => Promise.reject(err));
            }
    }
}

module.exports = {
    CloudClient
};
