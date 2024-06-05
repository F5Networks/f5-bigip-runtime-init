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

import * as https from 'https';
import HttpsProxyAgent = require('https-proxy-agent');
import * as fs from 'fs';
import * as url from 'url';
import * as nodeUtil from 'util';
import * as childProcess from 'child_process';
import * as crypto from 'crypto';
import * as FormData from 'form-data';
import Mustache from 'mustache';
import * as yaml from 'js-yaml';
import * as constants from '../constants';
import Logger from './logger';

const axios = require('axios').default;
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
export function convertTo(data, type): any { /* eslint-disable-line @typescript-eslint/no-explicit-any */
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
* Sends HTTP request
*
* @param {String}  host                         - HTTP host
* @param {String}  uri                          - HTTP uri
* @param {Object}  options                      - function options
* @param {String}  [options.method]             - HTTP method
* @param {String}  [options.auth]               - HTTP auth
* @param {String}  [options.protocol]           - HTTP protocol
* @param {Integer} [options.port]               - HTTP port
* @param {Object}  [options.queryParams]        - HTTP query parameters
* @param {String}  [options.body]               - HTTP body
* @param {Object}  [options.formData]           - HTTP form data
* @param {Object}  [options.headers]            - HTTP headers
* @param {Object}  [options.httpsAgent]         - HTTPS Client or Proxy object
* @param {Boolean} [options.continueOnError]    - continue on error (return info even if response contains error code)
* @param {Boolean} [options.advancedReturn]     - advanced return (return status code AND response body)
* @param {Boolean} [options.responseType]       - expected type of the response
* @param {Boolean} [options.validateStatus]     - validate response status codes
* @param {String}  [options.bodyType]           - HTTP body type
* @param {Boolean} [options.verifyTls]          - HTTP verifyTls
* @param {Object}  [options.trustedCertBundles] - Request trusted cert bundles
*
* @returns {Promise} Resolves on successful response - { code: 200, body: '', headers: {} }
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function makeRequest(host: string, uri: string, options?: {
    method?: string;
    auth?: object;
    protocol?: string;
    port?: number;
    queryParams?: object;
    body?: unknown;
    formData?: Array<unknown>;
    headers?: object;
    httpsAgent?: object;
    continueOnError?: boolean;
    advancedReturn?: boolean;
    responseType?: string;
    validateStatus?: boolean;
    bodyType?: string;
    verifyTls?: boolean;
    trustedCertBundles?: Array<string>;
}): Promise<{
    code?: number;
    body?: any;
    headers?: object;
    data?: any;
}> {
    options.protocol = options.protocol ? options.protocol.replace(/:/g, "") : 'https';
    options.port = options.port || 443;
    options.body = options.body || '';
    options.headers = options.headers || {};
    let formData;
    if (options.formData) {
        formData = new FormData.default();
        options.formData.forEach((el: any) => {
            formData.append(
                el.name,
                el.data,
                {
                    filename: el.fileName || null,
                    contentType: el.contentType || null
                }
            );
        });
        Object.assign(options.headers, formData.getHeaders());
    }

    const trustedCertBundles = [];
    const agentOpts = {
        rejectUnauthorized: true,
    };
    if (options.trustedCertBundles && options.trustedCertBundles.length > 0) {
        for (let i = 0; i < options.trustedCertBundles.length; i += 1) {
            trustedCertBundles.push(fs.readFileSync(options.trustedCertBundles[i]));
        }
        agentOpts['ca'] = trustedCertBundles;
    } else {
        agentOpts.rejectUnauthorized = options.verifyTls !== undefined ? options.verifyTls : true;
    }
    let httpsAgent = new https.Agent(agentOpts);

    let proxy = null;  
    const useProxy = (process.env['PROXY_ENV']) && 
        (Object.keys(JSON.parse(process.env['PROXY_ENV'])).length !== 0) && 
            (host !== 'localhost') && 
                (Object.values(constants.METADATA_HOST).indexOf(host) === -1);

    if (useProxy) {
        proxy = JSON.parse(process.env['PROXY_ENV']);
        if (options.protocol === 'https') {
            const proxyAuth = proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}@` : '';
            const proxyUrl = `${proxy.protocol}://${proxyAuth}${proxy.host}:${proxy.port}`;
            httpsAgent = new HttpsProxyAgent(proxyUrl);
        }
    }

    const requestOptions = {
        url: uri,
        baseURL: `${options.protocol}://${host}:${options.port}`,
        method: options.method || 'GET',
        auth: options.auth || null,
        withCredentials: options.auth !== null,
        headers: options.headers,
        responseType: options.responseType || 'json',
        data: options.formData ? formData : options.body,
        httpsAgent,
        proxy: options.protocol === 'https' ? false : proxy,
        validateStatus: options.validateStatus || false
    };

    return Promise.resolve()
        .then(() => axios.request(requestOptions))
        .then((response) => {
            // check for HTTP errors
            if (response.status > 300 && !options.continueOnError) {
                return Promise.reject(new Error(
                    `HTTP request failed: ${response.status}}`
                ));
            } else {
                if (new RegExp(constants.LOGGER.ENDPOINTS_TO_HIDE_RESPONSE.join("|")).test(uri)) {
                    logger.silly(`Request response: ${response.status}`);
                } else {
                    logger.silly(`Request response: ${response.status} ${response.data}`);
                }
            }
            // check for advanced return
            if (options.advancedReturn === true) {
                return {
                    code: response.status,
                    body: response.data,
                    headers: response.headers
                };
            }
            return response.data;
        })
        .catch((err) => Promise.reject(new Error(JSON.stringify(err.message) || err)));
}

