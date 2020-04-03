
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

const { google } = require('googleapis');


const secretmanager = google.secretmanager('v1');
const CLOUDS = require('../../../constants').CLOUDS;
const AbstractCloudClient = require('../abstract/cloudClient.js').AbstractCloudClient;

class CloudClient extends AbstractCloudClient {
    constructor(options) {
        super(CLOUDS.GCP, options);
        this.google = google;
        this.secretmanager = secretmanager;
    }

    /**
     * See the parent class method for details
     */
    init() {
        return Promise.all([
            this._getProjectId()
                .then((result) => {
                    this.projectId = result;
                })
                .catch(err => Promise.reject(err)),
            this._getAuthToken()
                .then((result) => {
                    this.authToken = result;
                })
                .catch(err => Promise.reject(err))
        ]);
    }


    /**
     * Gets secret from GCP Secrets Manager
     *
     * @param {String} secretId                      - secret name
     * @param {Object} [options]                     - cloud specific metadata for getting secret value
     * @param {Object} [options.versionStage]        - version value for secret
     *
     * @returns {Promise}
     */
    getSecret(secretId, options) {
        if (!secretId) {
            throw new Error('GCP Cloud Client secret id is missing');
        }
        const versionStage = (options ? options.versionStage : undefined) || 'latest';
        const params = {
            auth: this.authToken,
            name: `projects/${this.projectId}/secrets/${secretId}/versions/${versionStage}`
        };
        return this.secretmanager.projects.secrets.versions.access(params)
            .then((response) => {
                const buff = Buffer.from(response.data.payload.data, 'base64');
                const secret = buff.toString('ascii');
                return Promise.resolve(secret);
            })
            .catch((err) => {
                const message = `Error getting secret from ${secretId} ${err.message}`;
                return Promise.reject(new Error(message));
            });
    }

    /**
     * Get projectId
     *
     * @returns {Promise} A promise which is resolved with the projectId requested
     *
     */
    _getProjectId() {
        return this.google.auth.getProjectId()
            .then((projectId) => Promise.resolve(projectId)) /* eslint-disable-line */
            .catch((err) => {
                const message = `Error getting project id ${err.message}`;
                return Promise.reject(new Error(message));
            });
    }

    /**
     * Get bearer auth token
     *
     * @returns {Promise} A promise which is resolved with bearer auth token
     *
     */

    _getAuthToken() {
        return this.google.auth.getClient({
            scopes: [
                'https://www.googleapis.com/auth/cloud-platform',
                'https://www.googleapis.com/auth/secretmanager'
            ]
        })
            .then((authToken) => Promise.resolve(authToken)) /* eslint-disable-line */
            .catch((err) => {
                const message = `Error getting auth token ${err.message}`;
                return Promise.reject(new Error(message));
            });
    }
}

module.exports = {
    CloudClient
};
