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

import * as constants from '../../../constants';
import { AbstractCloudClient } from '../abstract/cloudClient'
import Logger from "../../logger";
import where = require('lodash.where');
import * as utils from '../../utils';
import * as url from 'url';

const metadataRequestOptions: object = {
    method: 'GET',
    port: 80,
    protocol: 'http',
    headers: {
        Metadata: 'true',
        'x-ms-version': '2017-11-09'
    },
    advancedReturn: true,
    continueOnError: true
}

export class AzureCloudClient extends AbstractCloudClient {
    _metadata: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
    constructor(options?: {
        logger?: Logger;
    }) {
        super(constants.CLOUDS.AZURE, options);
    }

    async init(): Promise<void> {
        this._metadata = await this._getInstanceMetadata();
        return Promise.resolve();
    }

    /**
     * Returns accountId/subscriptionId from Azure
     *
     * @returns {String}
     */
    getCustomerId(): string {
        return this._metadata.compute.subscriptionId;
    }

    /**
     * Returns cloud name
     *
     * @returns {String}
     */
    getCloudName(): string {
        return constants.CLOUDS.AZURE;
    }

    async _getKeyVaultSecret(vaultUrl: string, secretId: string, version?: string): Promise<{
        value: string;
    }> {
        const urlObject = url.parse(vaultUrl);
        const authHeaders = await this.getAuthHeaders('https://vault.azure.net');
        const secretRequestOptions = {
            method: 'GET',
            port: 443,
            protocol: urlObject.protocol,
            headers: authHeaders,
            advancedReturn: true,
            continueOnError: true
        };
        let secretPath = `/secrets/${secretId}`;
        if (version && version !== undefined) {
            secretPath = `/secrets/${secretId}/${version}`;
        }

        const response = await utils.retrier(utils.makeRequest, [`${urlObject.hostname}`, `${secretPath}?api-version=7.4`, secretRequestOptions], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.DELAY_IN_MS
        });

        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting secret ${secretId} ${response.code}`));
        }

        return Promise.resolve(response.body);
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
     * Returns instance metadata
     *
     * @returns {String}
     */
    async _getInstanceMetadata(): Promise<string> {
        const response = await utils.retrier(utils.makeRequest, [constants.METADATA_HOST.AZURE, '/metadata/instance?api-version=2017-08-01', metadataRequestOptions], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.DELAY_IN_MS
        });

        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting instance metadata ${response.code}`));
        }

        return Promise.resolve(response.body);
    }

    /**
     * Gets value for VM tag
     *
     * @param key                           - Tag key name
     *
     * @returns {Promise}
     */
    getTagValue(key: string): Promise<string> {
        let tagValue = '';
        if (this._metadata.compute.tags && this._metadata.compute.tags.indexOf(key) !== - 1) {
            this._metadata.compute.tags.split(";").forEach((tag) => {
                if (tag.indexOf(key) !== -1) {
                    if (tag.split(':')[0] === key) {
                        tagValue = tag.split(':')[1]
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
            return Promise.reject(new Error('Azure Cloud Client metadata field is missing'));
        }

        if (!type) {
            return Promise.reject(new Error('Azure Cloud Client metadata type is missing'));
        }

        if (type !== 'compute' && type !== 'network') {
            return Promise.reject(new Error('Azure Cloud Client metadata type is unknown. Must be one of [ compute, network ]'));
        }

        if (type === 'network' && index === undefined) {
            return Promise.reject(new Error('Azure Cloud Client network metadata index is missing'));
        }

        let instanceName: string;
        let result: string;
        let ipAddress: string;
        let prefix: string;

        if (type === 'compute') {
            if (field === 'name') {
                instanceName = this._metadata[type][field];
                result = instanceName.replace(/_/g, '-');
            } else {
                result = this._metadata[type][field];
            }
        } else if (type === 'network') {
            /** grab big-ip interface info */
            let mac;
            let retries = 0;
            const timer = ms => new Promise(res => setTimeout(res, ms)); /* eslint-disable-line @typescript-eslint/explicit-function-return-type */
            while (true) {
                const interfaceResponse = await utils.makeRequest(
                    'localhost', '/mgmt/tm/net/interface',
                    {
                        method: 'GET',
                        port: 8100,
                        protocol: 'http',
                        headers: {
                            Authorization: `Basic ${utils.base64('encode', 'admin:admin')}`
                        },
                        verifyTls: false,
                        advancedReturn: true,
                        continueOnError: true
                    }
                );
                logger.silly(`Interface Response:  ${utils.stringify(interfaceResponse)}`);
                const interfaceName = index === 0 ? 'mgmt' : `1.${index}`;
                logger.info('Interface:' + interfaceName);
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
            const interfaces = this._metadata.network.interface;

            for (let i = 0; i < interfaces.length; i += 1) {
                const metadataMac = interfaces[i]["macAddress"].toLowerCase();
                if (localMac === metadataMac) {
                    logger.info(`Local interface ${index} MAC address ${localMac} matches Azure network interface ${i} MAC address ${metadataMac}`);
                    ipAddress = interfaces[i][field].ipAddress[0].privateIpAddress;
                    if (field.toLowerCase() === 'ipv6') {
                        /** Azure does not return subnet prefix for IPv6 */
                        result = `${ipAddress}`;
                    } else {
                        prefix = interfaces[i][field].subnet[0].prefix;
                        result = `${ipAddress}/${prefix}`;
                    }
                    break;
                }
            }
        }
        if (!(result)) {
            return Promise.reject(new Error('Could not get value from Azure metadata.'));
        }
        return result;
    }

    /**
     * Returns cloud region name
     *
     * @returns {String}
     */
    getRegion(): string {
        return this._metadata.compute.location;
    }

    /**
     * Get API request auth headers
     * 
     * @param resource - Optional resource scope for Azure
     *
     * @returns {object} A promise which is resolved with auth headers
     *
     */
    async getAuthHeaders(resource?: string): Promise<object> {
        const encodedResource = encodeURIComponent(resource);
        const response = await utils.retrier(utils.makeRequest, [constants.METADATA_HOST.AZURE, `/metadata/identity/oauth2/token?api-version=2018-02-01&resource=${encodedResource}`, metadataRequestOptions], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.DELAY_IN_MS
        });

        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting token ${response.code}`));
        }

        const headers = {
            'Authorization': `Bearer ${response.body.access_token}`,
            'x-ms-version': '2017-11-09'
        };

        return Promise.resolve(headers);
    }
}
