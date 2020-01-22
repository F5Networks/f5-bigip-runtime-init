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

const fs = require('fs');
const request = require('request');

const logger = require('./logger.js');
const constants = require('../constants.js');
const utils = require('./utils.js');
const connection = require('./connection.js');

const PKG_MGMT_URI = '/mgmt/shared/iapp/package-management-tasks';

class MetadataClient {
    constructor(component, version) {
        this.component = component;
        this.version = version;
        this.metadata = this._loadMetadata();
    }

    _loadMetadata() {
        return require('./toolchain_metadata.json'); // eslint-disable-line global-require
    }

    _getComponentMetadata() {
        return this.metadata.components[this.component].versions[this.version];
    }

    getDownloadUrl() {
        return this._getComponentMetadata().downloadUrl;
    }

    getDownloadPackageName() {
        const downloadUrlSplit = this.getDownloadUrl().split('/');
        return downloadUrlSplit[downloadUrlSplit.length - 1];
    }
}

class PackageClient {
    constructor(component, options) {
        this.component = component;
        this.version = options.version;

        this.metadataClient = new MetadataClient(this.component, this.version);
    }

    async _uploadRpm(file, options) {
        /* eslint-disable no-await-in-loop, no-loop-func */
        options = options || {};
        const deleteFile = options.deleteFile || true;

        const fileStats = fs.statSync(file);
        const chunkSize = 1024 * 1024;
        let start = 0;
        let end = chunkSize;
        while (end <= fileStats.size - 1 && start < end) {
            logger.info(`Sending chunk: ${start}-${end}/${fileStats.size}`);

            const requestOptions = {
                url: `${connection.protocol}://${connection.address}:${connection.port}/mgmt/shared/file-transfer/uploads/${file.split('/')[file.split('/').length - 1]}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Range': `${start}-${end}/${fileStats.size}`,
                    'Content-Length': end - start + 1,
                    Connection: 'keep-alive',
                    Authorization: `Basic ${utils.base64('encode', `${connection.username}:${connection.password}`)}`
                },
                rejectUnauthorized: false
            };

            await new Promise(((resolve, reject) => {
                fs.createReadStream(file, { start, end })
                    .on('error', (err) => {
                        reject(err);
                    })
                    .pipe(request(requestOptions))
                    .on('error', (err) => {
                        reject(err);
                    })
                    .on('response', (response) => {
                        resolve(response);
                    });
            }));

            start += chunkSize;
            if (end + chunkSize < fileStats.size - 1) { // more to go
                end += chunkSize;
            } else if (end + chunkSize > fileStats.size - 1) { // last chunk
                end = fileStats.size - 1;
            } else { // done - could use do..while loop instead of this
                end = fileStats.size;
            }
        }

        if (deleteFile === true) {
            fs.unlinkSync(file);
        }
    }

    async _checkRpmTaskStatus(taskId) {
        let i = 0;
        const maxCount = 120;
        let response;
        while (i < maxCount) {
            response = await new Promise(((resolve, reject) => {
                request({
                    url: `${connection.protocol}://${connection.address}:${connection.port}${PKG_MGMT_URI}/${taskId}`,
                    headers: {
                        Authorization: `Basic ${utils.base64('encode', `${connection.username}:${connection.password}`)}`
                    },
                    json: true,
                    rejectUnauthorized: false
                }, (error, _resp, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(body);
                    }
                });
            }));

            if (response.status === 'FINISHED') {
                i = maxCount;
            } else if (response.status === 'FAILED') {
                return Promise.reject(new Error(`RPM installation failed: ${response.errorMessage}`));
            } else if (i > maxCount) {
                return Promise.reject(Error(`Max count exceeded, last response: ${response.errorMessage}`));
            }

            await new Promise(resolve => setTimeout(resolve, '2000'));
            i += 1;
        }
        return response;
    }

    async _installRpm(packagePath) {
        const response = await new Promise(((resolve, reject) => {
            request({
                url: `${connection.protocol}://${connection.address}:${connection.port}${PKG_MGMT_URI}`,
                method: 'POST',
                headers: {
                    Authorization: `Basic ${utils.base64('encode', `${connection.username}:${connection.password}`)}`
                },
                body: {
                    operation: 'INSTALL',
                    packageFilePath: packagePath
                },
                json: true,
                rejectUnauthorized: false
            }, (error, _resp, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        }));

        await this._checkRpmTaskStatus(response.id);
    }

    async install() {
        logger.info(`Installing - ${this.component} ${this.version}`);

        const downloadUrl = this.metadataClient.getDownloadUrl();
        const downloadPackageName = this.metadataClient.getDownloadPackageName();

        // download locally
        const tmpFile = `${constants.TMP_DIR}/${downloadPackageName}`;
        await utils.downloadToFile(downloadUrl, tmpFile);

        // upload to target
        await this._uploadRpm(tmpFile);

        // install on target
        await this._installRpm(`/var/config/rest/downloads/${downloadPackageName}`);

        return { component: this.component, version: this.version, installed: true };
    }
}

class ServiceClient {
    constructor(component, options) {
        this.component = component;
        this.version = options.version || 'latest';
    }

    async create(body) {
        logger.info(`Creating - ${this.component} ${this.version} ${utils.stringify(body)}`);
    }
}

module.exports = {
    PackageClient,
    ServiceClient
};
