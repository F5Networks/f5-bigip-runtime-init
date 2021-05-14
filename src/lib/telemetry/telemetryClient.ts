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

import Logger from '../logger';
import * as fs from 'fs';
import { ManagementClient } from '../bigip/managementClient';
import * as F5Teem from '@f5devcentral/f5-teem';
import * as utils from '../utils';
import * as constants from '../../constants';
import { getCloudProvider } from '../cloud/cloudFactory';
import {CloudClient} from "../cloud/abstract/cloudClient";
import { getUserLocale } from 'get-user-locale';
import { v4 as uuidv4 } from 'uuid';

const logger = Logger.getLogger();
interface TeemAssetInfo {
    name: string;
    version: string;
}
/**
 * Telemetry client class
 *
 * @example
 *
 * const mgmtClient = new ManagementClient({ host: '', port: '', user: '', password: ''});
 * const telemetryClient = new TelemetryClient();
 *
 * @example
 *
 * telemetryClient.sendPostHook();
 */
export class TelemetryClient {
    _mgmtClient: ManagementClient;
    _cloudClient: CloudClient;
    uriPrefix: string;
    authHeader: string;
    F5TeemDevice: F5Teem.Device;
    teemAssetInfo: TeemAssetInfo;
    telemetryType: string;
    getCloudProvider = getCloudProvider;
    telemetryTypeVersion: string;
    cloudInfo: {
      cloudName: string;
      customerId: string;
    };
    installParameters: [{
        key: string;
        value: string;
    }];
    systemInfo: {
        id: string;
        product: string;
        version: string;
        platformId: string;
        cpuCount: number;
        nicCount: number;
        regKey: string;
        memoryInMb: number;
        diskSize: number;
        hostname: string;
        management: string;
        provisionedModules: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        installedPackages: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        environment: {
            pythonVersion: string;
            pythonVersionDetailed: string;
            nodeVersion: string;
            libraries: {
                ssh: string;
            };
        };
    };
    operation: {
        clientRequestId: string;
        configFile: string;
        preOnboardEnabled: {
            commands: number;
        };
        postOnboardEnabled: {
            commands: number;
            postHooks: number;
        };
        runtimeParams: {
            secrets: number;
            metadata: number;
        };
        vaults: {
            aws: number;
            azure: number;
            gcp: number;
        };
        extensionPackages: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        extensionServices: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        startTime: string;
        endTime: string;
        result: string;
        resultSummary: string;

    };
    utils = utils;
    /**
     *
     * @param  mgmtClient     [management client]
     *
     */
    constructor(mgmtClient) {
        this._mgmtClient = mgmtClient;
        this.uriPrefix = `${this._mgmtClient._protocol}://${this._mgmtClient.host}:${this._mgmtClient.port}`;
        this.authHeader = `Basic ${utils.base64('encode', `${this._mgmtClient.user}:${this._mgmtClient.password}`)}`;
        this.F5TeemDevice = F5Teem.Device;
        this.telemetryType = constants.TELEMETRY_TYPE;
        this.telemetryTypeVersion = constants.TELEMETRY_TYPE_VERSION;
        this.teemAssetInfo = {
            name: constants.NAME,
            version: constants.VERSION
        };
        this.operation = undefined;
        this.systemInfo = undefined;
        this.cloudInfo = undefined;
        this.installParameters = undefined;
    }

    async init(options): Promise<void> {
        options = options || {};
        options.config = options.config || {};
        options.startTime = options.startTime || 0;
        options.endTime = options.endTime || 0;
        options.result = options.result || undefined;
        options.resultSummary = options.resultSummary || undefined;
        this.systemInfo = await this._getSystemInfo();
        logger.info(JSON.stringify(this.systemInfo));
        this.cloudInfo = await this._getCloudInfo();
        this.operation = this._getOperationInfo(options);
        this.installParameters = this._getInstallParameters(options);
    }

