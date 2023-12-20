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

import * as constants from '../../../constants'
import { AbstractCloudClient } from '../abstract/cloudClient'
import * as utils from "../../utils";
import Logger from "../../logger";

const metadataRequestOptions: object = {
    method: 'GET',
    port: 80,
    protocol: 'http',
    headers: {
        'Metadata-Flavor': 'Google'
    },
    advancedReturn: true,
    continueOnError: true
 }

/* eslint-disable  @typescript-eslint/no-explicit-any */
export class GcpCloudClient extends AbstractCloudClient {
    projectId: string;
    region: string;
    constructor(options?: {
        logger?: Logger;
    }) {
        super(constants.CLOUDS.GCP, options);
    }

    /**
     * See the parent class method for details
     */
    init(): Promise<void> {
        return this._getProjectId()
            .then((projectId) => {
                this.projectId = projectId;
                return this._getRegion();
            })
            .then((region) => {
                this.region = region;
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err))
    }

    /**
     * Gets secret from GCP Secrets Manager
     *
     * @param secretId                      - secret name
     * @param [options]                     - cloud specific metadata for getting secret value
     * @param [options.version]             - version value for secret
     *
     * @returns
     */
    async getSecret(secretId: string, options?: {
        version?: string;
    }): Promise<string> {
        if (!secretId) {
            return Promise.reject(new Error('GCP Cloud Client secret id is missing'));
        }

        const fullyQualifiedSecret = new RegExp('^projects/[0-9]{6,30}/secrets/[a-z0-9-_]{1,255}/versions/([0-9]{1,255}|latest)$');
        const secret = new RegExp('^[a-z0-9-_]{1,255}$');
        const version = (options ? options.version : undefined) || 'latest';
        let secretName: string;
        if (fullyQualifiedSecret.test(secretId)) {
            secretName = secretId;
        } else if (secret.test(secretId)) {
            secretName = `projects/${this.projectId}/secrets/${secretId}/versions/${version}`;
        } else {
            return Promise.reject(new Error(`GCP Cloud Client secret id ${secretId} is the wrong format`));
        }

        const authHeaders = await this.getAuthHeaders();
        const response =  await utils.retrier(utils.makeRequest, ['secretmanager.googleapis.com', '/v1/' + secretName + ':access', {
            method: 'GET',
            port: 443,
            protocol: 'https',
            headers: authHeaders,
            advancedReturn: true,
            continueOnError: true
        }])

        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting secret from ${secretId} ${response.code}`));
        }

        const buff = Buffer.from(response.body.payload.data, 'base64');
        const secretValue = buff.toString('ascii');
        return Promise.resolve(secretValue);
    }

    /**
     * Returns cloud region name
     *
     * @returns {String}
     */
    getRegion(): string {
        return this.region;
    }

    /**
     * Returns cloud name
     *
     * @returns {String}
     */
    getCloudName(): string {
        return constants.CLOUDS.GCP;
    }

    /**
     * Returns accountId/subscriptionId from Azure
     *
     * @returns {String}
     */
    getCustomerId(): string {
        return this.projectId;
    }

    /**
     * Gets value for VM tag
     *
     * @param key                           - Tag key name
     * @param [options]                     - function options
     *
     * @returns {Promise}
     */
    async getTagValue(key: string):  Promise<string> {
        const responseVmName = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.GCP, '/computeMetadata/v1/instance/name', metadataRequestOptions]
        );
        const responseVmZone = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.GCP, '/computeMetadata/v1/instance/zone', metadataRequestOptions]
        );
        const authHeaders = await this.getAuthHeaders();
        const vmData = await utils.retrier(utils.makeRequest,
            ['compute.googleapis.com', `/compute/v1/${responseVmZone.body}/instances/${responseVmName.body}`, {
                method: 'GET',
                port: 443,
                protocol: 'https',
                headers: authHeaders,
                advancedReturn: true
            }]
        );
        return vmData.body.labels[key] || '';
    }

    /**
     * Gets value from Google metadata
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
            throw new Error('Google Cloud Client metadata field is missing');
        }

        if (!type) {
            throw new Error('Google Cloud Client metadata type is missing');
        }


        if (type != 'compute' && type != 'network') {
            throw new Error('Google Cloud Client metadata type is unknown. Must be one of [ compute, network ]');
        }

        if (type === 'network' && index === undefined) {
            throw new Error('Google Cloud Client network metadata index is missing');
        }

        let result: string;

        if (type == 'compute') {
            const response = await utils.retrier(utils.makeRequest,
                [constants.METADATA_HOST.GCP, `/computeMetadata/v1/instance/${field}`, metadataRequestOptions]
            );

            result = response.body.replace(/_/g, '-');
        } else if(type === 'network') {
            const responseIp = await utils.retrier(utils.makeRequest,
                [constants.METADATA_HOST.GCP, `/computeMetadata/v1/instance/network-interfaces/${index}/${field}`, metadataRequestOptions]
            );

            const responseMask = await utils.retrier(utils.makeRequest,
                [constants.METADATA_HOST.GCP, `/computeMetadata/v1/instance/network-interfaces/${index}/subnetmask`, metadataRequestOptions]
            );

            const maskNodes = responseMask.body.match(/(\d+)/g);
            let cidr = 0;
            for(const i in maskNodes) {
                cidr += (((maskNodes[i] >>> 0).toString(2)).match(/1/g) || []).length;
            }
            result = `${responseIp.body}/${cidr}`;
        }
        return result;
    }

    /**
     * Get projectId
     *
     * @returns {Promise} A promise which is resolved with the projectId requested
     *
     */
    async _getProjectId(): Promise<string> {
        const response = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.GCP, '/computeMetadata/v1/project/project-id', metadataRequestOptions]
        );
        if (!response.body || response.code !== 200) {
            return Promise.reject(new Error(`Error getting project id ${response.code}`));
        }
        return Promise.resolve(response.body);
    }

    /**
     * Get auth headers
     *
     * @returns {object} A promise which is resolved with auth headers
     *
     */
     async getAuthHeaders(): Promise<object> {
        const serviceAccountResponse = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.GCP, '/computeMetadata/v1/instance/service-accounts/?recursive=true', metadataRequestOptions]
        );
        const tokenResponse = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.GCP, `/computeMetadata/v1/instance/service-accounts/${serviceAccountResponse.body.default.email}/token`, metadataRequestOptions]
        );
        const headers = {
            'Authorization': `Bearer ${tokenResponse.body.access_token}`
        };
        return Promise.resolve(headers);
    }

     async _getRegion(): Promise<string> {
        const zone = await utils.retrier(utils.makeRequest,
            [constants.METADATA_HOST.GCP, '/computeMetadata/v1/instance/zone', metadataRequestOptions]
        );
        return zone.body.split('/')[zone.body.split('/').length - 1];
    }
}
