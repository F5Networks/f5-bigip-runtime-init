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
import * as netmask from 'netmask';
import Logger from '../logger';
import { getCloudProvider } from '../cloud/cloudFactory';
import * as utils from '../utils';
import * as constants from '../../constants';
import {HashicorpVaultClient} from "../provider/secret";

let logger = Logger.getLogger();

interface RuntimeParameter {
    type: string;
    name: string;
    value: string;
    returnType: string;
    ipcalc: string;
    secretProvider: {
        field: string;
        environment: string;
        type: string;
    };
    metadataProvider: {
        environment: string;
        type: string;
        field: string;
        index: number;
    };
    tagProvider: {
        environment: string;
        key: string;
    };
}

interface OnboardActions {
    type: string;
    name: string;
    commands: string[];
    verifyTls?: boolean;
    trustedCertBundles?: Array<string>;
}

/** Resolver class */
export class ResolverClient {
    utilsRef;
    getCloudProvider = getCloudProvider;
    cloudClients;
    constructor(){
        this.utilsRef = utils;
        this.cloudClients = {};
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
    async resolveRuntimeParameters(parameters: RuntimeParameter[], previousResults, controlNumber): Promise<any> {
        const results = {};
        const promises = [];
        const requiredOtherParameters = [];
        await this._preProcessParametersValues(parameters);
        for (let i = 0; i < parameters.length; i += 1) {

            if (JSON.stringify(parameters[i]).indexOf('{{{') !== -1 &&  JSON.stringify(parameters[i]).indexOf('}}}') !== -1) {
                requiredOtherParameters.push(parameters[i]);
                continue;
            }

            if (parameters[i].type === 'static') {
                if (parameters[i].ipcalc !== undefined && parameters[i].value.split('.').length === 4 ){
                    results[parameters[i].name] = this._resolveIpcalc(parameters[i].ipcalc, parameters[i].value, parameters[i].returnType);
                } else {
                    results[parameters[i].name] = utils.convertTo(parameters[i].value, parameters[i].returnType);
                }
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
                if (parameters[i].value.indexOf('file:///') === -1) {
                    promises.push(this._resolveHelper(
                        parameters[i].name,
                        this._resolveUrl(parameters[i])
                    ));
                } else {
                    promises.push(this._resolveHelper(
                        parameters[i].name,
                        this._resolveFileContent(parameters[i])
                    ));
                }
            } else if (parameters[i].type === 'tag') {
                promises.push(this._resolveHelper(
                    parameters[i].name,
                    this._resolveTagValue(parameters[i])
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

        const mergedResult = {};
        for(const key in results) {
            mergedResult[key] = results[key];
        }
        for(const key in previousResults){
            mergedResult[key] = previousResults[key];
        }

        if (requiredOtherParameters.length > 0) {
            // Require re-processing some parameters after rendering values
            const updatedParameters = JSON.parse(await utils.renderData(JSON.stringify(requiredOtherParameters), mergedResult));
            if (requiredOtherParameters.length !== controlNumber) {
                return this.resolveRuntimeParameters(updatedParameters, mergedResult, requiredOtherParameters.length);
            }
        }
        return mergedResult;
    }

    /**
     * Resolves onboard actions
     *
     * @param actions                 - list of on-board actions need to be performed on BIGIP device
     * @param containsSecrets         - whether this set of actions contains a secret or not
     *
     *
     * @returns                       - resolves when all actions completed
     */
    async resolveOnboardActions(actions: OnboardActions[], containsSecrets = false): Promise<void> {
        this.utilsRef.verifyDirectory(constants.CUSTOM_ONBOARD_CONFIG_DIR);
        for (let i = 0; i < actions.length; i += 1) {
            for (let j = 0; j < actions[i].commands.length; j += 1) {
                if (actions[i].type === 'inline') {
                    if (containsSecrets){
                        logger.info(`Executing inline shell command`);
                        logger.debug(`command: ${actions[i].commands[j]}`);
                    }
                    else{
                        logger.info(`Executing inline shell command: ${actions[i].commands[j]}`);
                    }
                    const response = await this.utilsRef.runShellCommand(actions[i].commands[j]);
                    if (containsSecrets){
                        logger.info(`Shell command: One or more commands contains a secret, skipping logging command and output`);
                        logger.debug(`${actions[i].commands[j]} execution completed; response: ${response}`);
                    }
                    else{
                        logger.info(`Shell command: ${actions[i].commands[j]} execution completed; response: ${response}`);
                    }
                } else if (actions[i].type === 'url' || actions[i].type === 'file') {
                    if (containsSecrets){
                        logger.info(`Executing bash script`);
                        logger.debug(`script: ${actions[i].commands[j]}`);
                    }
                    else{
                        logger.info(`Executing bash script ${actions[i].commands[j]}`);
                    }
                    let base64ScriptName;
                    if (actions[i].type === 'url') {
                        base64ScriptName = `${constants.CUSTOM_ONBOARD_CONFIG_DIR}${Buffer.from(`${actions[i].name}_${j}`).toString('base64')}`;
                        await this.utilsRef.downloadToFile(actions[i].commands[j], base64ScriptName, {
                            verifyTls: 'verifyTls' in actions[i] ? actions[i].verifyTls : true,
                            trustedCertBundles: 'trustedCertBundles' in actions[i] ? actions[i].trustedCertBundles : undefined
                        });
                    } else {
                        base64ScriptName = actions[i].commands[j];
                    }
                    const response = await this.utilsRef.runShellCommand(`bash ${base64ScriptName}`);
                    if (containsSecrets){
                        logger.info(`Bash script: One or more commands contains a secret, skipping logging command and output`);
                        logger.debug(`${actions[i].name} execution completed; response: ${response}`);
                    }
                    else{
                        logger.info(`Bash script: ${actions[i].name} execution completed; response: ${response}`);
                    }

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
    async _resolveSecret(secretMetadata): Promise<any> {
        let secretValue;
        if (secretMetadata.secretProvider.environment === 'hashicorp') {
            const hashicorpVaultClient = new HashicorpVaultClient();
            await hashicorpVaultClient.login(secretMetadata);
            secretValue = await hashicorpVaultClient.getSecret(secretMetadata);
        } else {
            const _cloudClient = this.cloudClients[secretMetadata.secretProvider.environment];
            secretValue = await _cloudClient.getSecret(
                secretMetadata.secretProvider.secretId,
                secretMetadata.secretProvider
            );
        }
        return utils.convertTo(secretValue, secretMetadata.returnType);
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
        const _cloudClient = this.cloudClients[metadataMetadata.metadataProvider.environment];
        const _metadataField = metadataMetadata.metadataProvider.value || metadataMetadata.metadataProvider.field;
        const metadataValue = await _cloudClient.getMetadata(
            _metadataField,
            metadataMetadata.metadataProvider
        );
        if (metadataMetadata.metadataProvider.ipcalc !== undefined && metadataValue.split('.').length === 4 ){
            return this._resolveIpcalc(metadataMetadata.metadataProvider.ipcalc, metadataValue, metadataMetadata.returnType);
        }
        return utils.convertTo(metadataValue, metadataMetadata.returnType);
    }

    /**
     * Resolves tag value using provided key
     *
     * @param metadataMetadata     - list of runtime parameters
     *
     *
     * @returns                    - resolves with metadata value
     */
    async _resolveTagValue(metadata): Promise<string> {
        const _cloudClient = this.cloudClients[metadata.tagProvider.environment];
        const metadataValue = await _cloudClient.getTagValue(
            metadata.tagProvider.key,
            metadata.tagProvider
        );
        return utils.convertTo(metadataValue, metadata.returnType);
    }


    /**
     * Reads file content to resolve parameter
     *
     * @param metadata     - list of runtime parameters
     *
     *
     * @returns                    - resolves with metadata value
     */
    async _resolveFileContent(metadata): Promise<string> {
        const fileLocation = metadata.value.replace('file://', '');
        return this.utilsRef.readFileContent(fileLocation);
    }

    async _resolveUrl(metadata): Promise<string> {
        const options: {
            method: string;
            headers?: any;
            verifyTls?: boolean;
            trustedCertBundles?: Array<string>;
        } = {
            method: 'GET',
            headers: {},
            verifyTls: metadata.verifyTls !== undefined ? metadata.verifyTls : true,
            trustedCertBundles: metadata.trustedCertBundles !== undefined ? metadata.trustedCertBundles : undefined
        };
        if (metadata.headers !== undefined && metadata.headers.length > 0) {
            metadata.headers.forEach((header) => {
                if (header.name === 'method') {
                    options.method = header.value;
                } else {
                    options.headers[header.name] = header.value;
                }
            });
        }
        const response = await utils.retrier(utils.makeRequest, [metadata.value, options], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
        });
        if ( metadata.query !== undefined ) {
            try {
                const searchResult = jmesPath.search(response.body, metadata.query);

                if (metadata.ipcalc !== undefined && searchResult.split('.').length === 4 ){
                    return this._resolveIpcalc(metadata.ipcalc, searchResult, metadata.returnType);
                }
                return utils.convertTo(searchResult, metadata.returnType);
            } catch (error) {
                throw new Error(`Error caught while searching json using jmesPath; Json Document: ${JSON.stringify(response.body)} - Query: ${metadata.query} - Error ${error.message}`);
            }
        } else {
            if (metadata.ipcalc !== undefined && response.split('.').length === 4 ){
                return this._resolveIpcalc(metadata.ipcalc, response, metadata.returnType);
            }
            return utils.convertTo(response.body, metadata.returnType);
        }
    }

    /**
     * Resolves ipcalc value
     *
     * @param ipcalcMethod         - ipcalc method
     * @oaram networkValue         - network value (i.e. 10.0.0.2/24)
     * @oaram returnType           - return type
     *
     *
     * @returns                    - returns result of ipcalc calculation
     */
    _resolveIpcalc(ipcalcMethod, networkValue, returnType): string {
        logger.silly(`ipcalc function resolved ${ipcalcMethod} element: ${new netmask.Netmask(networkValue)[ipcalcMethod]} of provided IPv4 CIDR`);
        if (ipcalcMethod === 'address') {
            return utils.convertTo(networkValue.split('/')[0], returnType);
        } else {
            return utils.convertTo(new netmask.Netmask(networkValue)[ipcalcMethod], returnType);
        }
    }

    /**
     * Pre-processes runtime parameters before resolving them
     *
     * @param parameters          - runtime parameters
     *
     *
     */
    async _preProcessParametersValues(parameters: RuntimeParameter[]): Promise<void> {
        for (let i = 0; i < parameters.length; i += 1) {
            // Step #1: Update logger with all sensitive fields
            if (parameters[i].type === 'secret') {
                if (parameters[i].secretProvider.field !== undefined) {
                    constants.LOGGER.FIELDS_TO_HIDE.push(parameters[i].secretProvider.field);
                }
            }
            // Step #2: Initialize all CloudClients to optimize Cloud APIs usage to eliminate unnecessary calls (i.e. for AWS init method does two calls to fetch token and iddoc each time)
            if (parameters[i].type === 'metadata') {
                if (!(parameters[i].metadataProvider.environment in this.cloudClients)) {
                    const _cloudClient = await this.getCloudProvider(
                        parameters[i].metadataProvider.environment,
                        { logger }
                    );
                    await _cloudClient.init();
                    this.cloudClients[parameters[i].metadataProvider.environment] = _cloudClient;
                }
            }
            else if(parameters[i].type === 'tag') {
                if (!(parameters[i].tagProvider.environment in this.cloudClients)) {
                    const _cloudClient = await this.getCloudProvider(
                        parameters[i].tagProvider.environment,
                        { logger }
                    );
                    await _cloudClient.init();
                    this.cloudClients[parameters[i].tagProvider.environment] = _cloudClient;
                }
            }
            else if(parameters[i].type === 'secret' && parameters[i].secretProvider.environment !== 'hashicorp') {
                if (!(parameters[i].secretProvider.environment in this.cloudClients)) {
                    const _cloudClient = await this.getCloudProvider(
                        parameters[i].secretProvider.environment,
                        { logger }
                    );
                    await _cloudClient.init();
                    this.cloudClients[parameters[i].secretProvider.environment] = _cloudClient;
                }
            }
        }
        logger = Logger.getLogger();
    }
}
