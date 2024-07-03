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

import * as jmesPath from 'jmespath';
import * as aws4 from 'aws4';
import * as constants from '../../../constants';
import * as netmask from 'netmask';
import { AbstractCloudClient } from '../abstract/cloudClient';
import Logger from '../../logger';
import where = require('lodash.where');
import * as utils from '../../utils';
import * as xml2js from 'xml2js';

const metadataRequestOptions: object = {
    method: 'GET',
    port: 80,
    protocol: 'http',
    headers: {},
    verifyTls: false,
    advancedReturn: true,
    continueOnError: true
}
export class AwsCloudClient extends AbstractCloudClient {
    region: string;
    instanceId: string;
    customerId: string;
    _sessionToken: string;
    constructor(options?: {
        logger?: Logger;
    }) {
        super(constants.CLOUDS.AWS, options);
    }

    /**
     * See the parent class method for details
     */
    init(): Promise<void> {
        return this._fetchMetadataSessionToken()
            .then((token) => {
                this._sessionToken = token;
                metadataRequestOptions['headers']['x-aws-ec2-metadata-token'] = this._sessionToken;
                return this._getInstanceIdentityDoc()
            })
            .then((metadata: {
                region: string;
                instanceId: string;
                accountId: string;
            }) => {
                this.customerId = metadata.accountId;
                this.region = metadata.region;
                this.instanceId = metadata.instanceId;
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    }

    getCustomerId(): string {
        return this.customerId;
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

        const fullyQualifiedSecret = new RegExp('^arn:(aws|aws-cn|aws-us-gov):secretsmanager:(us(-gov)?|ap|ca|cn|eu|sa|il|me)-(central|(north|south)?(east|west)?(northeast|southeast)?)-\\d:\\d{12}:secret:[a-zA-Z0-9/_+=.@-]{1,512}$');
        const simpleSecret = new RegExp('^[a-zA-Z0-9-_]{1,255}$');
        const version = options ? options.version : undefined;

        if (!fullyQualifiedSecret.test(secretId) && !simpleSecret.test(secretId)) {
            throw new Error(`AWS Cloud Client secret id ${secretId} is the wrong format`);
        }

        const requestBody = {
            SecretId: secretId,
            VersionStage: version || 'AWSCURRENT'
        };
        const authHeaders = await this.getAuthHeaders(`https://secretsmanager.${this.region}.amazonaws.com:443/`, requestBody);

        const secret = await utils.retrier(utils.makeRequest, [`secretsmanager.${this.region}.amazonaws.com`, '/', {
            method: 'POST',
            port: 443,
            protocol: 'https',
            headers: authHeaders,
            body: requestBody,
            advancedReturn: true
        }]);

        if (secret) {
            if (secret.body.SecretString) {
                return secret.body.SecretString
            }
        }

        return '';
    }

    /**
     * Gets value for AWS EC2 Tag
     *
     * @param key                           - Tag key name
     *
     * @returns {Promise}
     */
    async getTagValue(key: string): Promise<string> {
        // need to parse this XML
        const tagPath = `/?Action=DescribeTags&Filter.1.Name=resource-id&Filter.1.Value.1=${this.instanceId}&Filter.2.Name=key&Filter.2.Value.1=${key}&Version=2016-11-15`;
        const authHeaders = await this.getAuthHeaders(`https://ec2.${this.region}.amazonaws.com${tagPath}`);
        const apiResponse = await utils.retrier(utils.makeRequest, [`ec2.${this.region}.amazonaws.com`, tagPath, {
            method: 'GET',
            port: 443,
            headers: authHeaders,
            protocol: 'https',
            advancedReturn: true
        }]);
        
        const tagResponse = await xml2js.parseStringPromise(apiResponse.body);
        if (tagResponse.DescribeTagsResponse) {
            if (tagResponse.DescribeTagsResponse.tagSet.length) {
                return Promise.resolve(tagResponse.DescribeTagsResponse.tagSet[0].item[0].value[0]);
            } else {
                return Promise.resolve('');
            }
        } else {
            return Promise.reject('Error getting tags on instance.');
        }
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
        query?: string;
    }): Promise<string> {
        const type = options ? options.type : undefined;
        const uriQuery = options ? options.query : undefined;
        const index = options ? options.index : undefined;
        const logger = Logger.getLogger();
        if (!field) {
            throw new Error('AWS Cloud Client metadata field is missing');
        }
        if (!type) {
            throw new Error('AWS Cloud Client metadata type is missing');
        }

        if (type !== 'compute' && type !== 'network' && type !== 'uri') {
            throw new Error('AWS Cloud Client metadata type is unknown. Must be one of [ compute, network ]');
        }

        if (type === 'network' && index === undefined) {
            throw new Error('AWS Cloud Client network metadata index is missing');
        }
        if (type === 'compute') {
            return this._getInstanceCompute(field)
                .catch(err => Promise.reject(err));
        }
        if (type === 'uri') {
            return this._fetchUri(field, uriQuery)
                .catch(err => Promise.reject(err));
        }
        if (type === 'network') {
            /** grab big-ip interface info */
            let mac;
            let retries = 0;
            const timer = ms => new Promise(res => setTimeout(res, ms)); /* eslint-disable-line @typescript-eslint/explicit-function-return-type */
            while (true) {
                const interfaceResponse = await utils.makeRequest(
                    'localhost', '/mgmt/tm/net/interface',
                    {
                        method: 'GET',
                        port: 80,
                        protocol: 'http',
                        headers: {
                            Authorization: `Basic ${utils.base64('encode', 'admin:admin')}`
                        },
                        verifyTls: false,
                        advancedReturn: true
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
            } else if (field === 'subnet-ipv4-cidr-block') {
                const getInstanceNetwork = await this._getInstanceNetwork(field, type, mac)
                    .catch(err => Promise.reject(err));
                logger.debug('CIDR block for ' + mac + ': ' + getInstanceNetwork);
                return new netmask.Netmask(getInstanceNetwork)['first'];
            } else {
                const getInstanceNetwork = await this._getInstanceNetwork(field, type, mac)
                    .catch(err => Promise.reject(err));
                logger.info('Field:' + field + 'for' + mac + ':' + getInstanceNetwork);
                return getInstanceNetwork;
            }
        }
    }

    /**
     * Fetches provided AWS Metadata uri using AWS SDK Metadata client
     *
     * @param uri                         - uri value (i.e. /latest/document/instances/version)
     * @param query                       - query options to filter JSON response using jmesPath
     *
     * @returns                           - A Promise resolved with AWS Metadata
     */
    async _fetchUri(uri, query): Promise<string> {
        if (typeof uri !== 'string' || (uri.split("/").length - 1) < 2) {
            throw new Error('AWS Cloud Client expects uri string for _fetchUri method.')
        } else {
            const response = await utils.retrier(utils.makeRequest,
                [constants.METADATA_HOST.AWS, uri, metadataRequestOptions]
            );
            if (query !== undefined) {
                try {
                    let searchResult;
                    if (typeof response.body === 'string') {
                        searchResult = jmesPath.search(JSON.parse(response.body), query);
                    } else {
                        searchResult = jmesPath.search(response.body, query);
                    }
                    return Promise.resolve(searchResult);
                } catch (error) {
                    throw new Error(`Error caught while searching json using jmesPath - Query: ${query} - Error ${error.message}`);
                }
            }
            return Promise.resolve(response.body);
        }
    }

    /**
     * Fetches AWS IMDSv2 Session token
     *
     * @returns   - A Promise resolved with token value
     */
    async _fetchMetadataSessionToken(): Promise<string> {
        const response = await utils.retrier(utils.makeRequest,
            [
                constants.METADATA_HOST.AWS,
                '/latest/api/token', 
                {
                    method: 'PUT',
                    port: 80,
                    protocol: 'http',
                    headers: {
                        "X-aws-ec2-metadata-token-ttl-seconds": '3600'
                    },
                    verifyTls: false,
                    advancedReturn: true
                }
            ]
        );
        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting session token ${response.code}`));
        }
        return Promise.resolve(response.body);
    }

    /**
     * Gets instance identity document
     *
     * @returns   - A Promise that will be resolved with the Instance Identity document or
     *                          rejected if an error occurs
     */
    async _getInstanceIdentityDoc(): Promise<{
        region: string;
        instanceId: string;
    }> {
        const response = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.AWS, '/latest/dynamic/instance-identity/document', metadataRequestOptions]
        );
        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting instance identity doc ${response.code}`));
        }
        return Promise.resolve(response.body);
    }

