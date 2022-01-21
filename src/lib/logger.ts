/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import * as constants from '../constants';
import * as winston from 'winston';
import * as fs from 'fs';
/**
 * Logger Class
 *
 */
export default class Logger{
    static winstonLogger: winston.Logger;
    private static instance: Logger;

    /**
     * Get logger instance (singleton)
     * @returns logger instance
     */
    static getLogger(): Logger {
        Logger.instance = new Logger();
        Logger.winstonLogger = Logger._getWinstonLogger();
        return Logger.instance;
    }

    /**
     * Get winston logger instance (singleton)
     * @returns winston logger instance
     */
     private static _getWinstonLogger(): winston.Logger {
        const logToConsole = true;
        let logLevel: string;
        let fileName: string;

        if (constants.ENV_VARS['LOG_LEVEL'] in process.env) {
            logLevel = process.env[constants.ENV_VARS['LOG_LEVEL']];
        } else {
            logLevel = constants.LOGGER.DEFAULT_LOG_LEVEL;
        }

        if (constants.ENV_VARS['LOG_FILENAME'] in process.env) {
            fileName = process.env[constants.ENV_VARS['LOG_FILENAME']];
        } else {
            fileName = constants.LOGGER.DEFAULT_FILENAME;
        }

        if ( !fs.existsSync(fileName.substring(0, fileName.lastIndexOf("/")))) {
            fs.mkdirSync(fileName.substring(0, fileName.lastIndexOf("/")));
        }

        const transportOptions = {
            level: logLevel,
            format: Logger._getLoggingFormat(),
            handleExceptions: false,
            humanReadableUnhandledException: true
        };

        const transports = [];
        if (logToConsole) {
            transports.push(new (winston.transports.Console)(transportOptions));
        }

        if (fileName) {
            const fileOptions = {
                level: logLevel,
                format: Logger._getLoggingFormat(),
                handleExceptions: false,
                humanReadableUnhandledException: true,
                filename: fileName,
                maxsize: 10485760,
                maxFiles: 10,
                tailable: true

            };
            transports.push(new (winston.transports.File)(fileOptions));
        }


        const logger = winston.createLogger({
            transports: transports
        });

        return logger;
    }

    /**
     * Log informational message
     */
    error(msg: string): void {
        Logger.winstonLogger.error(msg);
    }

    /**
     * Log warning message
     */
    warn(msg: string): void {
        Logger.winstonLogger.warn(msg);
    }

    /**
     * Log informational message
     */
    info(msg: string): void {
        Logger.winstonLogger.info(msg);
    }

    /**
     * Log debug message
     */
    debug(msg: string): void {
        Logger.winstonLogger.debug(msg);
    }

    /**
     * Log silly message
     */
    silly(msg: string): void {
        Logger.winstonLogger.silly(msg);
    }

    /**
     * Gets logging format
     */
    private static _getLoggingFormat(): any { /* eslint-disable-line @typescript-eslint/no-explicit-any */
        const isLogToJson = Boolean(process.env[constants.ENV_VARS['LOG_TO_JSON']]);
        if (constants.ENV_VARS['LOG_TO_JSON'] in process.env) {
            if (isLogToJson) {
                return winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.printf(info => {
                        let message = info.message ? info.message : '';
                        for (const fieldName of constants.LOGGER.FIELDS_TO_HIDE) {
                            message = message.replace(new RegExp(`"${fieldName}":\{[^}]*\}`, 'g'), `"${fieldName}":"********"`).replace(new RegExp(`"${fieldName}":.[^"]+`, 'g'), `"${fieldName}":"********`);
                        }
                        return `{"message":${message},"level":"${info.level}","pid":"${process.pid}"}`
                    })
                )
            }
        }
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(info => {
                let message = info.message ? info.message : '';
                for (const fieldName of constants.LOGGER.FIELDS_TO_HIDE) {
                    message = message.replace(new RegExp(`"${fieldName}":\{[^}]*\}`, 'g'), `"${fieldName}":"********"`).replace(new RegExp(`"${fieldName}":.[^"]+`, 'g'), `"${fieldName}":"********`);
                }
                return `${info.timestamp} [${process.pid}]: ${info.level}: ${message}`
            })
        )
    }
}
