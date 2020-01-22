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
const request = require('request');

module.exports = {
    /**
     * Stringify an object
     *
     * @param {Object} data - data
     *
     * @returns {String} Stringified data
     */
    stringify(data) {
        return JSON.stringify(data);
    },

    /**
     * Download HTTP payload to file
     *
     * @param {String} url  - url
     * @param {String} file - file where data should end up
     *
     * @returns {Promise} Resolved on download completion
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
     * Base64 encoder/decoder
     *
     * @param {String} action - decode|encode
     * @param {String} data - data to process
     *
     * @returns {String} Returns processed data as a string
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
    }
};