    /**
     * Gets instance compute type metadata
     * See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-categories.html for available fields
     * Type compute supports all categories with base uri + /field
     *
     * @returns   - A Promise that will be resolved with metadata for the supplied field or
     *                          rejected if an error occurs
     */
    async _getInstanceCompute(field: string): Promise<string> {
        const response = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.AWS, '/latest/meta-data/' + field, metadataRequestOptions]
        );
        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting instance compute ${response.code}`));
        }
        return Promise.resolve(response.body.replace(/_/g, '-'));
    }

    /**
     * Gets instance network type metadata
     * See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-categories.html for available fields
     * Type network supports all categories with base uri + /network/interfaces/macs/<mac>/ where <mac> is determined by $index
     *
     * @returns   - A Promise that will be resolved with metadata for the supplied network field or
     *                          rejected if an error occurs
     */
    async _getInstanceNetwork(field: string, type: string, mac: string): Promise<string> {
        const response = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.AWS, '/latest/meta-data/' + type + '/interfaces/macs/' + mac + '/' + field, metadataRequestOptions]
        );
        return Promise.resolve(response.body);
    }

    getRegion(): string {
        return this.region;
    }

    /**
    * Get auth headers
    * 
    * @param source - Optional source URL for AWS objects
    *
    * @returns {object} A promise which is resolved with auth headers
    *
    */
    async getAuthHeaders(source?: string, resource?: any): Promise<object> { /* eslint-disable-line @typescript-eslint/no-explicit-any */
        const host = source.split('/')[2];
        const path = source.split(host + '/')[1];
        let opts;
        if (resource && resource.SecretId) {
            opts = { 
                host: host, 
                path: '/',
                method: 'POST',
                headers: {
                    'Accept-Encoding': 'identity',
                    'X-Amz-Target': 'secretsmanager.GetSecretValue',
                    'Content-Type': 'application/x-amz-json-1.1'
                },
                body: JSON.stringify(resource),
                region: this.region,
                service: 'secretsmanager'
            };
        } else {
            opts = { host: host, path: `/${path}` }
        }
        
        const instanceProfileResponse = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.AWS, '/latest/meta-data/iam/security-credentials/', metadataRequestOptions]
        );
        const credentialsResponse = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.AWS, `/latest/meta-data/iam/security-credentials/${instanceProfileResponse.body}`, metadataRequestOptions]
        );
        const signed = aws4.sign(opts, { accessKeyId: credentialsResponse.body.AccessKeyId, secretAccessKey: credentialsResponse.body.SecretAccessKey, sessionToken: credentialsResponse.body.Token })
        return Promise.resolve(signed.headers);
    }
}