/**
 * Download HTTP payload to file
 *
 * @param url  - url
 * @param file - file where data should end up
 *
 * @returns Resolved on download completion
 */
export async function downloadToFile(location: string, file: string, options): Promise<void> {
    options = options || {};
    logger.silly(`Downloading File: ${location}`);
    const urlObject = url.parse(location);
    const trustedCertBundles = options.trustedCertBundles || undefined;

    const stream = fs.createWriteStream(file)

    const response = await makeRequest(urlObject.hostname, urlObject.path, {
        method: 'GET',
        port: Number(urlObject.port),
        protocol: urlObject.protocol,
        headers: Object.assign(
            options.headers || {}
        ),
        trustedCertBundles: trustedCertBundles,
        verifyTls: options.verifyTls !== undefined ? options.verifyTls : true,
        responseType: 'stream',
        advancedReturn: true,
        continueOnError: false
    })

    response.body.pipe(stream)

    return new Promise((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
    })
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
export async function loadData(location: string, options?: {
    locationType?: string;
    verifyTls?: boolean;
    trustedCertBundles?: Array<string>;
}): Promise<object> {
    options = options || {};
    const locationType = options.locationType;
    const urlObject = url.parse(location);
    const trustedCertBundles = options.trustedCertBundles || undefined;

    if (urlObject.protocol === 'file:') {
        return Promise.resolve(JSON.parse(fs.readFileSync(urlObject.path, 'utf8')));
    } else if ((urlObject.protocol === 'http:' || urlObject.protocol === 'https:') && locationType === 'url') {
        logger.silly(`Loading file via url - options: ${JSON.stringify(options)} `);

        const response = await makeRequest(urlObject.hostname, urlObject.path, {
            method: 'GET',
            port: Number(urlObject.port),
            protocol: urlObject.protocol,
            trustedCertBundles: trustedCertBundles,
            verifyTls: options.verifyTls !== undefined ? options.verifyTls : true,
            advancedReturn: true
        })

        if (typeof response.body === 'object') {
            return Promise.resolve(response.body);
        } else {
            try {
                const parsedData = yaml.load(response.body);
                return Promise.resolve(parsedData);
            } catch (e) {
                return Promise.reject(new Error('The config loaded from the URL is not valid JSON or YAML.'));
            }
        }
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
