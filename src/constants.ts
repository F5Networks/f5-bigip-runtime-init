/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

import packageInfo from '../package.json';

export const VERSION = packageInfo.version;

export const BASE_DIR = '/var/lib/cloud';
export const TMP_DIR = '/var/lib/cloud/icontrollx_installs';

export const HTTP_STATUS_CODES = {
    ACCEPTED: 202,
    OK: 200
};

export const RETRY = {
    DEFAULT_COUNT: 100,
    DELAY_IN_MS: 10000
};

export const ENV_VARS = {
    LOG_LEVEL: 'F5_BIGIP_RUNTIME_INIT'
};

export const CLOUDS = {
  AWS: 'aws',
  AZURE: 'azure',
  GCP: 'gcp'
};

export const CUSTOM_ONBOARD_CONFIG_DIR = '/config/cloud/custom_commands/';