    _getOperationInfo(options): {
        clientRequestId: string;
        configFile: string;
        preOnboardEnabled: {
            commands: number;
        };
        postOnboardEnabled: {
            commands: number;
            postHooks: number;
        };
        runtimeParams: {
            secrets: number;
            metadata: number;
        };
        vaults: {
            aws: number;
            azure: number;
            gcp: number;
        };
        extensionPackages: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        extensionServices: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        startTime: string;
        endTime: string;
        result: string;
        resultSummary: string;
    } {
        return {
            configFile: options.configFile || '',
            clientRequestId: uuidv4(),
            preOnboardEnabled: this._getPreOnboardEnabled(options.config),
            postOnboardEnabled: this._getPostOnboardEnabled(options.config),
            runtimeParams: this._getRuntimeParams(options.config),
            vaults: this._getVaults(options.config),
            extensionPackages: this._getExtensionPackages(options.config),
            extensionServices: this._getExtensionServices(options.config),
            startTime: options.startTime,
            endTime: options.endTime,
            result: options.result,
            resultSummary:options.resultSummary
        }
    }

    async report(payload): Promise<void> {
        const teemClient = new this.F5TeemDevice(this.teemAssetInfo);
        logger.debug(`Telemetry Type: ${this.telemetryType}`);
        logger.debug(`Telemetry Version: ${this.telemetryTypeVersion}`);
        logger.debug(`F5 TEEM Payload: ${JSON.stringify(payload)}`);
        await teemClient.report(this.telemetryType, this.telemetryTypeVersion, payload, {});
    }

    createTelemetryData(): any{  /* eslint-disable-line @typescript-eslint/no-explicit-any */
        const telemetryData = {
            "platform": {
                "platform": this.systemInfo.product,
                "platformVersion": this.systemInfo.version,
                "platformId": this.systemInfo.platformId,
                "system": {
                    "cpuCount": this.systemInfo.cpuCount,
                    "memory": this.systemInfo.memoryInMb,
                    "diskSize": this.systemInfo.diskSize,
                },
                "nicCount": this.systemInfo.nicCount,
                "regKey": this.systemInfo.regKey,
                "deployment": {
                    "cloud": this.cloudInfo.cloudName,
                    "customerId": this.cloudInfo.customerId
                },
                "modules": this.systemInfo.provisionedModules,
                "packages": this.systemInfo.installedPackages,
                "environment": {
                    "pythonVersion": this.systemInfo.environment.pythonVersion,
                    "pythonVersionDetailed": this.systemInfo.environment.pythonVersionDetailed,
                    "nodeVersion": this.systemInfo.environment.nodeVersion,
                    "libraries": {
                        "ssh": this.systemInfo.environment.libraries.ssh
                    }
                }
            },
            "product": {
                "version": constants.VERSION,
                "locale": getUserLocale(),
                "installDate": (new Date()).toISOString(),
                "installationId": uuidv4(),
                "installedComponents": constants.INSTALLED_PACKAGES
            },
            "operation": {
                "clientRequestId": this.operation.clientRequestId,
                "rawCommand": this.operation.configFile? `f5-runtime-init -c ${this.operation.configFile}`: undefined,
                "pre_onboard_enabled": this.operation.preOnboardEnabled,
                "runtime_params": this.operation.runtimeParams,
                "vaults": this.operation.vaults,
                "userAgent": `f5-bigip-runtime-init/${constants.VERSION}`,
                "extension_packages": this.operation.extensionPackages,
                "extension_services": this.operation.extensionServices,
                "post_onboard_enabled": this.operation.postOnboardEnabled,
                "result": this.operation.result,
                "resultSummary": this.operation.resultSummary,
                "startTime": this.operation.startTime,
                "endTime": this.operation.endTime,
                "installParams": this.installParameters
            }
        };
        return telemetryData;
    }

    _getInstallParameters (config): any { /* eslint-disable-line @typescript-eslint/no-explicit-any */
        const result = [];
        let data = [];
        if (fs.existsSync(constants.TELEMETRY_INSTALL_DATA_FILE)) {
            data = fs.readFileSync(constants.TELEMETRY_INSTALL_DATA_FILE, 'utf8').split('\n');
        }
        data.forEach((item) => {
            if (item && item.indexOf(':') != -1) {
                result.push({
                    key: item.split(':')[0],
                    value: item.split(':')[1]
                })
            }
        });
        return result;
    }

