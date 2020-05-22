/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import sinon from 'sinon';

import Logger from '../../src/lib/logger';
import assert from 'assert';

describe('Logger', function() {
    let logger: Logger;
    let mockLog;

    beforeEach(function() {
        logger = Logger.getLogger();
        mockLog = sinon.stub(Logger.prototype, '_log');
    });
    afterEach(function() {
        sinon.restore();
    });

    ['error', 'warning', 'info', 'debug'].forEach((logLevel) => {
        it(`should log ${logLevel} message`, function() {
            sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT: logLevel.toUpperCase() });

            logger[logLevel]('msg');
            assert.deepStrictEqual(mockLog.getCall(0).args, ['msg', logLevel.toUpperCase()]);
        });
    });

    it('should not log a message of a lower level', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT: 'ERROR' });

        logger.warning('msg');
        assert.strictEqual(mockLog.called, false);
    });

    it('should log info messages by default', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT: undefined });

        logger.info('msg');
        assert.strictEqual(mockLog.called, true);
    });
});
