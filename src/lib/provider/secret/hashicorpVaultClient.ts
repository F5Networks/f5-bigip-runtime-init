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

import Logger from "../../logger";
import * as utils from "../../utils";
import * as constants from "../../../constants";
import * as fs from "fs";
import * as url from 'url';

const logger = Logger.getLogger();


/** HashicorpVaultClient class */
export class HashicorpVaultClient {

    secretId;
    roleId;
    clientToken;
    utilsRef;

    constructor(){
        this.utilsRef = utils;
    }

    /**
     * Does call to Hashicorp Vault for unwrapping wrapped secret ID
     *
     * @param token          - token to unwrap
     * @param metadata       - metadata required for interacting with Hashicorp Vault
     *
     * @returns              - resolves with secret ID value
     */
    async _unwrapSecretId(token, secretMetadata): Promise<string> {
        logger.info(`Unwrapping token...`);
        const urlObject = url.parse(secretMetadata.secretProvider.vaultServer);
        const options: {
            method: string;
            port?: number;
            protocol?: string;
            headers?: object;
            verifyTls?: boolean;
            trustedCertBundles?: Array<string>;
            advancedReturn?: boolean;
        } = {
            method: 'POST',
            port: Number(urlObject.port),
            protocol: urlObject.protocol,
            headers: {
                'X-Vault-Token': token
            },
            verifyTls: secretMetadata.verifyTls !== undefined ? secretMetadata.verifyTls : true,
            trustedCertBundles: secretMetadata.trustedCertBundles !== undefined ? secretMetadata.trustedCertBundles : undefined,
            advancedReturn: true
        };

        const unwrapResponse = await this.utilsRef.retrier(utils.makeRequest,
            [`${urlObject.hostname}`, `/v${secretMetadata.secretProvider.version}/sys/wrapping/unwrap`,
                options], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
        });

