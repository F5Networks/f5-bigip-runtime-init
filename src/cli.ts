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

import * as fs from 'fs';
import program from 'commander';
import * as yaml from 'js-yaml';

import Logger from './lib/logger';
import * as constants from './constants';
import * as utils from './lib/utils';

<<<<<<< HEAD:src/cli.js
const logger = require('./lib/logger.js');
const constants = require('./constants.js');
const utils = require('./lib/utils.js');
const Validator = require('./lib/validator.js');
=======
import { ResolverClient } from './lib/resolver/resolverClient';
import { ManagementClient } from './lib/bigip/managementClient'
import { ToolChainClient } from './lib/bigip/toolchain/toolChainClient'
>>>>>>> develop:src/cli.ts

const logger = Logger.getLogger();

<<<<<<< HEAD:src/cli.js

async function cli() {
=======
export async function cli(): Promise<string> {
>>>>>>> develop:src/cli.ts
    /* eslint-disable no-await-in-loop */
    program
        .version(constants.VERSION)
        .option('-c, --config-file <type>', 'Configuration file', '/config/cloud/cloud_config.yaml');

    program.parse(process.argv);
    // load configuration file
    let config;
    logger.info(`Configuration file: ${program.configFile}`);
    try {
        if (program.configFile.endsWith('yaml') || program.configFile.endsWith('yml')) {
            config = yaml.safeLoad(fs.readFileSync(program.configFile, 'utf8'));
        } else {
            config = JSON.parse(fs.readFileSync(program.configFile, 'utf8'));
        }
        // config = yaml.safeLoad(fs.readFileSync(program.configFile, 'utf8'));
    } catch (e) {
        logger.error(`Configuration load error: ${e}`);
    }

    const validator = new Validator();
    const validation = validator.validate(config);
    if (!validation.isValid) {
        const error = new Error(`Invalid declaration: ${JSON.stringify(validation.errors)}`);
        return Promise.reject(error);
    }

    logger.info('Successfully validated declaration');

    // create management client
    const host = config.host || {};
    const mgmtClient = new ManagementClient(
        {
            host: host.address,
            port: host.port,
            user: host.username,
            password: host.password,
            useTls: host.protocol === 'https'
        }
    );
    // perform ready check
    await mgmtClient.isReady();
    // resolve runtime parameters
    const resolver = new ResolverClient();
    logger.info('Resolving parameters');
    const resolvedRuntimeParams = await resolver.resolveRuntimeParameters(config.runtime_parameters);
    // perform install operations
    logger.info('Performing install operations.');
    const installOperations = config.extension_packages.install_operations;
    if (installOperations.length) {
        for (let i = 0; i < installOperations.length; i += 1) {
            const toolchainClient = new ToolChainClient(
                mgmtClient,
                installOperations[i].extensionType,
                {
                    version: installOperations[i].extensionVersion
                }
            );
            await toolchainClient.package.install();
        }
    }

    // perform service operations
    logger.info('Performing service operations.');
    const serviceOperations = config.extension_services.service_operations;
    if (serviceOperations.length) {
        for (let i = 0; i < serviceOperations.length; i += 1) {
            const toolchainClient = new ToolChainClient(
                mgmtClient,
                serviceOperations[i].extensionType,
                {
                    version: serviceOperations[i].extensionVersion
                }
            );
            let loadedConfig = await utils.loadData(
                serviceOperations[i].value,
                {
                    locationType: serviceOperations[i].type
                }
            );
            // rendering secrets
            loadedConfig = JSON.parse(await utils.renderData(JSON.stringify(loadedConfig), resolvedRuntimeParams));
            await toolchainClient.service.isAvailable();
            await toolchainClient.service.create({ config: loadedConfig });
        }
    }

    return 'All operations finished successfully';
}

cli()
    .then((message) => {
        logger.info(message);
    })
    .catch(err => logger.info(err));

