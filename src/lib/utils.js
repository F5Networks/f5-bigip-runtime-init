/* eslint-disable no-await-in-loop */
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
const crypto = require('crypto');
const request = require('request');
const Mustache = require('mustache');
const constants = require('../constants.js');

module.exports = {
    /**
     * Stringify an object
     *
     * @param {object} data - data
     *
     * @returns {string} Stringified data
     */
    stringify(data) {
        return JSON.stringify(data);
    },

    /**
     * Download HTTP payload to file
     *
     * @param {string} url  - url
     * @param {string} file - file where data should end up
     *
     * @returns {promise} Resolved on download completion
     */
    downloadToFile(url, file) {
        return new Promise(((resolve, reject) => {
            request(url)
                .on('error', (err) => {
                    reject(err);
                })
                .pipe(fs.createWriteStream(file))
                .on('error', (err) => {
                    reject(err);
                })
                .on('finish', resolve);
        }))
            .catch(err => Promise.reject(err));
    },

    /**
     * Verify file against provided hash
     *
     * @param {string} file - file we are verifying
     * @param {string} hash - file hash provided by user (SHA256sum)
     *
     * @returns {promise} Resolved on successful verification
     */
    verifyHash(file, extensionHash) {
        const createHash = crypto.createHash('sha256');
        const input = fs.readFileSync(file);
        createHash.update(input);
        const computedHash = createHash.digest('hex');
        if (extensionHash === computedHash) {
            return true;
        }
        throw new Error('File verification failed.');
    },

    /**
     * Base64 encoder/decoder
     *
     * @param {string} action - decode|encode
     * @param {string} data - data to process
     *
     * @returns {string} Returns processed data as a string
     */
    base64(action, data) {
        // support decode|encode actions
        if (action === 'decode') {
            return Buffer.from(data, 'base64').toString().trim();
        }
        if (action === 'encode') {
            return Buffer.from(data).toString('base64');
        }
        throw new Error('Unsupported action, try one of these: decode, encode');
    },

    /**
     * Function retrier
     *
     * @param {function} func                 - function to execute
     * @param {function} args                 - function args to provide
     * @param {options} options               - function options
     * @param {options} [options.thisContext] - this arg to provide
     *
     * @returns {promise} Returns processed data as a string
     */
    async retrier(func, args, options) {
        /* eslint-disable no-await-in-loop, no-loop-func */
        options = options || {};
        const thisContext = options.thisContext || this;
        const retryCount = options.maxRetries || constants.RETRY.DEFAULT_COUNT;
        const retryInterval = options.retryInterval || constants.RETRY.DELAY_IN_MS;
        let i = 0;
        let response;
        let error;
        while (i < retryCount) {
            error = null;
            try {
                response = await func.apply(thisContext, args);
            } catch (err) {
                error = err;
            }

            if (error === null) {
                i = retryCount;
            } else {
                await new Promise(resolve => setTimeout(resolve, retryInterval));
                i += 1;
            }
        }

        if (error !== null) {
            return Promise.reject(error);
        }
        return response;
    },

    /**
     * Load data
     *
     * @param {function} location              - data location
     * @param {options} options                - function options
     * @param {options} [options.locationType] - location type, file|url
     *
     * @returns {promise} Returns loaded data
     */
    async loadData(location, options) {
        options = options || {};

        const locationType = options.locationType || 'file';

        if (locationType === 'file') {
            return Promise.resolve(JSON.parse(fs.readFileSync(location, 'utf8')));
        }
        if (locationType === 'url') {
            return new Promise(((resolve, reject) => {
                request(location, (error, resp, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(JSON.parse(body));
                    }
                });
            }))
                .catch(err => Promise.reject(err));
        }
        return Promise.reject(new Error(`Unknown location type: ${locationType}`));
    },

    /**
     * Renders secrets
     *
     * @param {string} data                    - String with token to replace
     * @param {object} value                   - token name to secret value map (JSON)
     *
     * @returns {promise} Returns string with replaced tokens
     */
    renderData(template, value) {
        return Mustache.render(template, value);
    }
};
