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

import * as fs from 'fs';
import * as url from 'url';


import Logger from '../../logger';
import { ManagementClient } from '../managementClient';
import * as constants from '../../../constants';
import * as toolChainMetadata from './toolchain_metadata.json';
import * as utils from '../../utils';

const PKG_MGMT_URI = '/mgmt/shared/iapp/package-management-tasks';

const logger = Logger.getLogger();


/** Metadata client class */
/* eslint-disable  @typescript-eslint/no-explicit-any */
class MetadataClient {
    component: string;
    version: string;
    hash: string;
    metadata: any;
    /**
     *
     * @param {string} component         [toolchain component]
     * @param {string} version           [toolchain component version]
     *
     * @returns {void}
     */
    constructor(component, version, hash) {
        this.component = component;
        this.version = version;
        this.hash = hash;
        this.metadata = this._loadMetadata();
    }

    _loadMetadata(): any {
        return toolChainMetadata;
    }

    _getComponentMetadata(): any {
        return this.metadata.components[this.component];
    }

    _getComponentVersionMetadata(): any {
        return this.metadata.components[this.component].versions[this.version];
    }

    /**
     * Get component name
     *
     * @returns {string} component name
     */
    getComponentName(): string {
        return this.component;
    }

    /**
     * Get component version
     *
     * @returns {string} component version
     */
    getComponentVersion(): string {
        return this.version;
    }

    /**
     * Get component hash
     *
     * @returns {string} component hash
     */
    getComponentHash(): string {
        return this.hash;
    }

    /**
     * Get component metadata
     *
     * @returns {object} component metadata
     */
    getDownloadUrl(): any {
        return this._getComponentVersionMetadata().downloadUrl;
    }

    /**
     * Get download package
     *
     * @returns {string} download package name
     */
    getDownloadPackageName(): string {
        const downloadUrlSplit = this.getDownloadUrl().split('/');
        return downloadUrlSplit[downloadUrlSplit.length - 1];
    }

    /**
     * Get configuration endpoint
     *
     * @returns {object} { endpoint: '/', methods: ['GET'] }
     */
    getConfigurationEndpoint(): {
        endpoint: string;
        methods: string[];
    } {
        const configure = this._getComponentMetadata().endpoints.configure;
        return { endpoint: configure.uri, methods: configure.methods };
    }

    /**
     * Get info endpoint
     *
     * @returns {object} { endpoint: '/', methods: ['GET'] }
     */
    getInfoEndpoint(): {
        endpoint: string;
        methods: string[];
    } {
        const info = this._getComponentMetadata().endpoints.info;
        return { endpoint: info.uri, methods: info.methods };
    }
}

/** Package client class */
class PackageClient {
    _mgmtClient: ManagementClient;
    _metadataClient: MetadataClient;
    component: string;
    version: string;
    uriPrefix: string;
    authHeader: string;
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