        return Promise.resolve(unwrapResponse.body.data.secret_id)
    }

    /**
     * Does login call to Hashicorp Vault for getting secure token
     *
     * @param secretMetadata          - metadata required for interacting with Hashicorp Vault
     * @param secretMetadata          - metadata required for interacting with Hashicorp Vault
     *
     * @returns                       - resolves when login call is completed
     */
    /* eslint-disable  @typescript-eslint/camelcase */
    async login(secretMetadata): Promise<void> {
        await this._resolveId(secretMetadata.secretProvider.authBackend.roleId, 'roleId', secretMetadata);
        await this._resolveId(secretMetadata.secretProvider.authBackend.secretId, 'secretId', secretMetadata);
        
        const urlObject = url.parse(secretMetadata.secretProvider.vaultServer);
        const options: {
            method: string;
            port?: number;
            protocol?: string;
            headers?: object;
            body: object;
            verifyTls?: boolean;
            trustedCertBundles?: Array<string>;
            advancedReturn?: boolean;
            continueOnError?: boolean;
        } = {
            method: 'POST',
            port: Number(urlObject.port),
            protocol: urlObject.protocol,
            headers: {},
            body: {
                role_id: this.roleId,
                secret_id: this.secretId
            },
            verifyTls: secretMetadata.verifyTls !== undefined ? secretMetadata.verifyTls : true,
            trustedCertBundles: secretMetadata.trustedCertBundles !== undefined ? secretMetadata.trustedCertBundles : undefined,
            advancedReturn: true,
            continueOnError: true
        };
        const appRolePath = secretMetadata.secretProvider.appRolePath !== undefined ? secretMetadata.secretProvider.appRolePath : '/v1/auth/approle/login'
        const loginResponse = await utils.retrier(utils.makeRequest, [`${urlObject.hostname}`, appRolePath, options], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
        });

        if (loginResponse.code === 200 && loginResponse.body.auth.client_token) {
            this.clientToken = loginResponse.body.auth.client_token;
        } else {
            logger.error(`Problem with getting client token from HashicorpVaultClient`);
            return Promise.reject(new Error(`Problem with getting client token from HashicorpVaultClient`));
        }
        return Promise.resolve();
    }

    /**
     * Resolves roleId used for accessing Hashicorp Vault
     *
     * @param metadata             - role metadata
     * @param type                 - role or secret
     * @param options.verifyTls    - enables secure site verification
     * @param options.trustedCertBundles        - list of paths to certificates bundles
     *
     *
     * @returns                    - resolves with role id value
     */
    async _resolveId(metadata, type, options?): Promise<void> {
        if (metadata.type === 'url') {
            let content;
            if (metadata.value.indexOf('file://') !== -1) {
                content = fs.readFileSync(metadata.value.split('file://')[1], 'utf8');
            } else {
                const urlObject = url.parse(metadata.value);
                const response = await this.utilsRef.retrier(utils.makeRequest,
                    [`${urlObject.hostname}`, `${urlObject.path}`,
                        {
                            method: 'GET',
                            port: Number(urlObject.port),
                            protocol: urlObject.protocol,
                            verifyTls: options.verifyTls !== undefined ? options.verifyTls : true,
                            trustedCertBundles: options.trustedCertBundles !== undefined ? options.trustedCertBundles : undefined,
                            advancedReturn: true
                        }], {
                        thisContext: this,
                        maxRetries: constants.RETRY.SHORT_COUNT,
                        retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
                    });
                content = response.body;
            }
            try {
                if (type === 'secretId') {
                    if (typeof content === 'object') {
                        this.secretId = content.secret_id;
                    } else {
                        this.secretId = JSON.parse(content).secret_id;
                    }
                } else if (type === 'roleId') {
                    if (typeof content === 'object') {
                        this.roleId = content.role_id;
                    } else {
                        this.roleId = JSON.parse(content).role_id;
                    }
                }
            } catch (e){
                logger.silly('Attempt to access RoleId/SecretId as JSON fields failed. Using received content as plain text');
                if (type === 'secretId') {
                    this.secretId = content;
                } else if (type === 'roleId') {
                    this.roleId = content;
                }
            }
        } else {
            if (type === 'secretId') {
                this.secretId = metadata.value;
            } else if (type === 'roleId') {
                this.roleId =  metadata.value;
            }
        }
        metadata.unwrap = metadata.unwrap !== undefined ? metadata.unwrap : true
        if (type === 'secretId' && metadata.unwrap) {
            try {
                this.secretId = await this._unwrapSecretId(this.secretId, options);
            } catch (e){
                throw new Error(`Could not unwrap token`);
            }
        }
        return Promise.resolve();
    }


    /**
     * Gets secret from Hashicorp Vault
     *
     * @param secretMetadata          - metadata required for interacting with Hashicorp Vault
     *
     *
     * @returns                       - resolves when login call is completed
     */
    async getSecret(secretMetadata): Promise<any> { /* eslint-disable-line  @typescript-eslint/no-explicit-any */
        const urlObject = url.parse(secretMetadata.secretProvider.vaultServer);
        const options: {
            method: string;
            port?: number;
            protocol?: string;
            headers?: object;
            verifyTls?: boolean;
            trustedCertBundles?: Array<string>;
            advancedReturn?: boolean;
        } = {
            method: 'GET',
            port: Number(urlObject.port),
            protocol: urlObject.protocol,
            headers: {
                'X-Vault-Token': this.clientToken
            },
            verifyTls: secretMetadata.verifyTls !== undefined ? secretMetadata.verifyTls : true,
            trustedCertBundles: secretMetadata.trustedCertBundles !== undefined ? secretMetadata.trustedCertBundles : undefined,
            advancedReturn: true
        };

        const secretResponse = await this.utilsRef.retrier(utils.makeRequest,
            [`${urlObject.hostname}`, `/v${secretMetadata.secretProvider.version}/${secretMetadata.secretProvider.secretPath}`,
                options], {
            thisContext: this,
            maxRetries: constants.RETRY.SHORT_COUNT,
            retryInterval: constants.RETRY.SHORT_DELAY_IN_MS
        });
        if (secretMetadata.secretProvider.field === 'data') {
            return Promise.resolve(secretResponse.body.data.data)
        } else {
            return Promise.resolve(secretResponse.body.data.data[secretMetadata.secretProvider.field])
        }
    }

}
