/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

import packageInfo from '../package.json';

export const VERSION = packageInfo.version;
export const NAME = packageInfo.name;
export const INSTALLED_PACKAGES = packageInfo.dependencies;

export const DOWNLOADS_DIR = '/var/config/rest/downloads';
export const TMP_DIR = '/var/lib/cloud/icontrollx_installs';

export const TELEMETRY_TYPE= `${NAME}-data`;
export const TELEMETRY_TYPE_VERSION= '1';
export const TELEMETRY_INSTALL_DATA_FILE='/config/cloud/telemetry_install_params.tmp';
export const ENVIRONMENT_KEY_NAME= 'environment';


export const HTTP_STATUS_CODES = {
    ACCEPTED: 202,
    OK: 200,
    UNPROCESSABLE: 422,
    INTERNALS: 500
};

export const RETRY = {
    LONG_COUNT: 150,
    DEFAULT_COUNT: 100,
    DELAY_IN_MS: 10000,
    SHORT_COUNT: 20,
    SHORT_DELAY_IN_MS: 1000
};

export const ENV_VARS = {
    LOG_LEVEL: 'F5_BIGIP_RUNTIME_INIT_LOG_LEVEL',
    LOG_FILENAME: 'F5_BIGIP_RUNTIME_INIT_LOG_FILENAME',
    LOG_TO_JSON: 'F5_BIGIP_RUNTIME_INIT_LOG_TO_JSON'
};

export const LOGGER = {
    DEFAULT_FILENAME: '/var/log/cloud/bigIpRuntimeInit.log',
    DEFAULT_LOG_LEVEL: 'info',
    DEFAULT_LOG_TO_JSON: false,
    FIELDS_TO_HIDE: [
        "password",
        "localPassword",
        "remotePassword",
        "bigIqPassword",
        "bigIpPassword",
        "passphrase",
        "cookiePassphrase",
        "certificate",
        "privateKey",
        "ciphertext",
        "protected",
        "secret",
        "sharedSecret",
        "secretAccessKey",
        "apiAccessKey",
        "encodedCredentials",
        "encodedToken",
        "oldPassword",
        "newPassword",
        "bindPassword",
        "checkBindPassword",
        "md5SignaturePassphrase"
    ]
};

export const CLOUDS = {
  AWS: 'aws',
  AZURE: 'azure',
  GCP: 'gcp'
};


export const CUSTOM_ONBOARD_CONFIG_DIR = '/config/cloud/custom_commands/';