        this.uriPrefix = `${this._mgmtClient._protocol}://${this._mgmtClient.host}:${this._mgmtClient.port}`;
        this.authHeader = `Basic ${utils.base64('encode', `${this._mgmtClient.user}:${this._mgmtClient.password}`)}`;
    }

    async _uploadRpm(file: string, options?: {
        deleteFile?: boolean;
    }): Promise<void> {
        /* eslint-disable no-await-in-loop, no-loop-func */
        options = options || {};

        const deleteFile = options.deleteFile || true;
        const fileStats = fs.statSync(file);
        const chunkSize = 1024 * 1024;

        let start = 0;
        let end = chunkSize;
        while (end <= fileStats.size - 1 && start < end) {
            logger.info(`Sending chunk: ${start}-${end}/${fileStats.size}`);

            await utils.makeRequest(
                `${this.uriPrefix}/mgmt/shared/file-transfer/uploads/${file.split('/')[file.split('/').length - 1]}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: this.authHeader,
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

    async _checkRpmTaskStatus(taskId: string): Promise<any> {
        let i = 0;
        const maxCount = 120;
        let response;
        while (i < maxCount) {
            response = await utils.makeRequest(`${this.uriPrefix}${PKG_MGMT_URI}/${taskId}`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });

            if (response.body.status === 'FINISHED') {
                i = maxCount;
            } else if (response.body.status === 'FAILED') {
                return Promise.reject(new Error(`RPM installation failed: ${response.body.errorMessage}`));
            } else if (i > maxCount) {
                return Promise.reject(Error(`Max count exceeded, last response: ${response.body.errorMessage}`));
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            i += 1;
        }
        return response.body;
    }

    async _installRpm(packagePath: string): Promise<void> {
        const response = await utils.makeRequest(
            `${this.uriPrefix}${PKG_MGMT_URI}`,
            {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader
                },
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
    async install(): Promise<{
        component: string;
        version: string;
        installed: boolean;
    }> {
        logger.info(`Installing - ${this.component} ${this.version}`);

        const downloadUrl = this._metadataClient.getDownloadUrl();
        const urlObject = url.parse(downloadUrl);
        const downloadPackageName = this._metadataClient.getDownloadPackageName();

        let tmpFile = '';
        if (urlObject.protocol === 'file:') {
            // file is already local
            tmpFile = downloadUrl;
        } else {
            // download locally
            tmpFile = `${constants.TMP_DIR}/${downloadPackageName}`;
            await utils.downloadToFile(downloadUrl, tmpFile);
        }

        // verify package
        if (this._metadataClient.getComponentHash()) {
            utils.verifyHash(tmpFile, this._metadataClient.getComponentHash());
        }

        // upload to target
        await this._uploadRpm(tmpFile);

        // install on target
        await this._installRpm(`/var/config/rest/downloads/${downloadPackageName}`);

        return { component: this.component, version: this.version, installed: true };
    }
}

/** Service client class */
class ServiceClient {
    _mgmtClient: ManagementClient;
    _metadataClient: MetadataClient;
    component: string;
    version: string;
    uriPrefix: string;
    authHeader: string;
    /**
     *
     * @param {string} component         [toolchain component]
     * @param {string} version           [toolchain component version]
     *
     * @returns {void}
     */
    constructor(mgmtClient: ManagementClient, metadataClient: MetadataClient) {
        this._mgmtClient = mgmtClient;
        this._metadataClient = metadataClient;

        this.component = this._metadataClient.getComponentName();
        this.version = this._metadataClient.getComponentVersion();

        this.uriPrefix = `${this._mgmtClient._protocol}://${this._mgmtClient.host}:${this._mgmtClient.port}`;
        this.authHeader = `Basic ${utils.base64('encode', `${this._mgmtClient.user}:${this._mgmtClient.password}`)}`;
    }

    /**
     * Check if task state passed
     *
     * @param {string} taskUri [task URI]
     *
     * @returns {promise} Task response
     */
    async _checkTaskState(taskUri: string): Promise<{
        code: number;
        body?: any;
    }> {
        const taskResponse = await utils.makeRequest(`${this.uriPrefix}${taskUri}`,
            {
                headers: {
                    Authorization: this.authHeader
                }
            });

        if (taskResponse.code === constants.HTTP_STATUS_CODES.OK) {
            return Promise.resolve(taskResponse);
        }
        return Promise.reject(new Error(`Task state has not passed: ${taskResponse.code}`));
    }

    /**
     * Wait for task
     *
     * Note: Certain toolchain components support async task behavior,
     * where a 202 response on the initial POST is returned along
     * with a self link to query.  The self link will return 202 until
     * the task is complete, at which time it will return 200.
     *
     * @param {string} taskUri [task URI]
     *
     * @returns {promise} Task response
     */
    async _waitForTask(taskUri: string): Promise<void> {
        await utils.retrier(this._checkTaskState, [taskUri], { thisContext: this });
    }

    /**
     * Is available check
     *
     * @returns {boolean}
     */
    async _isAvailableCheck(): Promise<boolean> {
        const response = await utils.makeRequest(
            `${this.uriPrefix}${this._metadataClient.getInfoEndpoint().endpoint}`,
            {
                headers: {
                    Authorization: this.authHeader
                }
            }
        );

        if (response.code !== constants.HTTP_STATUS_CODES.OK) {
            return Promise.reject(new Error(`Is available check failed ${response.code}`));
        }
        return true;
    }

    /**
     * Is available (retries)
     *
     * @returns {boolean}
     */
    async isAvailable(): Promise<void> {
        await utils.retrier(this._isAvailableCheck, [], { thisContext: this });
    }

    /**
     * Create
     *
     * @param {object} options          [function options]
     * @param {string} [options.config] [configuration]
     *
     * @returns {promise} HTTP response
     */
    async create(options?: {
        config?: object;
    }): Promise<{
        code: number;
        body?: any;
    }> {
        options = options || {};
        const config = options.config;

        logger.info(`Creating - ${this.component} ${this.version} ${utils.stringify(config)}`);

        const response = await utils.makeRequest(
            `${this.uriPrefix}${this._metadataClient.getConfigurationEndpoint().endpoint}`,
            {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader
                },
                body: config
            }
        );

        if (response.code === constants.HTTP_STATUS_CODES.ACCEPTED) {
            await this._waitForTask(response.body.selfLink.split('https://localhost')[1]);
        }

        return response;
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
export class ToolChainClient {
    _mgmtClient: ManagementClient;
    component: string;
    version: string;
    hash: string;
    _metadataClient: MetadataClient
    /**
     *
     * @param {class} mgmtClient [management client]
     * @param {string} component [toolchain component]
     * @param {string} version   [toolchain component version]
     * @param {string} hash   [toolchain component hash]
     *
     * @returns {void}
     */
    constructor(mgmtClient: ManagementClient, component: string, options?: any) {
        this._mgmtClient = mgmtClient;
        this.component = component;
        this.version = options.version;
        this.hash = options.hash;
        this._metadataClient = new MetadataClient(this.component, this.version, this.hash);
    }

    get package(): PackageClient {
        return new PackageClient(this._mgmtClient, this._metadataClient);
    }

    get service(): ServiceClient {
        return new ServiceClient(this._mgmtClient, this._metadataClient);
    }
}
