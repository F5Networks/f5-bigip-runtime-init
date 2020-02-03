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

const request = require('request');

const logger = require('../logger.js');
const utils = require('../utils.js');

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
class ManagementClient {
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
    constructor(options) {
        options = options || {};

        this.host = options.host || 'localhost';
        this.port = options.port || 8100;
        this.user = options.user || 'admin';
        this.password = options.password || 'admin';
        this.useTls = options.useTls || false;

        this._protocol = this.useTls === false ? 'http' : 'https';
    }

    /**
     * Make request (HTTP)
     *
     * @param {string} uri                   [uri]
     * @param {object} options               [function options]
     * @param {string} [options.method]      [HTTP method, defaults to 'GET']
     * @param {object} [options.headers]     [HTTP headers]
     * @param {object|stream} [options.body] [HTTP body]
     * @param {string} [options.bodyType]    [body type, such as 'raw']
     *
     * @returns {Promise} Resolves on successful response - { code: 200, data: '' }
     */
    async makeRequest(uri, options) {
        options = options || {};

        if (options.bodyType === 'raw') {
            // continue
        } else {
            options.body = JSON.stringify(options.body);
        }

        const requestOptions = {
            url: `${this._protocol}://${this.host}:${this.port}${uri}`,
            method: options.method || 'GET',
            headers: Object.assign(
                options.headers || {},
                {
                    Authorization: `Basic ${utils.base64('encode', `${this.user}:${this.password}`)}`
                }
            ),
            body: options.body || null,
            rejectUnauthorized: false
        };

        logger.info(`Making request: ${requestOptions.method} ${uri}`);

        const response = await new Promise(((resolve, reject) => {
            request(requestOptions, (error, resp, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ code: resp.statusCode, body: JSON.parse(body) });
                }
            });
        }));

        logger.info(`Request response: ${response.code} ${utils.stringify(response.body)}`);

        return { code: response.code, body: response.body };
    }

    /**
     * Is device ready check
     *
     * @returns {Promise} Resolves true on ready check passing
     */
    async _isReadyCheck() {
        const readyResponse = await this.makeRequest('/mgmt/tm/sys/ready');

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
    async isReady() {
        return utils.retrier(this._isReadyCheck, [], { thisContext: this });
    }
}

module.exports = ManagementClient;
