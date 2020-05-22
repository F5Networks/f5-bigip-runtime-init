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

import * as constants from '../../constants';
import { CloudClient } from './abstract/cloudClient';
import Logger from '../logger'

/**
 * Given the name of a Cloud Provider return a Cloud Instance.
 * @param {String} providerName     - Short name of the cloud provider
 * @param {Object} [options]        - Optional parameters
 * @param {Object} [options.logger] - Logger to use
 */
export async function getCloudProvider(providerName: string, options?: {
    logger?: Logger;
}): Promise<CloudClient> {
    switch (providerName) {
        case constants.CLOUDS.AWS:
            const awsModule = await import('./aws/cloudClient');
            return new awsModule.AwsCloudClient(options);
        case constants.CLOUDS.AZURE:
            const azureModule = await import('./azure/cloudClient');
            return new azureModule.AzureCloudClient(options);
        case constants.CLOUDS.GCP:
            const gcpModule = await import('./gcp/cloudClient');
            return new gcpModule.GcpCloudClient(options);
        default:
            throw new Error('Unsupported cloud');
    }
}
