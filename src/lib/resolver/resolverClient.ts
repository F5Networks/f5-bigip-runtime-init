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

import * as jmesPath from 'jmespath';
import Logger from '../logger';
import { getCloudProvider } from '../cloud/cloudFactory';
import * as utils from '../utils';
import * as constants from '../../constants';

const logger = Logger.getLogger();

interface RuntimeParameter {
    type: string;
    name: string;
    value: string;
}

interface OnboardActions {
    type: string;
    name: string;
    commands: string[];
    verifyTls?: boolean;
}

/** Resolver class */
export class ResolverClient {
    utilsRef;
    getCloudProvider = getCloudProvider;
    constructor(){
        this.utilsRef = utils;
    }
    /**
     * Resolves runtime parameters
     *
     * @param parameters        - list of runtime parameters
     *
     *
     * @returns                 - resolves with map of runtime parameters
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
            } else if (parameters[i].type === 'metadata') {
                promises.push(this._resolveHelper(
                    parameters[i].name,
                    this._resolveMetadata(parameters[i])
                ));
            } else if (parameters[i].type === 'url') {
                promises.push(this._resolveHelper(
                    parameters[i].name,
                    this._resolveUrl(parameters[i])
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
     * Resolves onboard actions
     *
     * @param actions                 - list of on-board actions need to be performed on BIGIP device
     *
     *
     * @returns                       - resolves when all actions completed
     */
    async resolveOnboardActions(actions: OnboardActions[]): Promise<void> {
        this.utilsRef.verifyDirectory(constants.CUSTOM_ONBOARD_CONFIG_DIR);
        for (let i = 0; i < actions.length; i += 1) {
            for (let j = 0; j < actions[i].commands.length; j += 1) {
                if (actions[i].type === 'inline') {
                    logger.debug(`Executing inline shell command: ${actions[i].commands[j]}`);
                    const response = await this.utilsRef.runShellCommand(actions[i].commands[j]);
                    logger.info(`Shell command: ${actions[i].commands[j]} execution completed; response: ${response}`);
                } else if (actions[i].type === 'url' || actions[i].type === 'file') {
                    logger.debug(`Executing bash script ${actions[i].commands[j]}`);
                    let base64ScriptName;
                    if (actions[i].type === 'url') {
                        base64ScriptName = `${constants.CUSTOM_ONBOARD_CONFIG_DIR}${Buffer.from(`${actions[i].name}_${j}`).toString('base64')}`;
                        await this.utilsRef.downloadToFile(actions[i].commands[j], base64ScriptName, {
                            verifyTls: 'verifyTls' in actions[i] ? actions[i].verifyTls : true
                        });
                    } else {
                        base64ScriptName = actions[i].commands[j];
                    }
                    const response = await this.utilsRef.runShellCommand(`bash ${base64ScriptName}`);
                    logger.info(`Bash script: ${actions[i].name} execution completed; response: ${response}`);

                } else {
                    throw new Error(`Unexpected onboard action type. Must be one of [ file, url, command ]. Recieved: ${actions[i].type}`);
                }
            }
        }
    }

    /**
     * Helper function to resolve Promise
     *
     * @param name                - list of runtime parameters
     * @param name                - Promise to resolve
     *
     *
     * @returns                   - object which includes { name, value }
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
     * @param secretMetadata       - list of runtime parameters
     *
     *
     * @returns                    - resolves with secret value
     */
    async _resolveSecret(secretMetadata): Promise<string> {
        const _cloudClient = await this.getCloudProvider(
            secretMetadata.secretProvider.environment,
            { logger }
        );
        await _cloudClient.init();
        if (secretMetadata.secretProvider.field !== undefined) {
            constants.LOGGER.FIELDS_TO_HIDE.push(secretMetadata.secretProvider.field);
        }
        const secretValue = await _cloudClient.getSecret(
            secretMetadata.secretProvider.secretId,
            secretMetadata.secretProvider
        );
        return secretValue;
    }

    /**
     * Resolves metadata using cloud client
     *
     * @param metadataMetadata     - list of runtime parameters
     *
     *
     * @returns                    - resolves with metadata value
     */
    async _resolveMetadata(metadataMetadata): Promise<string> {
        const _cloudClient = await this.getCloudProvider(
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

    async _resolveUrl(metadata): Promise<string> {
        const options: {
            method: string;
            headers?: any;
        } = {
            method: 'GET',
            headers: {}
        };
        if (metadata.headers !== undefined && metadata.headers.length > 0) {
            metadata.headers.forEach((header) => {
                options.headers[header.name] = header.value;
            });
        }
        const response = await utils.makeRequest(metadata.value, options);
        if ( metadata.query !== undefined ) {
            try {
                const searchResult = jmesPath.search(response.body, metadata.query);
                return searchResult;
            } catch (error) {
                throw new Error(`Error caught while searching json using jmesPath; Json Document: ${JSON.stringify(response.body)} - Query: ${metadata.query} - Error ${error.message}`);
            }
        } else {
            return response.body;
        }
    }
}