    _getExtensionPackages(config): any { /* eslint-disable-line @typescript-eslint/no-explicit-any */
        const extensionPackages = config.extension_packages || [];
        const installOperations = extensionPackages.install_operations || [];
        const results = {};
        if (installOperations.length) {
            for (let i=0; i < installOperations.length; i++){
                results[installOperations[i].extensionType] = installOperations[i].extensionVersion;
            }
        }
        return results;
    }

    _getExtensionServices(config): any { /* eslint-disable-line @typescript-eslint/no-explicit-any */
        const extensionServices = config.extension_services || [];
        const serviceOperations = extensionServices.service_operations || [];
        const results = {};
        if (serviceOperations.length) {
            for (let i=0; i < serviceOperations.length; i++){
                results[serviceOperations[i].extensionType] = true;
            }
        }
        return results;
    }

    _getVaults(config): {
        aws: number;
        azure: number;
        gcp: number;
    } {
        const runtimeParams = config.runtime_parameters || [];
        const results = {
            aws: 0,
            azure: 0,
            gcp: 0
        };
        if (runtimeParams.length) {
            for (let i=0; i < runtimeParams.length; i++){
                if (runtimeParams[i].type == 'secret') {
                    results[runtimeParams[i].secretProvider.environment] += 1;
                }
            }
        }
        return results;
    }

    _getRuntimeParams(config): {
        secrets: number;
        metadata: number;
    } {
        const result = {
            secrets: 0,
            metadata: 0
        };
        const runtimeParams = config.runtime_parameters || [];
        if (runtimeParams.length) {
            for (let i=0; i < runtimeParams.length; i++){
                if (runtimeParams[i].type == 'secret') {
                    result.secrets += 1;
                } else if (runtimeParams[i].type == 'metadata') {
                    result.metadata += 1;
                }
            }
        }
        return result;
    }

    _getPreOnboardEnabled(config): {
        commands: number;
    } {
        const result = {
            commands: 0
        };
        const preOnboardEnabled = config.pre_onboard_enabled || [];
        if (preOnboardEnabled.length) {
            result.commands = config.pre_onboard_enabled.length;
        }
        return result;
    }


    _getPostOnboardEnabled(config): {
        commands: number;
        postHooks: number;
    } {
        const result = {
            commands: 0,
            postHooks: 0
        };
        const preOnboardEnabled = config.post_onboard_enabled || [];
        if (preOnboardEnabled.length) {
            result.commands = config.post_onboard_enabled.length;
        }
        const postHooks = config.post_hook || [];
        if (postHooks.length) {
            result.postHooks = postHooks.length;
        }
        return result
    }

    async _getCloudInfo(): Promise<{
        cloudName: string;
        customerId: string;
    }> {
        for(const cloudName in constants.CLOUDS) {
            try {
                this._cloudClient = await this.getCloudProvider(constants.CLOUDS[cloudName],{});
                await this._cloudClient.init();
                break;
            } catch(error) {
                // pass since the error expected when Cloud Provider can't be instantiated
            }
        }
        if (!this._cloudClient) {
            logger.error('telemetry was not able to get Cloud metadata. Perhaps, public cloud integrations are disabled.');
            return {
                cloudName: undefined,
                customerId: undefined
            }
        }
        return {
            cloudName: this._cloudClient.getCloudName(),
            customerId: this._cloudClient.getCustomerId()
        }
    }

