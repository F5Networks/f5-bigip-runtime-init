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
import where = require('lodash.where');
import * as utils from '../../utils';

export class AzureCloudClient extends AbstractCloudClient {
    _credentials: ManagedIdentityCredential;
    _metadata: any;
    _keyVaultSecretClient: SecretClient;
    SecretClient = SecretClient;
    constructor(options?: {
        logger?: Logger;
    }) {
        super(constants.CLOUDS.AZURE, options);
    }

    async init(): Promise<void> {
        this._credentials = new ManagedIdentityCredential();
        this._metadata = await this._getInstanceMetadata();
        return Promise.resolve();
    }

    /**
     * Returns accountId/subscriptionId from Azure
     *
     * @returns {String}
     */
    getCustomerId(): string {
        return this._metadata.subscriptionId;
    }

    /**
     * Returns cloud name
     *
     * @returns {String}
     */
    getCloudName(): string {
        return constants.CLOUDS.AZURE;
    }


    _getKeyVaultSecret(vaultUrl: string, secretId: string, version?: string): Promise<KeyVaultSecret> {
        this._keyVaultSecretClient = new this.SecretClient(vaultUrl, this._credentials);
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

    async _getInstanceMetadata(): Promise<string> {
        const response = await utils.retrier(utils.makeRequest, [`http://169.254.169.254/metadata/instance?api-version=2017-08-01`, {
            method: 'GET',
            headers: {
                Metadata: 'true'
            }
        }], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
        });
        return response.body.compute;
    }

    /**
     * Gets value for VM tag
     *
     * @param key                           - Tag key name
     *
     * @returns {Promise}
     */
    getTagValue(key: string):  Promise<string> {
        let tagValue = '';
        if (this._metadata.tags && this._metadata.tags.indexOf(key) !== - 1) {
            this._metadata.tags.split(";").forEach((tag) => {
                if (tag.indexOf(key) !== -1) {
                    if (tag.split(':')[0] === key) {
                        tagValue=tag.split(':')[1]
                    }
                }
            });
        }
        return Promise.resolve(tagValue);
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
        const logger = Logger.getLogger();

        if (!field) {
            throw new Error('Azure Cloud Client metadata field is missing');
        }

        if (!type) {
            throw new Error('Azure Cloud Client metadata type is missing');
        }

        if (type !== 'compute' && type !== 'network') {
            throw new Error('Azure Cloud Client metadata type is unknown. Must be one of [ compute, network ]');
        }

        if (type === 'network' && index === undefined) {
            throw new Error('Azure Cloud Client network metadata index is missing');
        }

        let instanceName: string;
        let result: string;
        let ipAddress: string;
        let prefix: string;

        const response = await utils.retrier(utils.makeRequest, [`http://169.254.169.254/metadata/instance/${type}?api-version=2017-08-01`, {
            method: 'GET',
            headers: {
                Metadata: 'true'
            }
        }], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
        });

        if (type === 'compute') {
            if (field === 'name') {
                instanceName = response.body[field];
                result = instanceName.replace(/_/g, '-');
            } else {
                result = response.body[field];
            }
        } else if (type === 'network') {
            /** grab big-ip interface info */
            let mac;
            let retries = 0;
            const timer = ms => new Promise(res => setTimeout(res, ms)); /* eslint-disable-line @typescript-eslint/explicit-function-return-type */
            while (true) {
                const interfaceResponse = await utils.makeRequest(
                    `http://localhost:8100/mgmt/tm/net/interface`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Basic ${utils.base64('encode', 'admin:admin')}`
                        },
                        verifyTls: false
                    }
                );
                logger.silly(`Interface Response:  ${utils.stringify(interfaceResponse)}`);
                const interfaceName = index === 0 ? 'mgmt' : `1.${index}`;
                logger.info('Interface:' + interfaceName );
                const interfaces = interfaceResponse.body.items;
                const filtered = where(interfaces, { "name": interfaceName });
                logger.silly(`filtered:  ${utils.stringify(filtered)}`);
                mac = filtered[0]["macAddress"];
                if (mac !== 'none') {
                    logger.info('MAC address found for ' + interfaceName + ': ' + mac);
                    break;
                } else {
                    retries++;
                    if (retries > constants.RETRY.DEFAULT_COUNT) {
                        return Promise.reject(new Error(`Failed to fetch MAC address for BIGIP interface ${interfaceName}.`))
                    }
                    logger.info(`MAC adddress is not populated on ${interfaceName} BIGIP interface. Trying to re-fetch interface data. Left attempts: ${constants.RETRY.DEFAULT_COUNT - retries}`);
                    await timer(constants.RETRY.DELAY_IN_MS);
                }
            }

            const localMac = mac.toLowerCase().replace(/:/g, '');
            const interfaces = response.body.interface;

            for (let i = 0; i < interfaces.length; i += 1) {
                const metadataMac = interfaces[i]["macAddress"].toLowerCase();
                if (localMac === metadataMac) {
                    logger.info(`Local interface ${index} MAC address ${localMac} matches Azure network interface ${i} MAC address ${metadataMac}`);
                    ipAddress = interfaces[i][field].ipAddress[0].privateIpAddress;
                    prefix = interfaces[i][field].subnet[0].prefix;
                    result = `${ipAddress}/${prefix}`;
                    break;
                }
            }
        }
        if (!(result)) {
            throw new Error('Could not get value from Azure metadata.');
        }
        return result;
    }

    /**
     * Returns cloud region name
     *
     * @returns {String}
     */
    getRegion(): string {
        return this._metadata.location;
    }

}
