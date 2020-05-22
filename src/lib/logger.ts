/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import * as constants from '../constants';
const LOG_LEVELS = {
    error: 5,
    warning: 4,
    info: 3,
    debug: 2
};

/**
 *
 * Basic Example:
 *
 * ```bash
 * export F5_SDK_LOG_LEVEL='DEBUG'
 * ```
 */
export default class Logger {
    private static instance: Logger;

    /**
     * Get logger instance (singleton)
     *
     * @returns logger instance
     */
    static getLogger(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Log informational message
     */
    error(msg: string): void {
        if (LOG_LEVELS.error >= LOG_LEVELS[this._checkLogLevel()]) {
            this._log(msg, 'ERROR');
        }
    }

    /**
     * Log warning message
     */
    warning(msg: string): void {
        if (LOG_LEVELS.warning >= LOG_LEVELS[this._checkLogLevel()]) {
            this._log(msg, 'WARNING');
        }
    }

    /**
     * Log informational message
     */
    info(msg: string): void {
        if (LOG_LEVELS.info >= LOG_LEVELS[this._checkLogLevel()]) {
            this._log(msg, 'INFO');
        }
    }

    /**
     * Log debug message
     */
    debug(msg: string): void {
        if (LOG_LEVELS.debug >= LOG_LEVELS[this._checkLogLevel()]) {
            this._log(msg, 'DEBUG');
        }
    }

    private _checkLogLevel(): string {
        const logLevels = Object.keys(LOG_LEVELS);
        const logLevelFromEnvVar = process.env[constants.ENV_VARS.LOG_LEVEL];

        if (logLevelFromEnvVar && logLevels.includes(logLevelFromEnvVar.toLowerCase())) {
            return logLevelFromEnvVar.toLowerCase();
        }
        return 'info';
    }

    _log(msg: string, level: string): void {
        console.log(`${level} -`, msg);
    }
}
