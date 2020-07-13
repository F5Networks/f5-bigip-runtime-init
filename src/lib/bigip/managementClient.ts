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
 * async utils.makeRequest('/foo/bar', object);
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
    uriPrefix: string;
    authHeader: string;
    maxRetries: number;
    retryInterval: number;

    constructor(options?: {
        port?: number;
        user?: string;
        password?: string;
        useTls?: boolean;
        maxRetries?: number;
        retryInterval?: number;
    }) {
        options = options || {};

        this.host = 'localhost';
        this.port = options.port || 8100;
        this.user = options.user || 'admin';
        this.password = options.password || 'admin';
        this.useTls = options.useTls || false;
        this._protocol = this.useTls === false ? 'http' : 'https';
        this.maxRetries = options.maxRetries ? options.maxRetries : undefined;
        this.retryInterval = options.retryInterval ? options.retryInterval : undefined;

        this.uriPrefix = `${this._protocol}://${this.host}:${this.port}`;
        this.authHeader = `Basic ${utils.base64('encode', `${this.user}:${this.password}`)}`;
    }

    /**
     * Is device ready check
     *
     */
    async _isReadyCheck(): Promise<boolean>{
        const readyResponse = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/ready`,
            {
                method: 'GET',
                headers: {
                    Authorization: this.authHeader
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
     */
    async isReady(): Promise<object> {
        return utils.retrier(this._isReadyCheck, [], {
            thisContext: this,
            maxRetries: this.maxRetries,
            retryInterval: this.retryInterval
        });
    }
}
