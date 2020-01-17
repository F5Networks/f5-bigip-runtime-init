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

const fs = require('fs');
const program = require('commander');
const yaml = require('js-yaml');

const logger = require('./logger.js');
const constants = require('./contants.js');

program
    .version(constants.VERSION)
    .option('-c, --config-file <type>', 'Configuration file', '/config/cloud/cloud_config.yaml');

program.parse(process.argv);

logger.info(program.configFile);

let config;
try {
    config = yaml.safeLoad(fs.readFileSync(program.configFile, 'utf8'));
    logger.info(config);
} catch (e) {
    logger.info(`Error: ${e}`);
}
