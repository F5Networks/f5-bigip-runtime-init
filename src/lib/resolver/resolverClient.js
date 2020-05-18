/* eslint-disable no-unused-vars */
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

const logger = require('../logger.js');
const CloudFactory = require('../cloud/cloudFactory.js');

/** Resolver class */
class ResolverClient {
    /**
     * Resolves runtime parameters
     *
     * @param {Array} runtimeParameters       - list of runtime parameters
     *
     *
     * @returns {Promise}                     - resolves with map of runtime parameters
     */
    async resolveRuntimeParameters(runtimeParameters) {
        const results = {};
        const secrets = [];
        const promises = [];
        for (let i = 0; i < runtimeParameters.length; i += 1) {
            if (runtimeParameters[i].type === 'static') {
                results[runtimeParameters[i].name] = runtimeParameters[i].value;
            } else if (runtimeParameters[i].type === 'secret') {
                promises.push(this._resolveHelper(
                    runtimeParameters[i].name,
                    this._resolveSecret(runtimeParameters[i])
                ));
            } else if (runtimeParameters[i].type === 'metadata') {
                promises.push(this._resolveHelper(
                    runtimeParameters[i].name,
                    this._resolveMetadata(runtimeParameters[i])
                ));
            } else {
                throw new Error('Runtime parameter type is unknown. Must be one of [ secret, static ]');
            }
        }
        if (promises.length > 0) {
            const resolvedParams = await Promise.all(promises);

            resolvedParams.forEach((item) => {
                if (item.value && item.value !== '') {
                    results[item.name] = item.value;
                }
            });
        }
        return results;
    }

    /**
     * Helper function to resolve Promise
     *
     * @param {string} name                 - list of runtime parameters
     * @param {Promise} name                - Promise to resolve
     *
     *
     * @returns {Object}                    - object which includes { name, value }
     */
    async _resolveHelper(name, promise) {
        return Promise.resolve(promise)
            .then((data) => {
                const object = {};
                object.name = name;
                object.value = data;
                return object;
            });
    }

    /**
     * Resolves secret using cloud client
     *
     * @param {Object} secretMetadata          - list of runtime parameters
     *
     *
     * @returns {Promise}                      - resolves with secret value
     */
    async _resolveSecret(secretMetadata) {
        const _cloudClient = CloudFactory.getCloudProvider(
            secretMetadata.secretProvider.environment,
            { logger }
        );
        await _cloudClient.init();
        const secretValue = await _cloudClient.getSecret(
            secretMetadata.secretProvider.secretId,
            secretMetadata.secretProvider
        );
        return secretValue;
    }

    /**
     * Resolves metadata using cloud client
     *
     * @param {Object} metadataMetadata        - list of runtime parameters
     *
     *
     * @returns {Promise}                      - resolves with metadata value
     */
    async _resolveMetadata(metadataMetadata) {
        const _cloudClient = CloudFactory.getCloudProvider(
            metadataMetadata.metadataProvider.environment,
            { logger }
        );
        await _cloudClient.init();
        const metadataValue = await _cloudClient.getMetadata(
            metadataMetadata.metadataProvider.field,
            metadataMetadata.metadataProvider
        );
        return metadataValue;
    }
}

module.exports = ResolverClient;
