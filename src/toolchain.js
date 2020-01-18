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

const logger = require('./logger.js');
const utils = require('./utils.js');

class Package {
    constructor(component, options) {
        this.component = component;
        this.version = options.version || 'latest';
    }

    async install() {
        logger.info(`Installing - ${this.component} ${this.version}`);
        return { installed: true };
    }
}

class Service {
    constructor(component, options) {
        this.component = component;
        this.version = options.version || 'latest';
    }

    async create(body) {
        logger.info(`Creating - ${this.component} ${this.version} ${utils.stringify(body)}`);
    }
}

module.exports = {
    Package,
    Service
};
