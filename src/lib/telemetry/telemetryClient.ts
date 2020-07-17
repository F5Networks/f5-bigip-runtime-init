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
import { ManagementClient } from '../bigip/managementClient';
import * as utils from '../utils';
import * as constants from '../../constants';

const logger = Logger.getLogger();

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
    uriPrefix: string;
    authHeader: string;
    /**
     *
     * @param  mgmtClient     [management client]
     * @param  uriPrefix     [request prefix]
     * @param  authHeader    [request auth header]
     *
     */
    constructor(mgmtClient) {
        this._mgmtClient = mgmtClient;
        this.uriPrefix = `${this._mgmtClient._protocol}://${this._mgmtClient.host}:${this._mgmtClient.port}`;
        this.authHeader = `Basic ${utils.base64('encode', `${this._mgmtClient.user}:${this._mgmtClient.password}`)}`;
    }

    async _getSystemInfo(): Promise<object> {
        // perform ready check
        await this._mgmtClient.isReady();

        const installedPackages = [];
        const provisionedModules = [];

        const sysHardware = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/hardware`,
        {
            headers: {
                Authorization: this.authHeader
            }
        });


        const sysSoftware = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/software/volume`,
        {
            headers: {
                Authorization: this.authHeader
            }
        });


        const globalSettings = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/global-settings`,
        {
            headers: {
                Authorization: this.authHeader
            }
        });


        const managementIp = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/management-ip`,
        {
            headers: {
                Authorization: this.authHeader
            }
        });


        const modules = await utils.makeRequest(`${this.uriPrefix}/mgmt/tm/sys/provision`,
        {
            headers: {
                Authorization: this.authHeader
            }
        });

        modules.body.items.forEach(item => {
            if (item.level !== 'none') {
                provisionedModules.push({name: item.name, level: item.level});
            }
        });


        const packages = await utils.makeRequest(`${this.uriPrefix}/mgmt/shared/iapp/installed-packages`,
        {
            headers: {
                Authorization: this.authHeader
            }
        });

        packages.body.items.forEach(item => {
            installedPackages.push({name: item.packageName, version: item.version});
        });

        const payload = {
            id: sysHardware.body.entries['https://localhost/mgmt/tm/sys/hardware/system-info'].nestedStats.entries['https://localhost/mgmt/tm/sys/hardware/system-info/0'].nestedStats.entries.bigipChassisSerialNum.description,
            product: sysSoftware.body.items[0].product,
            version: sysSoftware.body.items[0].version,            
            hostname: globalSettings.body.hostname,
            management: managementIp.body.items[0].name,
            provisionedModules: provisionedModules,
            installedPackages: installedPackages
        }

        return payload;
    }

    async sendPostHook(postHookConfig): Promise<string> {
        const systemInfo: object = await this._getSystemInfo();

        // add any custom properties
        if ('properties' in postHookConfig) {
            systemInfo['properties'] = postHookConfig.properties
        }
        logger.info(`Webhook payload: ${utils.stringify(systemInfo)}`);

        // make a request to the hook target
        const response = await utils.makeRequest(`${postHookConfig.url}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                useTls: postHookConfig.verifyTls || false,
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
