/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
import * as pkgjson from '../../../package.json';
import * as constants from '../../../src/constants';
// Import test payloads
import * as bigipMgmtSysReadyResponse from '../payloads/bigip_mgmt_sys_ready.json';
import * as bigipMgmtSysHardwareResponse from '../payloads/bigip_mgmt_sys_hardware.json';
import * as bigipMgmtSysHardwareSizeInMbResponse from '../payloads/bigip_mgmt_sys_hardware_sizeInMb.json';
import * as bigipMgmtSysHardwareSizeInKbResponse from '../payloads/bigip_mgmt_sys_hardware_sizeInKb.json';
import * as bigipMgmtSysSoftwareVolumeResponse from '../payloads/bigip_mgmt_sys_software_volume.json';
import * as bigipMgmtSysGlobablSettingsResponse from '../payloads/bigip_mgmt_sys_global_settings.json';
import * as bigipMgmtSysManagementIpResponse from '../payloads/bigip_mgmt_sys_management_ip.json';
import * as bigipMgmtSysProvisionResponse from '../payloads/bigip_mgmt_sys_provision.json';
import * as bigipMgmtSysInstalledPackagesResponse from '../payloads/bigip_mgmt_sys_installed_packages.json';
import * as bigipMgmtSysMemoryResponse from '../payloads/bigip_mgmt_sys_memory.json';
import * as bigipMgmtNetInterfacesResponse from '../payloads/bigip_mgmt_net_interface.json';
import * as bigipMgmtSysLicenseResponse from '../payloads/bigip_mgmt_sys_license.json';
import * as config from '../payloads/declaration_example.json';