    async _getSystemInfo(): Promise<{
        id: string;
        product: string;
        version: string;
        platformId: string;
        regKey: string;
        cpuCount: number;
        nicCount: number;
        memoryInMb: number;
        diskSize: number;
        hostname: string;
        management: string;
        provisionedModules: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        installedPackages: any; /* eslint-disable-line @typescript-eslint/no-explicit-any */
        environment: {
            pythonVersion: string;
            pythonVersionDetailed: string;
            nodeVersion: string;
            libraries: {
                ssh: string;
            };
        };
    }> {
        const installedPackages = {};
        const provisionedModules = {};
        // F5 TEEM payload data
        let pythonVersion = "";
        let pythonVersionDetailed = "";
        let nodeVersion = "";
        let sshVersion = "";
        let id = "";
        let product = "";
        let cpuCount = 0;
        let diskSize = 0;
        let memoryInMb = 0;
        let version = "";
        let nicCount = 0;
        let regKey = undefined;
        let platformId = "";
        let hostname = "";
        let management = "";

        try {
            // perform ready check
            await this._mgmtClient.isReady();
            // Getting environments details
            pythonVersion = await this.utils.runShellCommand('python --version');
            pythonVersionDetailed = await this.utils.runShellCommand('python -c \"import sys;print(sys.version)\"');
            nodeVersion = await this.utils.runShellCommand('node --version');
            sshVersion = await this.utils.runShellCommand('ssh -V');

            const sysHardware = await this.utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/hardware`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (sysHardware.body.entries !== undefined) {
                id = sysHardware.body.entries['https://localhost/mgmt/tm/sys/hardware/system-info'].nestedStats.entries['https://localhost/mgmt/tm/sys/hardware/system-info/0'].nestedStats.entries.bigipChassisSerialNum.description;
                cpuCount = this._getCpuCount(sysHardware.body.entries['https://localhost/mgmt/tm/sys/hardware/hardware-version']
                    .nestedStats.entries['https://localhost/mgmt/tm/sys/hardware/hardware-version/cpus'].nestedStats.entries['https://localhost/mgmt/tm/sys/hardware/hardwareVersion/cpus/versions'].nestedStats.entries);
                const sysSoftware = await this.utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/software/volume`,
                    {
                        headers: {
                            Authorization: this.authHeader
                        }
                    });

                product = sysSoftware.body.items[0].product;
                version = sysSoftware.body.items[0].version;
                platformId = sysHardware.body.entries['https://localhost/mgmt/tm/sys/hardware/system-info'].nestedStats.entries['https://localhost/mgmt/tm/sys/hardware/system-info/0'].nestedStats.entries.platform.description;
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/hardware endpoint. Leaving Product, Version and PlatformId with defaul values');
            }

            const globalSettings = await this.utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/global-settings`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (globalSettings.body.hostname !== undefined) {
                hostname = globalSettings.body.hostname;
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/global-settings endpoint. Leaving hostname with default value');
            }

            const managementIp = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/management-ip`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (managementIp.body.items !== undefined) {
                management = managementIp.body.items[0].name;
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/management-ip endpoint. Leaving Management with default value');
            }

            const modules = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/provision`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (modules.body.items !== undefined) {
                modules.body.items.forEach(item => {
                    if (item.level !== 'none') {
                        provisionedModules[item.name] = item.level;
                    }
                });
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/provision endpoint. Not able to get provision modules');
            }

            const logicalDisk = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/disk/logical-disk`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (logicalDisk.body.items !== undefined) {
                diskSize = this._getDiskSize(logicalDisk.body.items);
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/disk/logical-disk. Leaving diskSize with default value');
            }

