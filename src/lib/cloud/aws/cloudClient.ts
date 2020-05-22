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

export class AwsCloudClient extends AbstractCloudClient {
    _metadata: AWS.MetadataService;
    secretsManager: AWS.SecretsManager;
    region: string;
    instanceId: string;

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
            }) => {
                this.region = metadata.region;
                this.instanceId = metadata.instanceId;
                AWS.config.update({ region: this.region });
                this.secretsManager = new AWS.SecretsManager();
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    }


    /**
     * Get secret from AWS Secrets Manager
     *
     * @param secret                        - secret name
     * @param [options]                     - cloud specific metadata for getting secert value
     * @param [options.versionStage]        - version stage value for secret
     *
     * @returns                             - secret value
     */
    async getSecret(secretId: string, options?: {
        versionStage?: string;
    }): Promise<string> {
        if (!secretId) {
            throw new Error('AWS Cloud Client secert id is missing');
        }

        const versionStage = options ? options.versionStage : undefined;
        const params = {
            SecretId: secretId,
            VersionStage: versionStage || 'AWSCURRENT'
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
}
