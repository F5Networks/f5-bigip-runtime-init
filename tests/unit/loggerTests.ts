/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import sinon from 'sinon';
import assert from 'assert';
import Logger from '../../src/lib/logger';
import * as fs from 'fs';

describe('Logger', function() {

    let logger: Logger;

    beforeEach(function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'silly' });
    });
    afterEach(function() {
        sinon.restore();
    });

    ['error', 'warn', 'info', 'debug'].forEach((logLevel) => {
        it(`should log ${logLevel} message`, function() {
            logger = Logger.getLogger();
            logger[logLevel]('msg');
        });
    });

    it('should validate that silly and debug messages are not shown', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'info' });
        logger = Logger.getLogger();
        assert.strictEqual(Logger.winstonLogger.level, 'info');
        logger.info('this is info message');
        logger.debug('this is debug message');
        logger.silly('this is silly message');
    });


    it('should validate that silly and debug messages are shown', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'silly' });
        logger = Logger.getLogger();
        logger.info('this is info message');
        logger.debug('this is debug message');
        logger.silly('this is silly message');
    });

    it('should log validate log to json format', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_TO_JSON: true });
        logger = Logger.getLogger();
        logger.info('this is json message');
    });

    it('should log validate log filename setting', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_FILENAME: 'tmp/test.log' });
        logger = Logger.getLogger();
        logger.info('info msg');
    });

    it('should validate custom log creation', function() {
        assert.ok(fs.existsSync('tmp/test.log'));
        fs.unlinkSync('tmp/test.log');
        fs.rmdirSync('tmp/');
    })
});
