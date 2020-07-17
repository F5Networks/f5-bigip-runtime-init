/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable global-require */
import assert from 'assert';
import sinon from 'sinon';
import nock from 'nock';
import { ManagementClient } from '../../../src/lib/bigip/managementClient';
import { TelemetryClient } from '../../../src/lib/telemetry/telemetryClient';

describe('Telemetry Client', () => {
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        nock.cleanAll();
        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/hardware')
            .reply(200, {entries: {
                "https://localhost/mgmt/tm/sys/hardware/system-info": {
                    nestedStats: {
                        entries: {
                            "https://localhost/mgmt/tm/sys/hardware/system-info/0": {
                                nestedStats: {
                                    entries: {
                                        bigipChassisSerialNum: {
                                            description: "74206d14-b631-d54a-16b0b09a25f8"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }})
            .get('/mgmt/tm/sys/software/volume')
            .reply(200, {items: [{
                product: "BIG-IP",
                version: "14.1.2.6"
            }]})
            .get('/mgmt/tm/sys/global-settings')
            .reply(200, {hostname: "f5vm01.local"})
            .get('/mgmt/tm/sys/management-ip')
            .reply(200, {items: [{
                name: "10.1.0.5/24"
            }]})
            .get('/mgmt/tm/sys/provision')
            .reply(200, {items: [{
                name: "gtm",
                level: "minimum"
            }, {
                name: "ltm",
                level: "nominal"
            }]})
            .get('/mgmt/shared/iapp/installed-packages')
            .reply(200, {items:[{
                packageName: "f5-declarative-onboarding-1.12.0-1.noarch",
                version: "1.12.0"
            }]});
    });

    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient();
        const telemetryClient = new TelemetryClient(mgmtClient);

        assert.strictEqual(telemetryClient._mgmtClient, mgmtClient);
        assert.strictEqual(telemetryClient.uriPrefix, mgmtClient.uriPrefix);
        assert.strictEqual(telemetryClient.authHeader, mgmtClient.authHeader);
    });

    it('should validate sendPostHook without custom properties', () => {
        const mgmtClient = new ManagementClient();
        const telemetryClient = new TelemetryClient(mgmtClient);      
        const postHookConfig = {
            name: "example_webhook",
            type: "webhook",
            url: "https://postman-echo.com/post"
        };
        sinon.stub(telemetryClient, '_getSystemInfo').resolves({});
        nock(postHookConfig.url)
            .post('/')
            .reply(200);
        telemetryClient.sendPostHook(postHookConfig)
        .then((result) => {
            assert.strictEqual(result, 'Successfully sent post hook!');
        });
    });

    it('should validate sendPostHook with custom properties', () => {
        const mgmtClient = new ManagementClient();
        const telemetryClient = new TelemetryClient(mgmtClient);      
        const postHookConfig = {
            name: "example_webhook",
            type: "webhook",
            url: "https://postman-echo.com/post",
            properties: {
                customKey1: "customValue1"
            }
        };
        const systemInfo = sinon.stub(telemetryClient, '_getSystemInfo').resolves({ name: "example_webhook", type: "webhook", url: "https://postman-echo.com/post"});
        nock(postHookConfig.url)
            .post('/')
            .reply(200);
        telemetryClient.sendPostHook(postHookConfig)
        .then(() => {
            assert.strictEqual(systemInfo, postHookConfig);
        });
    });

    it('should validate sendPostHook rejects on failed request', () => {
        const mgmtClient = new ManagementClient();
        const telemetryClient = new TelemetryClient(mgmtClient);      
        const postHookConfig = {
            name: "example_webhook",
            type: "webhook",
            url: "https://postman-echo.com/post",
        };
        sinon.stub(telemetryClient, '_getSystemInfo').resolves({});
        nock(postHookConfig.url)
            .post('/')
            .reply(404);
        telemetryClient.sendPostHook(postHookConfig)
        .catch((err) => {
            assert.ok(err.message.includes('Webhook failed: 404'));
        });
    });

    it('should validate _getSystemInfo', () => {
        const mgmtClient = new ManagementClient();
        const telemetryClient = new TelemetryClient(mgmtClient);
        const expectedPayload = {
            id: "74206d14-b631-d54a-16b0b09a25f8",
            product: "BIG-IP",
            version: "14.1.2.6",          
            hostname: "f5vm01.local",
            management: "10.1.0.5/24",
            provisionedModules: [{
                name: "gtm",
                level: "minimum"
            }, {
                name: "ltm",
                level: "nominal"
            }],
            installedPackages: [{
                packageName: "f5-declarative-onboarding-1.12.0-1.noarch",
                version: "1.12.0"
            }]
        }
        sinon.stub(mgmtClient, 'isReady').resolves();
        telemetryClient._getSystemInfo()
        .then((result) => {
            assert.strictEqual(result, expectedPayload);
        })
    });
});
