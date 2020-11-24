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
import * as process from 'process';

import Logger from './lib/logger';
import * as constants from './constants';
import * as utils from './lib/utils';
import Validator from './lib/validator.js';

import { ResolverClient } from './lib/resolver/resolverClient';
import { ManagementClient } from './lib/bigip/managementClient';
import { ToolChainClient } from './lib/bigip/toolchain/toolChainClient';
import { TelemetryClient } from './lib/telemetry/telemetryClient';

const logger = Logger.getLogger();
const executionResults = {};
let telemetryClient;
let statusCode = 0;

export async function cli(): Promise<string> {
    /* eslint-disable no-await-in-loop */
    program
        .version(constants.VERSION)
        .option('-c, --config-file <type>', 'Configuration file', '/config/cloud/cloud_config.yaml')
        .option('--skip-telemetry', 'Disable telemetry');
    program.parse(process.argv);

    let config;
    logger.info(`Configuration file: ${program.configFile}`);
    try {
        try {
            // Attempt to load as YAML file
            config = yaml.safeLoad(fs.readFileSync(program.configFile, 'utf8'));
        } catch (e){
            // If YAML load file, attempt to load as JSON file
            config = JSON.parse(fs.readFileSync(program.configFile, 'utf8'));
        }
    } catch (e) {
        logger.error(`Configuration load error: ${e}`);
        config  = 'INVALID_CONFIG_FILE_TYPE'
    }

    if (!program.skipTelemetry){
        logger.silly('F5 Telemetry is enabled.');
        executionResults['configFile'] = program.configFile;
        executionResults['startTime'] = (new Date()).toISOString();
        executionResults['config'] = config;
    } else {
        logger.info('F5 Telemetry is disabled.');
    }
    logger.info('Validating provided declaration');
    const validator = new Validator();
    const validation = validator.validate(config);
    if (!validation.isValid) {
        const error = new Error(`Invalid declaration: ${JSON.stringify(validation.errors)}`);
        return Promise.reject(error);
    }
    logger.info('Successfully validated declaration');

    // create management client
    const mgmtClient = new ManagementClient();
    // perform ready check
    await mgmtClient.isReady();
    telemetryClient = new TelemetryClient(
            mgmtClient
    );
    // resolve runtime parameters
    const resolver = new ResolverClient();
    logger.info('Resolving parameters');
    const resolvedRuntimeParams = config.runtime_parameters !== undefined ? await resolver.resolveRuntimeParameters(config.runtime_parameters): undefined;

    // pre onboard
    // run before install operations in case they require out-of-band changes
    const preOnboardEnabled = config.pre_onboard_enabled || [];
    if (preOnboardEnabled.length) {
        logger.info('Executing custom pre-onboard commands');
        await resolver.resolveOnboardActions(preOnboardEnabled);
    }

    // perform install operations
    const extensionPackages = config.extension_packages || {};
    const installOperations = extensionPackages.install_operations || [];
    if (installOperations.length) {
        logger.info('Executing install operations.');
        for (let i = 0; i < installOperations.length; i += 1) {
            const toolchainClient = new ToolChainClient(
                mgmtClient,
                installOperations[i].extensionType,
                installOperations[i]
            );
            const response = await toolchainClient.package.isInstalled();
            if (response.isInstalled) {
                logger.silly('package is already installed');
                if (response.reinstallRequired) {
                    logger.silly('installed package version is not matched; package requires update/re-install');
                    await toolchainClient.package.uninstall();
                    await mgmtClient.isReady();
                    await toolchainClient.package.install();
                }
            } else {
                await toolchainClient.package.install();
            }
        }
    }

    // perform service operations
    const extensionSevices = config.extension_services || {};
    const serviceOperations = extensionSevices.service_operations || [];
    if (serviceOperations.length) {
        logger.info('Executing service operations.');
        for (let i = 0; i < serviceOperations.length; i += 1) {
            const toolchainClient = new ToolChainClient(
                mgmtClient,
                serviceOperations[i].extensionType,
                {
                    version: serviceOperations[i].extensionVersion
                }
            );
            // if the config is already an object, then use it as such,
            // else use loadData to convert it to an object.
            let loadedConfig: object;
            if ((serviceOperations[i].value !== null) && (typeof serviceOperations[i].value === "object")
                && (serviceOperations[i].type === "inline")) {
                loadedConfig = serviceOperations[i].value;
            } else {
                loadedConfig = await utils.loadData(
                    serviceOperations[i].value,
                    {
                        locationType: serviceOperations[i].type,
                        verifyTls: 'verifyTls' in serviceOperations[i] ? serviceOperations[i].verifyTls : true
                    }
                );
            }
            // rendering secrets if provided
            if (resolvedRuntimeParams) {
                loadedConfig = JSON.parse(await utils.renderData(JSON.stringify(loadedConfig), resolvedRuntimeParams));
            }
            await toolchainClient.service.isAvailable();
            await toolchainClient.service.create({ config: loadedConfig });
        }
    }

    // post onboard
    const postOnboardEnabled = config.post_onboard_enabled || [];
    if (postOnboardEnabled.length) {
        logger.info('Executing custom post-onboard commands');
        await resolver.resolveOnboardActions(postOnboardEnabled);
    }


    // post hook
    const postHook = config.post_hook || [];
    if (postHook.length) {
        for (let i = 0; i < postHook.length; i += 1) {
            logger.info('Executing post hook operation.');
            const postHookConfig = postHook[i];
            await telemetryClient.sendPostHook(postHookConfig);
        }
    }
    if (!program.skipTelemetry) {
        executionResults['endTime'] = (new Date()).toISOString();
        executionResults['result'] = 'SUCCESS';
        executionResults['resultSummary'] = 'Configuration Successful';
        // f5-teem
        logger.info('Initializing telemetryClient');
        await telemetryClient.init(executionResults);
        logger.info('Sending f5-teem report');
        telemetryClient.report(telemetryClient.createTelemetryData())
            .catch((err) => {
                logger.warn('Problem with sending data to F5 TEEM. Perhaps, there is no public access');
                logger.error(err.message);
            });
    }
    return 'All operations finished successfully';
}

function exit(): void {
    setTimeout(() => {
        process.exit(statusCode);
    }, 2000);
}

cli()
    .then((message) => {
        logger.info(message);
        exit();
    })
    .catch((err) => {
        logger.error(err.message);
        statusCode = 1;
        if (!program.skipTelemetry) {
            executionResults['endTime'] = (new Date()).toISOString();
            executionResults['result'] = 'FAILURE';
            executionResults['resultSummary'] = err.message;
            // f5-teem
            const mgmtClient = new ManagementClient();
            telemetryClient = new TelemetryClient(
                mgmtClient
            );
            logger.info('Sending F5 Teem report for failure case.');
            telemetryClient.init(executionResults)
                .then(() => {
                    return telemetryClient.report(telemetryClient.createTelemetryData());
                }).then(() => {
                logger.info('F5 Teem report was successfully sent for failure case.');
                logger.info(executionResults['resultSummary']);
                exit();
            })
                .catch((err2) => {
                    logger.error(err2.message);
                    exit();
                });
        }
    });