            const packages = await utils.makeRequest(`${this.uriPrefix}/mgmt/shared/iapp/installed-packages`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (packages.body.items !== undefined) {
                packages.body.items.forEach(item => {
                    installedPackages[item.packageName] = item.version;
                });
            } else {
                logger.warn('Problem with getting data from /mgmt/shared/iapp/installed-packages. Not able to get installed extensions');
            }

            const memory = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/memory`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (memory.body.entries !== undefined) {
                if ('https://localhost/mgmt/tm/sys/memory/memory-host' in memory.body.entries) {
                    if ('https://localhost/mgmt/tm/sys/memory/memory-host/0' in memory.body.entries['https://localhost/mgmt/tm/sys/memory/memory-host'].nestedStats.entries) {
                        memoryInMb = this._getMemoryInMb(memory.body.entries['https://localhost/mgmt/tm/sys/memory/memory-host'].nestedStats.entries['https://localhost/mgmt/tm/sys/memory/memory-host/0']
                            .nestedStats.entries.memoryTotal.value);
                    }
                }
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/memory endpoint. Leaving memoryInMb with default value');
            }
            const interfaces = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/net/interface`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });
            if (interfaces.body.items !== undefined) {
                nicCount = interfaces.body.items.length;
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/net/interface endpoint. Leaving nicCount with default value');
            }

            const license = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/license`,
                {
                    headers: {
                        Authorization: this.authHeader
                    }
                });

            if (license.body.entries !== undefined) {
                if ('https://localhost/mgmt/tm/sys/license/0' in license.body.entries) {
                    regKey = license.body.entries['https://localhost/mgmt/tm/sys/license/0'].nestedStats.entries.registrationKey.description;
                }
            } else {
                logger.warn('Problem with getting data from /mgmt/tm/sys/license endpoint. Leaving regKey with default value');
            }


            const payload = {
                id: id,
                product: product,
                cpuCount: cpuCount,
                diskSize: diskSize,
                memoryInMb: memoryInMb,
                version: version,
                nicCount: nicCount,
                regKey: regKey,
                platformId: platformId,
                hostname: hostname,
                management: management,
                provisionedModules: provisionedModules,
                installedPackages: installedPackages,
                environment: {
                    pythonVersion: pythonVersion.trim(),
                    pythonVersionDetailed: pythonVersionDetailed.trim(),
                    nodeVersion: nodeVersion.trim(),
                    libraries: {
                        ssh: sshVersion.trim()
                    }
                }
            };
            return payload;
        } catch (err) {

            logger.error('Error caugth while constucting F5-TEEM payload');
            logger.error(err.message);
            const payload = {
                id: id,
                product: product,
                cpuCount: cpuCount,
                diskSize: diskSize,
                memoryInMb: memoryInMb,
                version: version,
                nicCount: nicCount,
                regKey: regKey,
                platformId: platformId,
                hostname: hostname,
                management: management,
                provisionedModules: provisionedModules,
                installedPackages: installedPackages,
                environment: {
                    pythonVersion: pythonVersion.trim(),
                    pythonVersionDetailed: pythonVersionDetailed.trim(),
                    nodeVersion: nodeVersion.trim(),
                    libraries: {
                        ssh: sshVersion.trim()
                    }
                }
            };
            return payload;
        }
    }

    _getMemoryInMb(totalMemoryInBytes): number{
        return Math.round(parseInt(totalMemoryInBytes, 10)/ 1048576);
    }

    _getDiskSize(hardDisks): number{
        let totalSizeInMb = 0;
        hardDisks.forEach((item) => {
            totalSizeInMb +=  item.size;
        });
        return totalSizeInMb
    }

    // Gets CPU counts
    _getCpuCount(cpuVersions): number{
        for (const version of Object.keys(cpuVersions)) {
            if(cpuVersions[version].nestedStats.entries.tmName.description === "cores") {
                return parseInt(cpuVersions[version].nestedStats.entries.version.description.split(' ')[0], 10);
            }
        }
    }

    async sendPostHook(postHookConfig): Promise<string> {
        const systemInfo: object = await this._getSystemInfo();

        // add any custom properties
        if ('properties' in postHookConfig) {
            systemInfo['properties'] = postHookConfig.properties
        }
        logger.debug(`Webhook payload: ${utils.stringify(systemInfo)}`);

        // make a request to the hook target
        const response = await utils.makeRequest(`${postHookConfig.url}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                verifyTls: 'verifyTls' in postHookConfig ? postHookConfig.verifyTls : true,
                body: systemInfo
            }
        );

        if (response.code === constants.HTTP_STATUS_CODES.OK) {
            return 'Successfully sent post hook!';
        } else {
            return Promise.reject(new Error(`Webhook failed: ${response.code}`));
        }
    }
}
