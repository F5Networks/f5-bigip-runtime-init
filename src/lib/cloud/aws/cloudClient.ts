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


import * as AWS from 'aws-sdk';
import * as constants from '../../../constants';
import { AbstractCloudClient } from '../abstract/cloudClient';
import Logger from '../../logger';
import where = require('lodash.where');
import * as utils from '../../utils';
export class AwsCloudClient extends AbstractCloudClient {
    _metadata: AWS.MetadataService;
    secretsManager: AWS.SecretsManager;
    region: string;
    instanceId: string;
    customerId: string;

    constructor(options?: {
        logger?: Logger;
    }) {
        super(constants.CLOUDS.AWS, options);
        this._metadata = new AWS.MetadataService();
    }

    /**
     * See the parent class method for details
     */
    init(): Promise<void> {
        return this._getInstanceIdentityDoc()
            .then((metadata: {
                region: string;
                instanceId: string;
                accountId: string;
            }) => {
                this.customerId = metadata.accountId;
                this.region = metadata.region;
                this.instanceId = metadata.instanceId;
                AWS.config.update({ region: this.region });
                this.secretsManager = new AWS.SecretsManager();
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    }

    getCustomerId(): string {
        return this.accountId;
    }

    getCloudName(): string {
        return constants.CLOUDS.AWS;
    }

    /**
     * Get secret from AWS Secrets Manager
     *
     * @param secret                        - secret name
     * @param [options]                     - cloud specific metadata for getting secret value
     * @param [options.version]             - version stage value for secret
     *
     * @returns                             - secret value
     */
    async getSecret(secretId: string, options?: {
        version?: string;
    }): Promise<string> {
        if (!secretId) {
            throw new Error('AWS Cloud Client secret id is missing');
        }

        const version = options ? options.version : undefined;
        const params = {
            SecretId: secretId,
            VersionStage: version || 'AWSCURRENT'
        };

        const secret = await this.secretsManager.getSecretValue(params).promise().catch((e) => {
            throw new Error(`AWS Cloud returned error: ${e}`);
        });

        if (secret) {
            if (secret.SecretString) {
                return secret.SecretString
            }
        }

        return '';
    }

    /**
     * Gets value from AWS metadata
     *
     * @param field                         - metadata property to fetch
     * @param [options]                     - function options
     *
     * @returns {Promise}
     */
    async getMetadata(field: string, options?: {
        type?: string;
        index?: number;
    }):  Promise<string> {
        const type = options ? options.type : undefined;
        const index = options ? options.index : undefined;
        const logger = Logger.getLogger();

        if (!field) {
            throw new Error('AWS Cloud Client metadata field is missing');
        }

        if (!type) {
            throw new Error('AWS Cloud Client metadata type is missing');
        }

        if (type !== 'compute' && type !== 'network') {
            throw new Error('AWS Cloud Client metadata type is unknown. Must be one of [ compute, network ]');
        }

        if (type === 'network' && index === undefined) {
            throw new Error('AWS Cloud Client network metadata index is missing');
        }
        if (type === 'compute'){
            return this._getInstanceCompute(field)
            .catch(err => Promise.reject(err));
        }
        if (type === 'network') {
            /** grab big-ip interface info */
            let mac;
            let retries = 0;
            const timer = ms => new Promise(res => setTimeout(res, ms));
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
                    logger.info(`MAC adddress is not populated on ${interfaceName} BIGIP interface. Trying to re-fecth interface data. Left attempts: ${constants.RETRY.DEFAULT_COUNT - retries}`);
                    await timer(constants.RETRY.DELAY_IN_MS);
                }
            }
            /** manipulate returned data into ip/mask when field eq local-ipv4s */
            if (field === 'local-ipv4s') {
                const getInstanceNetwork = await this._getInstanceNetwork(field, type, mac)
                .catch(err => Promise.reject(err));
                const primaryIp = getInstanceNetwork.split('\n')[0];
                logger.info('Primary IP for ' + mac + ': ' + primaryIp);
                const cidr = await this._getInstanceNetwork('subnet-ipv4-cidr-block', type, mac)
                .catch(err => Promise.reject(err));
                logger.debug('CIDR block for ' + mac + ': ' + cidr);
                const ipMask = primaryIp + cidr.match(/(\/([0-9]{1,2}))/g);
                logger.info('ip and mask for ' + mac + ': ' + ipMask);
                return ipMask;
            /** manipulate data to form gateway address when field eq subnet-ipv4-cidr-block */
            } else if (field === 'subnet-ipv4-cidr-block') {
                const cidr = await this._getInstanceNetwork('subnet-ipv4-cidr-block', type, mac)
                .catch(err => Promise.reject(err));
                logger.info('CIDR block for ' + mac + ':' + cidr);
                const gateway = cidr.match(/([0-9]{1,3}\.){2}[0-9]{1,3}/g) + '.1';
                logger.info('gateway for ' + mac + ':' + gateway);
                return gateway;
            } else {
                const getInstanceNetwork = await this._getInstanceNetwork(field, type, mac)
                .catch(err => Promise.reject(err));
                logger.info('Field:' + field + 'for' + mac + ':' + getInstanceNetwork);
                return getInstanceNetwork;
            }
        }
    }
    /**
     * Gets instance identity document
     *
     * @returns   - A Promise that will be resolved with the Instance Identity document or
     *                          rejected if an error occurs
     */
    _getInstanceIdentityDoc(): Promise<{
        region: string;
        instanceId: string;
    }> {
        return new Promise((resolve, reject) => {
            const iidPath = '/latest/dynamic/instance-identity/document';
            this._metadata.request(iidPath, (err, data) => {
                if (err) {
                    reject(err);
                }
                resolve(
                    JSON.parse(data)
                );
            });
        });
    }
    /**
     * Gets instance compute type metadata
     * See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-categories.html for available fields
     * Type compute supports all categories with base uri + /field
     *
     * @returns   - A Promise that will be resolved with metadata for the supplied field or
     *                          rejected if an error occurs
     */
    _getInstanceCompute(field: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const iidPath = '/latest/meta-data/' + field;
            this._metadata.request(iidPath, (err, data) => {
                if (err) {
                    reject(err);
                }
                const result = data.replace(/_/g, '-');
                resolve(
                    result
                );
            });
        });
    }
    /**
     * Gets instance network type metadata
     * See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-categories.html for available fields
     * Type network supports all categories with base uri + /network/interfaces/macs/<mac>/ where <mac> is determined by $index
     *
     * @returns   - A Promise that will be resolved with metadata for the supplied network field or
     *                          rejected if an error occurs
     */
    _getInstanceNetwork(field: string, type: string, mac: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const iidPath = '/latest/meta-data/' + type + '/interfaces/macs/' + mac + '/' + field;
            this._metadata.request(iidPath, (err, data) => {
                if (err) {
                    reject(err);
                }
                resolve(
                    data
                );
            });
        });
    }
}
