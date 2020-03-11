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

const AWS = require('aws-sdk');
const CLOUDS = require('../../../constants').CLOUDS;
const AbstractCloudClient = require('../abstract/cloudClient.js').AbstractCloudClient;


class CloudClient extends AbstractCloudClient {
    constructor(options) {
        super(CLOUDS.AWS, options);
        this._metadata = new AWS.MetadataService();
        this.secretsManager = {};
    }

    /**
     * See the parent class method for details
     */
    init() {
        return this._getInstanceIdentityDoc()
            .then((metadata) => {
                this.region = metadata.region;
                this.instanceId = metadata.instanceId;
                AWS.config.update({ region: this.region });
                this.secretsManager = new AWS.SecretsManager();

                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    }


    /**
     * Gets secret from AWS Secrets Manager
     *
     * @param {String} secret                        - secret name
     * @param {Object} [options]                     - cloud specific metadata for getting secert value
     * @param {Object} [options.versionStage]        - version stage value for secret
     *
     * @returns {Promise}
     */
    getSecret(secretId, options) {
        if (!secretId) {
            throw new Error('AWS Cloud Client secert id is missing');
        }

        const versionStage = options ? options.versionStage : undefined;
        const params = {
            SecretId: secretId,
            VersionStage: versionStage || 'AWSCURRENT'
        };

        return this.secretsManager.getSecretValue(params)
            .promise()
            .then((secret) => {
                if (typeof secret === 'object' && 'SecretString' in secret) {
                    return Promise.resolve(secret.SecretString);
                }
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    }

    /**
     * Gets instance identity document
     *
     * @returns {Promise}   - A Promise that will be resolved with the Instance Identity document or
     *                          rejected if an error occurs
     */
    _getInstanceIdentityDoc() {
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

module.exports = {
    CloudClient
};
