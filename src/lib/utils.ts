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
import * as yaml from 'js-yaml';
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
    try {
        return JSON.stringify(data);
    } catch {
        return data.toString();
    }
}

/**
 * Convert to type
 *
 * @param data data to convert
 *
 * @returns converted data
 */
export function convertTo(data, type): any {
    if (type === 'string') {
        return data.toString();
    } else if (type === 'number') {
        return parseInt(data);
    } else if (type === 'boolean') {
        return !!data;
    }
    return data;
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
    logger.silly(`Downloading File: ${url}`);
    const trustedCertBundles = [];
    if (options.trustedCertBundles) {
        for (let i = 0; i < options.trustedCertBundles.length; i += 1) {
            trustedCertBundles.push(fs.readFileSync(options.trustedCertBundles[i]));
        }
    }
    await new Promise((resolve, reject) => {
        request({
            url: url,
            method: 'GET',
            headers: Object.assign(
                options.headers || {}
            ),
            ca: trustedCertBundles.length > 0 ? trustedCertBundles : undefined,
            strictSSL: options.verifyTls !== undefined ? options.verifyTls : true
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
 * Read file content
 *
 * @param file location
 *
 * @returns true/false based on hash verification result
 */
export function readFileContent(file: string): string {
    try{
        return fs.readFileSync(file, 'utf8').trim();
    } catch {
        return ''
    }
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
    }): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
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
            logger.silly(`${err}`);
        }

        if (error === null) {
            i = retryCount;
        } else {
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            i += 1;
            logger.silly(`Retrying... Attempts left: ${retryCount - i}`);
        }
    }

    if (error !== null) {
        logger.silly(`All ${retryCount} retry attempts failed. Terminating execution.`);
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
    trustedCertBundles?: Array<string>;
}): Promise<object> {
    options = options || {};
    const locationType = options.locationType;
    const urlObject = URL.parse(location);

    const trustedCertBundles = [];
    if (options.trustedCertBundles) {
        for (let i = 0; i < options.trustedCertBundles.length; i += 1) {
            trustedCertBundles.push(fs.readFileSync(options.trustedCertBundles[i]));
        }
    }

    if (urlObject.protocol === 'file:') {
        return Promise.resolve(JSON.parse(fs.readFileSync(urlObject.path, 'utf8')));
    } else if ((urlObject.protocol === 'http:' || urlObject.protocol === 'https:') && locationType === 'url') {
        logger.silly(`Loading file via url - options: ${JSON.stringify(options)} `);
        return new Promise<object>((resolve, reject) => {
            retrier(request, [{
                url: location,
                method: 'GET',
                ca: trustedCertBundles.length > 0 ? trustedCertBundles : undefined,
                strictSSL: options.verifyTls !== undefined ? options.verifyTls : true
            }, (error, resp, body) => { /* eslint-disable-line @typescript-eslint/explicit-function-return-type */
                if (error) {
                    reject(error);
                } else {
                    let parsedData = "";
                    try {
                        parsedData = JSON.parse(body);
                    } catch (e) {
                        parsedData = yaml.load(body);
                    }
                    if (typeof parsedData === 'object'){
                        resolve(parsedData);
                    }
                    else{
                        reject(new Error('The config loaded from the URL is not valid JSON or YAML.'));
                    }
                }
            }],{
                thisContext: this,
                maxRetries: this.maxRetries,
                retryInterval: this.retryInterval
            });
        })
            .catch(err => Promise.reject(err));

    }
    return Promise.reject(new Error(`Unknown url type: ${urlObject.protocol}`));
}

/**
 * Renders secrets
 *
 * @param template                - String with token to replace
 * @param value                   - token name to secret value map (JSON)
 *
 * @returns {promise} Returns string with replaced tokens
 */
export async function renderData(template: string, value: object): Promise<string> {
    return Mustache.render(template, value);
}

/**
 * Checks for secrets
 *
 * @param template                - String with possible tokens
 *
 * @returns true/false based on whether string has secret or not
 */
export function checkForSecrets(template: string): boolean {
    const parsed = Mustache.parse(template);
    if (parsed.length > 1) {
        return true;
    }
    return false;
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
 * Verifies that directory exists or create directory
 *
 * @param directory
 *
 * @returns {Promise}
 */
export async function verifyDirectory(directory): Promise<void> {
    if (!fs.existsSync(directory)) {
        const response = await runShellCommand(`mkdir -p ${directory}`);
        logger.silly(`verifyDirectory executed mkdir -p ${directory}; response: ${response}`);
        return Promise.resolve();
    }
    return Promise.resolve();
}

/**
 * Convert storage URL
 *
 * @param url   storage URL to convert
 *
 * @returns     returns converted storage URL as string
 */
 export function convertUrl(url: string): string {
    let data = url;
    let bucket = url.split('/')[2];
    let path = url.split(bucket + '/')[1];
    let encodedPath = '';
    const storageProtocol = url.split(bucket)[0];

    if (storageProtocol.startsWith('s3://')) {
        data = 'https://' + bucket + '.s3.amazonaws.com/' + path;
    } else if (storageProtocol.startsWith('gs://')) {
        encodedPath = encodeURIComponent(path);
        data = 'https://storage.googleapis.com/storage/v1/b/' + bucket + '/o/' + encodedPath + '?alt=media';
    } else if (storageProtocol.startsWith('https://') && bucket.startsWith('storage.cloud.google.com')) {
        bucket = path.split('/')[0];
        path = path.substring(path.indexOf("/") + 1);
        encodedPath = encodeURIComponent(path);
        data = 'https://storage.googleapis.com/storage/v1/b/' + bucket + '/o/' + encodedPath + '?alt=media';
    }
    return data;
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
    trustedCertBundles?: Array<string>;
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

    const trustedCertBundles = [];
    if (options.trustedCertBundles) {
        for (let i = 0; i < options.trustedCertBundles.length; i += 1) {
            trustedCertBundles.push(fs.readFileSync(options.trustedCertBundles[i]));
        }
    }

    const requestOptions = {
        url: uri,
        method: options.method || 'GET',
        headers: Object.assign(
            options.headers || {}
        ),
        body: options.body || null,
        ca: trustedCertBundles.length > 0 ?  trustedCertBundles : undefined,
        strictSSL: options.verifyTls !== undefined ? options.verifyTls : true
    };

    logger.silly(`Making request: ${requestOptions.method} ${uri} verifyTls: ${requestOptions.strictSSL}`);

    const response: {
        code: number;
        body: any;
    } = await new Promise((resolve, reject) => {
        retrier(request, [requestOptions, (error, resp, body) => { /* eslint-disable-line @typescript-eslint/explicit-function-return-type */
            if (error) {
                reject(error);
            } else {
                try {
                    if (body.indexOf('{') !== -1 && body.indexOf('}') !== -1) {
                        resolve({ code: resp.statusCode, body: JSON.parse(body) });
                    } else {
                        resolve({ code: resp.statusCode, body: body });
                    }
                } catch (e) {
                    resolve({ code: resp.statusCode, body: body });
                }
            }
        }], {
            thisContext: this,
            maxRetries: this.maxRetries,
            retryInterval: this.retryInterval
        });
    });

    if (new RegExp(constants.LOGGER.ENDPOINTS_TO_HIDE_RESPONSE.join("|")).test(uri)) {
        logger.silly(`Request response: ${response.code}`);
    } else {
        logger.silly(`Request response: ${response.code} ${stringify(response.body)}`);
    }

    return { code: response.code, body: response.body };
}
