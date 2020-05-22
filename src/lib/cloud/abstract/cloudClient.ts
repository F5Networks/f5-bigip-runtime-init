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
    init(): void;
    getSecret(secretId: string, options?: unknown): Promise<string>;
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
    getSecret(secretId: string, options?: unknown): Promise<string> {
        throw new Error('getSecret method must be implemented in child class!');
    }
}
