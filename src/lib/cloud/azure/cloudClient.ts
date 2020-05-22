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

    _getKeyVaultSecret(vaultUrl: string, secretId: string, docVersion?: string): Promise<KeyVaultSecret> {
        this._keyVaultSecretClient = new SecretClient(vaultUrl, this._credentials);
        return this._keyVaultSecretClient.getSecret(secretId, { version: docVersion || null });
    }

    /**
     * Gets secret from Azure Key Vault
     *
     * @param secretId                      - secret name
     * @param [options]                     - function options
     * @param [options.vaultUrl]            - vault to get secret from (required)
     * @param [options.documentVersion]     - version of the secret (optional)
     *
     * @returns                             - resolves promise with secret value
     */
    getSecret(secretId: string, options?: {
        vaultUrl?: string;
        documentVersion?: string;
    }): Promise<string> {
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

