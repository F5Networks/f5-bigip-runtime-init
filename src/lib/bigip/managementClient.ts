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

import * as utils from '../utils';

/**
 * Management client class
 *
 * @example
 *
 * const mgmtClient = new ManagementClient({ host: '', port: '', user: '', password: ''});
 *
 * async mgmtClient.makeRequest('/foo/bar');
 *
 * @example
 *
 * async mgmtClient.isReady();
 */
export class ManagementClient {
    host: string;
    port: number;
    user: string;
    password: string;
    useTls: boolean;
    _protocol: string;
    /**
     *
     * @param {object} options            [function options]
     * @param {string} [options.host]     [host]
     * @param {integer} [options.port]    [host port]
     * @param {string} [options.user]     [host user]
     * @param {string} [options.password] [host password]
     * @param {boolean} [options.useTls]  [use TLS]
     *
     * @returns {void}
     */
    constructor(options?: {
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        useTls?: boolean;
    }) {
        options = options || {};

        this.host = options.host || 'localhost';
        this.port = options.port || 8100;
        this.user = options.user || 'admin';
        this.password = options.password || 'admin';
        this.useTls = options.useTls || false;
        this._protocol = this.useTls === false ? 'http' : 'https';       
    }

    /**
     * Is device ready check
     *
     * @returns {Promise} Resolves true on ready check passing
     */
    async _isReadyCheck(): Promise<boolean>{
        const uriPrefix = `${this._protocol}://${this.host}:${this.port}`;
        const authHeader = `Basic ${utils.base64('encode', `${this.user}:${this.password}`)}`;
        const readyResponse = await utils.makeRequest(`${uriPrefix}/mgmt/tm/sys/ready`,
            {
                method: 'GET',
                headers: {
                    Authorization: authHeader
                }
            });

        const entries = readyResponse.body.entries['https://localhost/mgmt/tm/sys/ready/0']
            .nestedStats.entries;

        let isReady = true;
        Object.keys(entries).forEach((entry) => {
            if (entries[entry].description !== 'yes') {
                isReady = false;
            }
        });
        if (isReady) {
            return Promise.resolve(true);
        }
        return Promise.reject(new Error('Ready check failed'));
    }

    /**
     * Is ready (with retrier)
     *
     * @returns {Promise} Resolves true on ready check passing
     */
    async isReady(): Promise<object> {
        return utils.retrier(this._isReadyCheck, [], { thisContext: this });
    }
}