describe('Telemetry Client', () => {
    let telemetryClient;
    let mgmtClient;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        nock.cleanAll();
        mgmtClient = new ManagementClient();
        telemetryClient = new TelemetryClient(mgmtClient);
        telemetryClient.utils.runShellCommand = sinon.stub();
        telemetryClient.utils.runShellCommand.withArgs('python --version')
            .resolves('Python 2.7.5');
        telemetryClient.utils.runShellCommand.withArgs('python -c \"import sys;print(sys.version)\"')
            .resolves('2.7.5 (default, Jan 21 2020, 10:23:35)\n[GCC 4.8.5 20150623 (Red Hat 4.8.5-16)]');
        telemetryClient.utils.runShellCommand.withArgs('node --version')
            .resolves('v6.9.1');
        telemetryClient.utils.runShellCommand.withArgs('ssh -V')
            .resolves('OpenSSH_7.4p1, OpenSSL 1.0.2s-fips  28 May 2019');
        telemetryClient.getCloudProvider = sinon.stub();
        telemetryClient.getCloudProvider.withArgs('aws', {}).resolves({
            init: sinon.stub().resolves(),
            getCloudName: sinon.stub().returns('aws'),
            getCustomerId: sinon.stub().returns('123456423')
        });
        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/ready')
            .reply(200, bigipMgmtSysReadyResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/hardware')
            .reply(200, bigipMgmtSysHardwareResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/software/volume')
            .reply(200, bigipMgmtSysSoftwareVolumeResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/global-settings')
            .reply(200, bigipMgmtSysGlobablSettingsResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/management-ip')
            .reply(200, bigipMgmtSysManagementIpResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/provision')
            .reply(200, bigipMgmtSysProvisionResponse);

        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/installed-packages')
            .reply(200, bigipMgmtSysInstalledPackagesResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/memory')
            .reply(200, bigipMgmtSysMemoryResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/license')
            .reply(200, bigipMgmtSysLicenseResponse);

    });

    afterEach(() => {
        nock.cleanAll();
        sinon.restore();
    });

    it('should validate constructor', () => {
        assert.strictEqual(telemetryClient._mgmtClient, mgmtClient);
        assert.strictEqual(telemetryClient.uriPrefix, mgmtClient.uriPrefix);
        assert.strictEqual(telemetryClient.authHeader, mgmtClient.authHeader);
        assert.strictEqual(telemetryClient.telemetryType, `${pkgjson.name}-data`);
        assert.strictEqual(telemetryClient.teemAssetInfo.name, `${pkgjson.name}`);
        assert.strictEqual(telemetryClient.teemAssetInfo.version, `${pkgjson.version}`);
        assert.strictEqual(telemetryClient.telemetryTypeVersion, constants.TELEMETRY_TYPE_VERSION);
    });

    it('should validate sendPostHook without custom properties', () => {
        const postHookConfig = {
            name: 'example_webhook',
            type: 'webhook',
            url: 'https://postman-echo.com/post'
        };
        sinon.stub(telemetryClient, '_getSystemInfo').resolves();
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
            name: 'example_webhook',
            type: 'webhook',
            url: 'https://postman-echo.com/post',
            properties: {
                customKey1: 'customValue1'
            }
        };
        const systemInfo = sinon.stub(telemetryClient, '_getSystemInfo').resolves({
            id: 'test-id01',
            product: 'test-product',
            version: 'test-version',
            platformId: 'test-platform-id',
            cpuCount: 121212,
            nicCount: 3,
            regKey: 'this is test regkey',
            memoryInMb: 33333,
            diskSize: 55555,
            hostname: 'this-is-test-hostname',
            management: 'this-is-test-mgmt',
            provisionedModules: undefined, /* eslint-disable-line @typescript-eslint/no-explicit-any */
            installedPackages: undefined, /* eslint-disable-line @typescript-eslint/no-explicit-any */
            environment: {
                pythonVersion: 'this is python version',
                pythonVersionDetailed: 'python version details',
                nodeVersion: 'node version',
                libraries: {
                    ssh: 'ssh version',
                }
        }
    });
        nock(postHookConfig.url)
            .post('/')
            .reply(200);
        telemetryClient.sendPostHook(postHookConfig)
            .then(() => {
                assert.strictEqual(systemInfo, postHookConfig);
            });
    });

    it('should validate sendPostHook rejects on failed request', () => {
        const postHookConfig = {
            name: 'example_webhook',
            type: 'webhook',
            url: 'https://postman-echo.com/post',
        };
        sinon.stub(telemetryClient, '_getSystemInfo').resolves();
        nock(postHookConfig.url)
            .post('/')
            .reply(404);
        telemetryClient.sendPostHook(postHookConfig)
            .catch((err) => {
                assert.ok(err.message.includes('Webhook failed: 404'));
            });
    });

    it('should validate _getSystemInfo', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/hardware')
            .reply(200, {entries: {
                    'https://localhost/mgmt/tm/sys/hardware/system-info': {
                        nestedStats: {
                            entries: {
                                'https://localhost/mgmt/tm/sys/hardware/system-info/0': {
                                    nestedStats: {
                                        entries: {
                                            bigipChassisSerialNum: {
                                                description: '74206d14-b631-d54a-16b0b09a25f8'
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
                    product: 'BIG-IP',
                    version: '14.1.2.6'
                }]})
            .get('/mgmt/tm/sys/global-settings')
            .reply(200, {hostname: 'f5vm01.local'})
            .get('/mgmt/tm/sys/management-ip')
            .reply(200, {items: [{
                    name: '10.1.0.5/24'
                }]})
            .get('/mgmt/tm/sys/provision')
            .reply(200, {items: [{
                    name: 'gtm',
                    level: 'minimum'
                }, {
                    name: 'ltm',
                    level: 'nominal'
                }]})
            .get('/mgmt/shared/iapp/installed-packages')
            .reply(200, {items:[{
                    packageName: 'f5-declarative-onboarding-1.12.0-1.noarch',
                    version: '1.12.0'
                }]});
        const expectedPayload = {
            id: '74206d14-b631-d54a-16b0b09a25f8',
            product: 'BIG-IP',
            version: '14.1.2.6',
            hostname: 'f5vm01.local',
            management: '10.1.0.5/24',
            provisionedModules: [{
                name: 'gtm',
                level: 'minimum'
            }, {
                name: 'ltm',
                level: 'nominal'
            }],
            installedPackages: [{
                packageName: 'f5-declarative-onboarding-1.12.0-1.noarch',
                version: '1.12.0'
            }]
        };
        sinon.stub(mgmtClient, 'isReady').resolves();
        telemetryClient._getSystemInfo()
            .then((result) => {
                assert.strictEqual(result, expectedPayload);
            })
    });

    it('should validate init method', () => {
        return telemetryClient.init({
            configFile: '/tmp/test-config.yaml',
            config: config,
            startTime: (new Date()).toISOString(),
            endTime: (new Date()).toISOString(),
            result: 'SUCCESS',
            resultSummary: 'This is test summary'
        })
            .then(() => {
                assert.strictEqual(telemetryClient.systemInfo.cpuCount, 2);
                assert.strictEqual(telemetryClient.systemInfo.product, 'BIG-IP');
                assert.strictEqual(telemetryClient.systemInfo.diskSize, 157696);
                assert.strictEqual(telemetryClient.systemInfo.platformId, 'Z100');
                assert.strictEqual(telemetryClient.systemInfo.version, '15.1.0.1');
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate createTelemetryData method', () => {
        const testDate = (new Date()).toISOString();
        return telemetryClient.init({
            configFile: '/tmp/test-config.yaml',
            config: config,
            startTime: testDate,
            endTime: testDate,
            result: 'SUCCESS',
            resultSummary: 'This is test summary'
        })
            .then(() => {
                const response = telemetryClient.createTelemetryData();
                console.log(JSON.stringify(response));
                assert.strictEqual(response.platform.platform, 'BIG-IP');
                assert.strictEqual(response.platform.platformId, 'Z100');
                assert.strictEqual(response.platform.deployment.cloud, 'aws');
                assert.strictEqual(response.operation.endTime, testDate);
                assert.strictEqual(response.operation.startTime, testDate);
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate report method', () => {
        telemetryClient.F5TeemDevice = sinon.stub().returns({
            report: sinon.stub().resolves()
        });
        return telemetryClient.init({
            configFile: '/tmp/test-config.yaml',
            config: config,
            startTime: (new Date()).toISOString(),
            endTime: (new Date()).toISOString(),
            result: 'SUCCESS',
            resultSummary: 'This is test summary'
        })
            .then(() => {
                return telemetryClient.report(telemetryClient.createTelemetryData())
            })
            .then(() => {
                assert.ok(true);
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate diskSize in Mb', () => {
        nock.cleanAll();
        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/ready')
            .reply(200, bigipMgmtSysReadyResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/hardware')
            .reply(200, bigipMgmtSysHardwareSizeInMbResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/software/volume')
            .reply(200, bigipMgmtSysSoftwareVolumeResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/global-settings')
            .reply(200, bigipMgmtSysGlobablSettingsResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/management-ip')
            .reply(200, bigipMgmtSysManagementIpResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/provision')
            .reply(200, bigipMgmtSysProvisionResponse);

        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/installed-packages')
            .reply(200, bigipMgmtSysInstalledPackagesResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/memory')
            .reply(200, bigipMgmtSysMemoryResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/license')
            .reply(200, bigipMgmtSysLicenseResponse);
        const emptyConfig = {};
        const testDate = (new Date()).toISOString();
        return telemetryClient.init({
            configFile: '/tmp/test-config.yaml',
            config: emptyConfig,
            startTime: testDate,
            endTime: testDate,
            result: 'SUCCESS',
            resultSummary: 'This is test summary'
        })
            .then(() => {
                const response = telemetryClient.createTelemetryData();
                assert.strictEqual(response.platform.system.diskSize, 154);
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate diskSize in Kb', () => {
        nock.cleanAll();
        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/ready')
            .reply(200, bigipMgmtSysReadyResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/hardware')
            .reply(200, bigipMgmtSysHardwareSizeInKbResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/software/volume')
            .reply(200, bigipMgmtSysSoftwareVolumeResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/global-settings')
            .reply(200, bigipMgmtSysGlobablSettingsResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/management-ip')
            .reply(200, bigipMgmtSysManagementIpResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/provision')
            .reply(200, bigipMgmtSysProvisionResponse);

        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/installed-packages')
            .reply(200, bigipMgmtSysInstalledPackagesResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/memory')
            .reply(200, bigipMgmtSysMemoryResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/license')
            .reply(200, bigipMgmtSysLicenseResponse);
        const emptyConfig = {};
        const testDate = (new Date()).toISOString();
        return telemetryClient.init({
            configFile: '/tmp/test-config.yaml',
            config: emptyConfig,
            startTime: testDate,
            endTime: testDate,
            result: 'SUCCESS',
            resultSummary: 'This is test summary'
        })
            .then(() => {
                const response = telemetryClient.createTelemetryData();
                assert.strictEqual(response.platform.system.diskSize, 15071);
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate empty declaration', () => {
        const emptyConfig = {};
        const testDate = (new Date()).toISOString();
        return telemetryClient.init({
            configFile: '/tmp/test-config.yaml',
            config: emptyConfig,
            startTime: testDate,
            endTime: testDate,
            result: 'SUCCESS',
            resultSummary: 'This is test summary'
        })
            .then(() => {
                const response = telemetryClient.createTelemetryData();
                assert.strictEqual(response.operation.endTime, testDate);
                assert.strictEqual(response.operation.startTime, testDate);
                assert.strictEqual(response.operation.rawCommand, 'f5-runtime-init -c /tmp/test-config.yaml');
                assert.strictEqual(response.product.locale, 'en-US');
                assert.strictEqual(response.product.version, pkgjson.version);
                assert.strictEqual(response.platform.nicCount, 2);
                assert.strictEqual(response.platform.platformId, 'Z100');
                assert.strictEqual(response.platform.deployment.cloud, 'aws');
                assert.strictEqual(response.platform.system.cpuCount, 2);
                assert.strictEqual(response.platform.system.diskSize, 157696);
                assert.strictEqual(response.platform.system.memory, 14016);
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate init without parameters', () => {
        return telemetryClient.init()
            .then(() => {
                const response = telemetryClient.createTelemetryData();
                assert.strictEqual(response.operation.endTime, 0);
                assert.strictEqual(response.operation.startTime, 0);
                assert.strictEqual(response.operation.rawCommand, undefined);
                assert.strictEqual(response.product.locale, 'en-US');
                assert.strictEqual(response.product.version, pkgjson.version);
                assert.strictEqual(response.platform.nicCount, 2);
                assert.strictEqual(response.platform.platformId, 'Z100');
                assert.strictEqual(response.platform.deployment.cloud, 'aws');
            }).catch(err => Promise.reject(err));
    });
});
