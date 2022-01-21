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

import Logger from '../../logger';

export interface CloudClient {
    environment: string;
    logger: Logger;
    accountId: string;
    cloudName: string;
    init(): void;
    getSecret(secretId: string, options?: { version?: string; vaultUrl?: string }): Promise<string>;
    getMetadata(field: string, options?: { type?: string; index?: number }): Promise<string>;
    getCloudName(): string;
    getCustomerId(): string;
    getRegion(): string;
}

/**
 * Abstract Cloud class - defines cloud agnostic properties and methods
 *
 * @class
 */
/* eslint-disable  @typescript-eslint/no-unused-vars */
export class AbstractCloudClient implements CloudClient{
    environment: string;
    logger: Logger;
    accountId: string;
    cloudName: string;
    constructor(name, options) {
        this.environment = name;

        const logger = options ? options.logger : Logger.getLogger();
        if (logger) {
            this.logger = logger;
        }
    }

    init(): Promise<void> {
        throw new Error('init method must be implemented in child class!');
    }

    /**
     * Gets secret
     *
     * @param options - function options
     */
    getSecret(secretId: string, options?: { version?: string; vaultUrl?: string }): Promise<string> {
        throw new Error('getSecret method must be implemented in child class!');
    }

    /**
     * Gets metadata
     *
     * @param options - function options
     */
    getMetadata(field: string, options?: { type?: string; index?: number }): Promise<string> {
        throw new Error('getMetadata method must be implemented in child class!');
    }

    /**
     * Returns customer id
     *
     * @returns {String}
     */
    getCustomerId(): string {
        throw new Error('getCustomerId method must be implemented in child class!');
    }

    /**
     * Returns cloud name
     *
     * @returns {String}
     */
    getCloudName(): string {
        throw new Error('getCloudName method must be implemented in child class!');
    }

    /**
     * Returns cloud region
     *
     * @returns {String}
     */
    getRegion(): string {
        throw new Error('getRegion method must be implemented in child class!');
    }
}
