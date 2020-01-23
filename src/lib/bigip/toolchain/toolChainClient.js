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

const logger = require('../../logger.js');
const constants = require('../../../constants.js');
const utils = require('../../utils.js');

const PKG_MGMT_URI = '/mgmt/shared/iapp/package-management-tasks';

/** Metadata client class */
class MetadataClient {
    /**
     *
     * @param {string} component         [toolchain component]
     * @param {string} version           [toolchain component version]
     *
     * @returns {void}
     */
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

    /**
     * Get component name
     *
     * @returns {string} component name
     */
    getComponentName() {
        return this.component;
    }

    /**
     * Get component version
     *
     * @returns {string} component version
     */
    getComponentVersion() {
        return this.version;
    }

    /**
     * Get component metadata
     *
     * @returns {object} component metadata
     */
    getDownloadUrl() {
        return this._getComponentMetadata().downloadUrl;
    }

    /**
     * Get download package
     *
     * @returns {string} download package name
     */
    getDownloadPackageName() {
        const downloadUrlSplit = this.getDownloadUrl().split('/');
        return downloadUrlSplit[downloadUrlSplit.length - 1];
    }
}

/** Package client class */
class PackageClient {
    /**
     *
     * @param {class} mgmtClient     [management client]
     * @param {class} metadataClient [metadata client]
     *
     * @returns {void}
     */
    constructor(mgmtClient, metadataClient) {
        this._mgmtClient = mgmtClient;
        this._metadataClient = metadataClient;

        this.component = this._metadataClient.getComponentName();
        this.version = this._metadataClient.getComponentVersion();
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

            await this._mgmtClient.makeRequest(
                `/mgmt/shared/file-transfer/uploads/${file.split('/')[file.split('/').length - 1]}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Range': `${start}-${end}/${fileStats.size}`,
                        'Content-Length': end - start + 1
                    },
                    body: fs.createReadStream(file, { start, end }),
                    bodyType: 'raw'
                }
            );

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
            response = await this._mgmtClient.makeRequest(`${PKG_MGMT_URI}/${taskId}`);

            if (response.body.status === 'FINISHED') {
                i = maxCount;
            } else if (response.body.status === 'FAILED') {
                return Promise.reject(new Error(`RPM installation failed: ${response.body.errorMessage}`));
            } else if (i > maxCount) {
                return Promise.reject(Error(`Max count exceeded, last response: ${response.body.errorMessage}`));
            }

            await new Promise(resolve => setTimeout(resolve, '2000'));
            i += 1;
        }
        return response.body;
    }

    async _installRpm(packagePath) {
        const response = await this._mgmtClient.makeRequest(
            PKG_MGMT_URI,
            {
                method: 'POST',
                body: {
                    operation: 'INSTALL',
                    packageFilePath: packagePath
                }
            }
        );

        await this._checkRpmTaskStatus(response.body.id);
    }

    /**
     * Install
     *
     * @returns {promise} { 'component': '', 'version': '', 'installed': true }
     */
    async install() {
        logger.info(`Installing - ${this.component} ${this.version}`);

        const downloadUrl = this._metadataClient.getDownloadUrl();
        const downloadPackageName = this._metadataClient.getDownloadPackageName();

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

/** Service client class */
class ServiceClient {
    /**
     *
     * @param {string} component         [toolchain component]
     * @param {string} version           [toolchain component version]
     *
     * @returns {void}
     */
    constructor(mgmtClient, metadataClient) {
        this._mgmtClient = mgmtClient;
        this._metadataClient = metadataClient;

        this.component = this._metadataClient.getComponentName();
        this.version = this._metadataClient.getComponentVersion();
    }

    /**
     * Create
     *
     * @param {object} options          [function options]
     * @param {string} [options.config] [configuration]
     *
     * @returns {promise} HTTP response
     */
    async create(options) {
        options = options || {};
        const config = options.config;

        logger.info(`Creating - ${this.component} ${this.version} ${utils.stringify(config)}`);
    }
}

/**
 * Toolchain client class
 *
 * @example
 *
 * const mgmtClient = new ManagementClient({ host: '', port: '', user: '', password: ''});
 * const toolchainClient = new ToolChainClient(mgmtClient, 'as3', { version: '1.0.0' });
 *
 * async toolchainClient.package.install();
 *
 * @example
 *
 * async toolchainClient.service.create({ config: {} });
 */
class ToolChainClient {
    /**
     *
     * @param {class} mgmtClient [management client]
     * @param {string} component [toolchain component]
     * @param {string} version   [toolchain component version]
     *
     * @returns {void}
     */
    constructor(mgmtClient, component, options) {
        this._mgmtClient = mgmtClient;
        this.component = component;
        this.version = options.version;
        this._metadataClient = new MetadataClient(this.component, this.version);
    }

    get package() {
        return new PackageClient(this._mgmtClient, this._metadataClient);
    }

    get service() {
        return new ServiceClient(this._mgmtClient, this._metadataClient);
    }
}

module.exports = ToolChainClient;
