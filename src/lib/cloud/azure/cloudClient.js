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
        this._credentials = {};
        this._keyVaultSecretClient = {};
    }

    init() {
        this._credentials = new ManagedIdentityCredential();
        return Promise.resolve();
    }

    _getKeyVaultSecret(vaultUrl, secretId, docVersion) {
        this._keyVaultSecretClient = new SecretClient(vaultUrl, this._credentials);
        return this._keyVaultSecretClient.getSecret(secretId, { version: docVersion || null });
    }

    /**
     * Gets secret from Azure Key Vault
     *
     * @param {String} secretId                      - secret name
     * @param {Object} [options]                     - function options
     * @param {Object} [options.vaultUrl]            - vault to get secret from (required)
     * @param {Object} [options.documentVersion]     - version of the secret (optional)
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

        const documentVersion = options ? options.documentVersion : undefined;

        return this._getKeyVaultSecret(vaultUrl, secretId, documentVersion)
            .then(result => Promise.resolve(result.value))
            .catch(err => Promise.reject(err));
    }
}

module.exports = {
    CloudClient
};
