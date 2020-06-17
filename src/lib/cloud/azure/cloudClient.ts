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

import {KeyVaultSecret, SecretClient} from '@azure/keyvault-secrets';
import { ManagedIdentityCredential } from '@azure/identity';
import * as constants from '../../../constants';
import { AbstractCloudClient } from '../abstract/cloudClient'
import Logger from "../../logger";
import * as utils from '../../utils';

export class AzureCloudClient extends AbstractCloudClient {
    _credentials: ManagedIdentityCredential;
    _keyVaultSecretClient: SecretClient;
    constructor(options?: {
        logger?: Logger;
    }) {
        super(constants.CLOUDS.AZURE, options);
    }

    init(): Promise<void> {
        this._credentials = new ManagedIdentityCredential();
        return Promise.resolve();
    }

    _getKeyVaultSecret(vaultUrl: string, secretId: string, version?: string): Promise<KeyVaultSecret> {
        this._keyVaultSecretClient = new SecretClient(vaultUrl, this._credentials);
        return this._keyVaultSecretClient.getSecret(secretId, { version: version || null });
    }

    /**
     * Gets secret from Azure Key Vault
     *
     * @param secretId                      - secret name
     * @param [options]                     - function options
     * @param [options.vaultUrl]            - vault to get secret from (required)
     * @param [options.version]     - version of the secret (optional)
     *
     * @returns {Promise}
     */
    getSecret(secretId: string, options?: {
        version?: string;
        vaultUrl?: string;
    }): Promise<string> {
        const version = options ? options.version : undefined;
        const vaultUrl = options ? options.vaultUrl : undefined;

        if (!secretId) {
            throw new Error('Azure Cloud Client secret id is missing');
        }

        if (!vaultUrl) {
            throw new Error('Azure Cloud Client vault url is missing');
        }

        return this._getKeyVaultSecret(vaultUrl, secretId, version)
            .then(result => Promise.resolve(result.value))
            .catch(err => Promise.reject(err));
    }

    /**
     * Gets value from Azure metadata
     *
     * @param field                         - metadata property to fetch
     * @param [options]                     - function options
     *
     * @returns {Promise}
     */
    async getMetadata(field: string, options?: {
        type?: string;
        index?: number;
    }): Promise<string> {
        const type = options ? options.type : undefined;
        const index = options ? options.index : undefined;

        if (!field) {
            throw new Error('Azure Cloud Client metadata field is missing');
        }

        if (!type) {
            throw new Error('Azure Cloud Client metadata type is missing');
        }

        if (type != 'compute' && type != 'network') {
            throw new Error('Azure Cloud Client metadata type is unknown. Must be one of [ compute, network ]');
        }

        if (type === 'network' && !index) {
            throw new Error('Azure Cloud Client network metadata index is missing');
        }

        let instanceName: string;
        let result: string;
        let ipAddress: string;
        let prefix: string;

        const response = await utils.makeRequest(
            `http://169.254.169.254/metadata/instance/${type}?api-version=2017-08-01`,
            {
                method: 'GET',
                headers: {
                    Metadata: 'true'
                }
            }
        );

        if (type === 'compute') {
            if (field === 'name') {
                instanceName = response.body[field];
                result = instanceName.replace('_', '-');
            } else {
                result = response.body[field];
            }
        } else if (type === 'network') {
            ipAddress = response.body.interface[index][field].ipAddress[0].privateIpAddress;
            prefix = response.body.interface[index][field].subnet[0].prefix;
            result = `${ipAddress}/${prefix}`;
        }

        return result;
    }
}