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

import * as fs from 'fs';
import * as nodeUtil from 'util';
import * as childProcess from 'child_process';
import * as crypto from 'crypto';
import * as URL from 'url';
import request from 'request';
import Mustache from 'mustache';
import * as constants from '../constants';
import Logger from './logger';

const logger = Logger.getLogger();

/**
 * Stringify
 *
 * @param data data to stringify
 *
 * @returns stringified data
 */
export function stringify(data: object): string {
    return JSON.stringify(data);
}

/**
 * Download HTTP payload to file
 *
 * @param url  - url
 * @param file - file where data should end up
 *
 * @returns Resolved on download completion
 */
export async function downloadToFile(url: string, file: string, options): Promise<void> {
    options = options || {};
    logger.info(`Downloading File: ${url}`);
    logger.info(`Options: ${JSON.stringify(options)}`);
    await new Promise((resolve, reject) => {
        request({
            url: url,
            method: 'GET',
            strictSSL: options.verifyTls ? options.verifyTls : true
        })
            .on('error', (err) => {
                reject(err);
            })
            .pipe(fs.createWriteStream(file))
            .on('error', (err) => {
                reject(err);
            })
            .on('finish', resolve);
    })
        .catch(err => Promise.reject(err));
}

/**
 * Verifies that directory exists or create directory
 *
 * @param directory
 *
 * @returns void
 */
export function verifyDirectory(directory): void {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

/**
 * Verify file against provided hash
 *
 * @param file local file location
 * @param hash expected SHA 256 hash
 *
 * @returns true/false based on hash verification result
 */
export function verifyHash(file: string, extensionHash: string): boolean {
    const createHash = crypto.createHash('sha256');
    const input = fs.readFileSync(file);
    createHash.update(input);
    const computedHash = createHash.digest('hex');

    if (extensionHash !== computedHash) {
        return false;
    }
    return true;
}

/**
 * Base64 encoder/decoder
 *
 * @param action - decode|encode
 * @param data - data to process
 *
 * @returns Returns processed data as a string
 */
export function base64(action: string, data: string): string{
    // support decode|encode actions
    if (action === 'decode') {
        return Buffer.from(data, 'base64').toString().trim();
    }
    if (action === 'encode') {
        return Buffer.from(data).toString('base64');
    }
    throw new Error('Unsupported action, try one of these: decode, encode');
}

/**
 * Function retrier
 *
 * @param func
 * @param args
 * @param options
 *
 * @returns response
 */
export async function retrier(
    func: Function,
    args: Array<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: {
        thisContext?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        maxRetries?: number;
        retryInterval?: number;
    }): Promise<object> {
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
}

/**
 * Load data
 *
 * @param location              - data location
 * @param options                - function options
 * @param [options.locationType] - location type, file|url
 *
 * @returns Returns loaded data
 */
export function loadData(location: string, options?: {
                            locationType?: string;
                            verifyTls?: boolean;
                         }): Promise<object> {
    options = options || {};
    const locationType = options.locationType;
    const urlObject = URL.parse(location);

    if (urlObject.protocol === 'file:') {
        return Promise.resolve(JSON.parse(fs.readFileSync(urlObject.path, 'utf8')));
    } else if ((urlObject.protocol === 'http:' || urlObject.protocol === 'https:') && locationType === 'url') {
        logger.info(`Loading file via url - options: ${JSON.stringify(options)} `);
        return new Promise<object>((resolve, reject) => {
            request({
                url: location,
                method: 'GET',
                strictSSL: options.verifyTls ? options.verifyTls : true
            }, (error, resp, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(body));
                }
            });
        })
            .catch(err => Promise.reject(err));

    }
    return Promise.reject(new Error(`Unknown url type: ${urlObject.protocol}`));
}

/**
 * Renders secrets
 *
 * @param data                    - String with token to replace
 * @param value                   - token name to secret value map (JSON)
 *
 * @returns {promise} Returns string with replaced tokens
 */
export async function renderData(template: string, value: object): Promise<string> {
    return Mustache.render(template, value);
}

/**
 * Runs a shell command and returns the output
 *
 * @param {String} commands - Command to run
 *
 * @returns {Promise} A promise which is resolved with the results of the
 *                    command or rejected if an error occurs.
 */
export async function runShellCommand(command): Promise<string> {
    const exec = nodeUtil.promisify(childProcess.exec);
    const { stdout, stderr } = await exec(command);
    if (stderr) {
        return stderr;
    }
    return stdout;
}

/**
 * Make request (HTTP)
 *
 * @param uri                   [uri]
 * @param options               [function options]
 * @param [options.method]      [HTTP method, defaults to 'GET']
 * @param [options.headers]     [HTTP headers]
 * @param [options.body] [HTTP body]
 * @param [options.bodyType]    [body type, such as 'raw']
 *
 * @returns {Promise} Resolves on successful response - { code: 200, data: '' }
 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
export async function makeRequest(uri: string, options?: {
    method?: string;
    headers?: object;
    verifyTls?: boolean;
    body?: unknown;
    bodyType?: string;
}): Promise<{
    code: number;
    body?: any;
}> {
    options = options || {};

    if (options.bodyType === 'raw') {
        // continue
    } else {
        options.body = JSON.stringify(options.body);
    }

    const requestOptions = {
        url: uri,
        method: options.method || 'GET',
        headers: Object.assign(
            options.headers || {}
        ),
        body: options.body || null,
        strictSSL: options.verifyTls ? options.verifyTls : true
    };

    logger.info(`Making request: ${requestOptions.method} ${uri} verifyTls: ${requestOptions.strictSSL}`);

    const response: {
        code: number;
        body: any;
    } = await new Promise((resolve, reject) => {
        request(requestOptions, (error, resp, body) => {
            if (error) {
                reject(error);
            } else {
                try {
                    resolve({ code: resp.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ code: resp.statusCode, body: body });
                }
            }
        });
    });

    logger.info(`Request response: ${response.code} ${stringify(response.body)}`);

    return { code: response.code, body: response.body };
}
