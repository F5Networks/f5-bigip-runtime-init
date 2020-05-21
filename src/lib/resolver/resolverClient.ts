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

import Logger from '../../lib/logger';
import { getCloudProvider } from '../cloud/cloudFactory';

const logger = Logger.getLogger();

interface RuntimeParameter {
    type: string;
    name: string;
    value: string;
}

/** Resolver class */
export class ResolverClient {
    /**
     * Resolves runtime parameters
     *
     * @param {Array} parameters       - list of runtime parameters
     *
     *
     * @returns {Promise}                     - resolves with map of runtime parameters
     */
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    async resolveRuntimeParameters(parameters: RuntimeParameter[]): Promise<any> {
        const results = {};
        const promises = [];
        for (let i = 0; i < parameters.length; i += 1) {
            if (parameters[i].type === 'static') {
                results[parameters[i].name] = parameters[i].value;
            } else if (parameters[i].type === 'secret') {
                promises.push(this._resolveHelper(
                    parameters[i].name,
                    this._resolveSecret(parameters[i])
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
    async _resolveHelper(name, promise): Promise<{
        name: string;
        value: string;
    }> {
        return Promise.resolve(promise)
            .then((data) => {
                return {
                    name: name,
                    value: data
                };
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
    async _resolveSecret(secretMetadata): Promise<string> {
        const _cloudClient = getCloudProvider(
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
}
