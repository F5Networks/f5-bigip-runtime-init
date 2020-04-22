/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const request = require('request');
const yaml = require('js-yaml');
const icrdk = require('icrdk'); // eslint-disable-line import/no-extraneous-dependencies
const constants = require('../constants.js');

const deploymentFile = process.env[constants.DEPLOYMENT_FILE_VAR]
    || path.join(process.cwd(), constants.DEPLOYMENT_FILE);

const declarationFile = process.env[constants.DECLARATION_FILE_VAR]
    || path.join(process.cwd(), constants.DECLARATION_FILE);

module.exports = {
    /**
     * Get host info
     *
     * @returns {Object} Returns
     * [ { ip: x.x.x.x, username: admin, password: admin, primary: true } ]
     */
    getHostInfo() {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const hosts = require(deploymentFile).instances.map((item) => {
            item = {
                ip: item.mgmt_address,
                port: item.mgmt_port,
                username: item.admin_username,
                password: item.admin_password
            };
            return item;
        });
        return hosts;
    },


    /**
     * Get installed declaration
     *
     * @returns {Object} declaration for the
     *
     */

    getInstalledDeclaration(host, port, authToken, packageName) {
        const opts = {
            HOST: host,
            PORT: port,
            AUTH_TOKEN: authToken,
            headers: {
                'x-f5-auth-token': authToken
            }
        };

        return this.makeRequest(host, constants.PACKAGES_URI[packageName], opts)
            .then(data => (data))
            .catch((err) => {
                const msg = `getInstalledDeclaration: ${err}`;
                throw new Error(msg);
            });
    },

    /**
     * Get delcaration used with deployment
     *
     * @returns {Object} JSON version of YAML file used during deployment
     *
     */

    getDeclaration() {
        return yaml.safeLoad(fs.readFileSync(declarationFile, 'utf8'));
    },

    /**
     * Get package metadata
     *
     * @returns {Object} Returns metadata for AT packages
     *
     */
    getPackagesMetadata() {
        const requestOptions = {
            uri: constants.AT_PACKAGES_METADATA_URI,
            method: 'GET',
            body: undefined,
            headers: {},
            strictSSL: false
        };

        return new Promise((resolve, reject) => {
            request(requestOptions, (err, res, body) => {
                if (err) {
                    reject(new Error(`HTTP error for '${constants.AT_PACKAGES_METADATA_URI}' : ${err}`));
                } else if (res.statusCode >= 200 && res.statusCode <= 299) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} ${res.body} for '${constants.AT_PACKAGES_METADATA_URI}'`;
                    err = new Error(msg);
                    err.statusCode = res.statusCode;
                    err.statusMessage = res.statusMessage;
                    reject(err);
                }
            });
        });
    },

    /**
     * Get environment info
     *
     * @returns {Object} Returns:
     *  {
     *      deploymentId: 'foo',
     *      environment: 'foo',
     *      region: 'foo',
     *      zone: 'foo',
     *      networkTopology: 'foo'
     *  }
     */
    getEnvironmentInfo() {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        const deploymentInfo = require(deploymentFile);
        return {
            environment: deploymentInfo.environment,
            deploymentId: deploymentInfo.deploymentId,
            region: deploymentInfo.region || null, // optional: used by AWS|GCP
            zone: deploymentInfo.zone || null, // optional: used by GCP
            networkTopology: deploymentInfo.networkTopology || null // optional: used by AWS
        };
    },

    /**
     * Make options (HTTP)
     *
     * @param {Object}  options            - function options
     * @param {String} [options.authToken] - Authentication token
     *
     * @returns {Object}
     */
    makeOptions(options) {
        options = options || {};
        const retOptions = {};
        if (options.authToken) {
            retOptions.headers = {
                'x-f5-auth-token': options.authToken
            };
        }
        return retOptions;
    },

    /**
     * Perform HTTP request
     *
     * @param {String}  host               - HTTP host
     * @param {String}  uri                - HTTP uri
     * @param {Object}  options            - function options
     * @param {Integer} [options.port]     - HTTP port, default is 443
     * @param {String}  [options.protocol] - HTTP protocol, default is https
     * @param {String}  [options.method]   - HTTP method, default is GET
     * @param {String}  [options.body]     - HTTP body
     * @param {Object}  [options.headers]  - HTTP headers
     *
     * @returns {Object} Returns promise resolved with response
     */
    makeRequest(host, uri, options) {
        options = options || {};
        const port = options.port === undefined ? constants.REQUEST.PORT : options.port;
        const protocol = options.protocol === undefined ? constants.REQUEST.PROTOCOL : options.protocol;

        host = host.endsWith('/') ? host.slice(0, host.length - 1) : host;
        uri = uri || '';
        uri = uri.startsWith('/') ? uri : `/${uri}`;

        const fullUri = `${protocol}://${host}:${port}${uri}`;
        const requestOptions = {
            uri: fullUri,
            method: options.method || 'GET',
            body: options.body ? this.stringify(options.body) : undefined,
            headers: options.headers || {},
            strictSSL: false
        };

        return new Promise((resolve, reject) => {
            request(requestOptions, (err, res, body) => {
                if (err) {
                    reject(new Error(`HTTP error for '${fullUri}' : ${err}`));
                } else if (res.statusCode >= 200 && res.statusCode <= 299) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    const msg = `Bad status code: ${res.statusCode} ${res.statusMessage} ${res.body} for '${fullUri}'`;
                    err = new Error(msg);
                    err.statusCode = res.statusCode;
                    err.statusMessage = res.statusMessage;
                    reject(err);
                }
            });
        });
    },

    /**
     * Get auth token
     *
     * @param {String} host     - host
     * @param {String} port     - port
     * @param {String} username - username
     * @param {String} password - password
     *
     * @returns {Promise} Returns promise resolved with auth token: { token: 'token' }
     */
    getAuthToken(host, port, username, password) {
        const uri = '/mgmt/shared/authn/login';
        const body = this.stringify({
            username,
            password,
            loginProviderName: 'tmos'
        });
        const postOptions = {
            port,
            method: 'POST',
            body
        };

        return this.makeRequest(host, uri, postOptions)
            .then(data => ({ token: data.token.token }))
            .catch((err) => {
                const msg = `getAuthToken: ${err}`;
                throw new Error(msg);
            });
    },

    /**
     * Query installed ILX packages
     *
     * @param {String} host      - host
     * @param {String} port      - port
     * @param {String} authToken - auth token
     *
     * @returns {Promise} Returns promise resolved upon completion
     */
    queryPackages(host, port, authToken) {
        const opts = {
            HOST: host,
            PORT: port,
            AUTH_TOKEN: authToken,
            // below should not be required, there is a bug in icrdk
            // https://github.com/f5devcentral/f5-icontrollx-dev-kit/blob/master/lib/util.js#L322
            headers: {
                'x-f5-auth-token': authToken
            }
        };

        return new Promise((resolve, reject) => {
            icrdk.queryInstalledPackages(opts, (err, results) => {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        });
    },

    /** Create directory
     *
     * @param {String} path - file path
     */
    createDirectory(_path) {
        if (!fs.existsSync(_path)) {
            try {
                fs.mkdirSync(_path);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            }
        }
    },

    /**
     * Stringify a message
     *
     * @param {Object|String} msg - message to stringify
     *
     * @returns {Object} Stringified message
     */
    stringify(msg) {
        if (typeof msg === 'object') {
            try {
                msg = JSON.stringify(msg);
            } catch (e) {
                // just leave original message intact
            }
        }
        return msg;
    }
};
