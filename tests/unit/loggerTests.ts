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

    it('should validate when no message is set', function() {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'info' });
        logger = Logger.getLogger();
        assert.strictEqual(Logger.winstonLogger.level, 'info');
        logger.info('');
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
        logger.info('custom log file msg');
        assert.ok(true);
    });

    it('should validate custom log creation', function(done) {
        this.timeout(10000);
        setTimeout(() => {
            assert.ok(fs.existsSync('tmp/test.log'));
            fs.unlinkSync('tmp/test.log');
            fs.rmdirSync('tmp/');
            done();
        }, 5000);
    });

    it('should validate sensitive field is hidden for default log format', function(done) {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_FILENAME: 'tmp/test_sensitive_default_format.log' });
        const logMessage = '{"schemaVersion":"1.0.0","class":"Device","async":true,"label":"my BIG-IP declaration for declarative onboarding","Common":{"class":"Tenant","mySystem":{"class":"System","hostname":"ip-10-0-0-215.us-west-2.compute.internal","cliInactivityTimeout":1200,"consoleInactivityTimeout":1200,"autoPhonehome":false},"myDns":{"class":"DNS","nameServers":["8.8.8.8"]},"myNtp":{"class":"NTP","servers":["0.pool.ntp.org"],"timezone":"UTC"},"admin":{"class":"User","userType":"regular","password":"SomeSensitiveValue","shell":"bash"},"vaultadmin":{"class":"User","userType":"regular","password":"b1gAdminPazz","shell":"bash","partitionAccess":{"all-partitions":{"role":"admin"}}},"myProvisioning":{"class":"Provision","ltm":"nominal","asm":"nominal"},"external":{"class":"VLAN","tag":4094,"mtu":1500,"interfaces":[{"name":"1.1","tagged":true}]},"external-self":{"class":"SelfIp","address":"10.0.1.32/24","vlan":"external","allowService":"default","trafficGroup":"traffic-group-local-only"},"dbvars":{"class":"DbVariables","provision.extramb":500,"restjavad.useextramb":true}}}';
        logger = Logger.getLogger();
        logger.info(logMessage);
        this.timeout(10000);
        setTimeout(() => {
            assert.ok(fs.existsSync('tmp/test_sensitive_default_format.log'));
            const logMessage = fs.readFileSync('tmp/test_sensitive_default_format.log').toString('utf8');
            assert.strictEqual(logMessage.split("********").length, 3);
            fs.unlinkSync('tmp/test_sensitive_default_format.log');
            fs.rmdirSync('tmp/');
            done();
        }, 5000);
    });

    it('should validate sensitive field is hidden for json log format', function(done) {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_FILENAME: 'tmp/test_sensitive_json_format.log', F5_BIGIP_RUNTIME_INIT_LOG_TO_JSON: true });
        const logMessage = '{"schemaVersion":"1.0.0","class":"Device","async":true,"label":"my BIG-IP declaration for declarative onboarding","Common":{"class":"Tenant","mySystem":{"class":"System","hostname":"ip-10-0-0-225.us-west-2.compute.internal","cliInactivityTimeout":1200,"consoleInactivityTimeout":1200,"autoPhonehome":false},"myDns":{"class":"DNS","nameServers":["8.8.8.8"]},"myNtp":{"class":"NTP","servers":["0.pool.ntp.org"],"timezone":"UTC"},"admin":{"class":"User","userType":"regular","password":"StrongPassword2010!","shell":"bash"},"vaultadmin":{"class":"User","userType":"regular","password":"b1gAdminPazz","shell":"bash","partitionAccess":{"all-partitions":{"role":"admin"}}},"myProvisioning":{"class":"Provision","ltm":"nominal","asm":"nominal"},"external":{"class":"VLAN","tag":4094,"mtu":1500,"interfaces":[{"name":"1.1","tagged":true}]},"external-self":{"class":"SelfIp","address":"10.0.1.210/24","vlan":"external","allowService":"default","trafficGroup":"traffic-group-local-only"},"dbvars":{"class":"DbVariables","provision.extramb":500,"restjavad.useextramb":true}}}';
        logger = Logger.getLogger();
        logger.info(logMessage);
        this.timeout(10000);
        setTimeout(() => {
            assert.ok(fs.existsSync('tmp/test_sensitive_json_format.log'));
            const logMessage = fs.readFileSync('tmp/test_sensitive_json_format.log').toString('utf8');
            assert.strictEqual(logMessage.split("********").length, 3);
            fs.unlinkSync('tmp/test_sensitive_json_format.log');
            fs.rmdirSync('tmp/');
            done();
        }, 5000);
    });
});
