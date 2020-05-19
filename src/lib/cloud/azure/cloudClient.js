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

const utils = require('../../utils.js');

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

    async _getMetadata(metadataType, metadataField) {
        this._metadataType = metadataType;
        this._metadataField = metadataField;
        let result;
        let ipAddress;
        let prefix;

        const response = await utils.makeRequest(
            `http://169.254.169.254/metadata/instance/${this._metadataType}?api-version=2017-08-01`,
            {
                method: 'GET',
                headers: {
                    Metadata: 'true'
                }
            }
        );

        if (this._metadataType === 'compute') {
            result = response.body[this._metadataField];
        } else if (this._metadataType === 'network') {
            ipAddress = response.body.interface[this._metadataField].ipv4.ipAddress[0].privateIpAddress;
            prefix = response.body.interface[this._metadataField].ipv4.subnet[0].prefix;
            result = `${ipAddress}/${prefix}`;
        } else {
            throw new Error('Runtime parameter metadata type is unknown. Must be one of [ compute, network ]');
        }

        return result;
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

    /**
     * Gets value from Azure metadata
     *
     * @param {String} field                         - metadata property to fetch
     * @param {Object} [options]                     - function options
     *
     * @returns {Promise}
     */
    getMetadata(metadataField, options) {
        const metadataType = options ? options.type : undefined;

        if (!metadataType) {
            throw new Error('Azure Cloud Client metadata type is missing');
        }

        if (!metadataField) {
            throw new Error('Azure Cloud Client metadata field is missing');
        }

        return this._getMetadata(metadataType, metadataField)
            .then(result => Promise.resolve(result))
            .catch(err => Promise.reject(err));
    }
}

module.exports = {
    CloudClient
};
