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

const logger = require('./lib/logger.js');
const constants = require('./constants.js');
const connection = require('./lib/connection.js');
const toolchain = require('./lib/toolchain.js');

async function cli() {
    program
        .version(constants.VERSION)
        .option('-c, --config-file <type>', 'Configuration file', '/config/cloud/cloud_config.yaml');

    program.parse(process.argv);

    logger.info(`Configuration file: ${program.configFile}`);
    // load configuration file
    let config;
    try {
        config = yaml.safeLoad(fs.readFileSync(program.configFile, 'utf8'));
    } catch (e) {
        logger.info(`Configuration load error: ${e}`);
    }

    // set connection info
    const host = config.host || {};
    connection.setInfo({
        address: host.address,
        port: host.port,
        protocol: host.protocol,
        username: host.username,
        password: host.password
    });

    // perform install operations
    const installOperations = config.extension_packages.install_operations;
    if (installOperations.length) {
        for (let i = 0; i < installOperations.length; i += 1) {
            const toolchainPackage = new toolchain.PackageClient(
                installOperations[i].extensionType,
                {
                    version: installOperations[i].extensionVersion
                }
            );
            await toolchainPackage.install(); // eslint-disable-line no-await-in-loop
        }
    }

    // perform service operations
    const serviceOperations = config.extension_services.service_operations;
    if (serviceOperations.length) {
        for (let i = 0; i < serviceOperations.length; i += 1) {
            const toolchainService = new toolchain.ServiceClient(
                serviceOperations[i].extensionType,
                {
                    version: serviceOperations[i].extensionVersion
                }
            );
            // TODO: type/value should be resolved, rendered and then declaration passed to create()
            await toolchainService.create({ foo: 'bar' }); // eslint-disable-line no-await-in-loop
        }
    }

    return { message: 'success' };
}

cli()
    .catch(err => logger.info(err));
