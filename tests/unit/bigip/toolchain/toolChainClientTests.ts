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

import sinon from 'sinon';
import assert from 'assert';
import mock from 'mock-fs';
import nock from 'nock';

import { ManagementClient } from '../../../../src/lib/bigip/managementClient';
import { ToolChainClient } from '../../../../src/lib/bigip/toolchain/toolChainClient';

const standardMgmtOptions = {
    port: 8100,
    user: 'admin',
    password: 'admin',
    verifyTls: false
};

const standardToolchainOptions = {
    extensionVersion: '3.17.0',
    extensionHash: '41151962912408d9fc6fc6bde04c006b6e4e155fc8cc139d1797411983b7afa6',
    maxRetries: 3,
    retryInterval: 2500,
    verifyTls: true
};

const ilxToolchainOptions = {
    extensionVersion: '1.1.0',
    extensionUrl: 'file:///var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.1.0-1.noarch.rpm',
    extensionVerificationEndpoint: '/mgmt/shared/fast/info',
    maxRetries: 3,
    retryInterval: 2500
};

describe('BIG-IP Metadata Client', () => {
    it('should validate constructor', () => {
        const component = 'as3';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.component, component);
        assert.strictEqual(toolChainClient._metadataClient.version, standardToolchainOptions.extensionVersion);
        assert.strictEqual(toolChainClient._metadataClient.hash, standardToolchainOptions.extensionHash);
    });

    it('should return the component name', () => {
        const component = 'do';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getComponentName(), component);
    });

    it('should return the component version', () => {
        const component = 'as3';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getComponentVersion(), standardToolchainOptions.extensionVersion);
    });

    it('should return the component hash', () => {
        const component = 'as3';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getComponentHash(), standardToolchainOptions.extensionHash);
    });

    it('should return the download URL for an AT package', () => {
        const component = 'as3';
        const url = 'https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.17.0/f5-appsvcs-3.17.0-3.noarch.rpm';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getDownloadUrl(), url);
    });

    it('should return the download URL for an iLX package', () => {
        const component = 'ilx';
        const url = 'file:///var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.1.0-1.noarch.rpm';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, ilxToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getDownloadUrl(), url);
    });

    it('should return the download package name', () => {
        const component = 'as3';
        const packageName = 'f5-appsvcs-3.17.0-3.noarch.rpm';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getDownloadPackageName(), packageName);
    });

    it('should return the configuration endpoint', () => {
        const component = 'as3';
        const configEndpoint = '/mgmt/shared/appsvcs/declare';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getConfigurationEndpoint().endpoint, configEndpoint);
    });

    it('should return the info endpoint for an AT package', () => {
        const component = 'as3';
        const infoEndpoint = '/mgmt/shared/appsvcs/info';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getInfoEndpoint().endpoint, infoEndpoint);
    });

    it('should return the info endpoint for an iLX package', () => {
        const component = 'ilx';
        const infoEndpoint = '/mgmt/shared/fast/info';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, ilxToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getInfoEndpoint().endpoint, infoEndpoint);
    });
});

describe('BIG-IP Package Client', () => {
    afterEach(() => {
        mock.restore();
        if(!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`)
        }
        nock.cleanAll();
        sinon.restore();
    });

    beforeEach(() => {
        nock.cleanAll();
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const packageClient = toolChainClient.package;

        assert.strictEqual(packageClient.component, 'as3');
        assert.strictEqual(packageClient.version, standardToolchainOptions.extensionVersion);
    });

    it('should validate install done via URL', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const packageClient = toolChainClient.package;
        nock('http://localhost:8100')
            .post('/mgmt/shared/iapp/package-management-tasks')
            .reply(200, {
                id: "1"
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/package-management-tasks/1')
            .reply(200, {
                id: '1',
                status: 'FINISHED'
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/file-transfer/uploads/')
            .reply(200);
        nock('http://localhost:8100')
            .post('/mgmt/shared/file-transfer/uploads/f5-appsvcs-3.17.0-3.noarch.rpm')
            .times(30)
            .reply(200, {
                id: '1'
            });
        mock({
            '/var/lib/cloud/icontrollx_installs': {
                'f5-appsvcs-3.17.0-3.noarch.rpm': '1'
            }
        });
        return packageClient.install()
            .then((response) => {
                assert.strictEqual(response.component, 'as3');
                assert.strictEqual(response.version, '3.17.0');
                assert.ok(response.installed);
                nock.cleanAll();
            })
            .catch(err => Promise.reject(err));
    }).timeout(300000);

    it('should validate install done via FILE', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', ilxToolchainOptions);
        const packageClient = toolChainClient.package;
        nock('http://localhost:8100')
            .post('/mgmt/shared/iapp/package-management-tasks')
            .reply(200, {
                id: "1"
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/package-management-tasks/1')
            .reply(200, {
                id: '1',
                status: 'FINISHED'
            });
        mock({
            '/var/lib/cloud/icontrollx_installs': {
                'f5-appsvcs-templates-1.1.0-1.noarch.rpm': '12345'
            }
        });
        return packageClient.install()
            .then((response) => {
                assert.strictEqual(response.component, 'as3');
                assert.strictEqual(response.version,'1.1.0');
                assert.ok(response.installed);
            })
            .catch(err => Promise.reject(err));
    }).timeout(300000);


    it('should validate install failure via FILE when location is not valid', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const ilxToolchainOptions = {
            extensionVersion: '1.1.0',
            extensionUrl: 'file:///var/foo/cloud/icontrollx_installs/f5-appsvcs-templates-1.1.0-1.noarch.rpm',
            extensionVerificationEndpoint: '/mgmt/shared/fast/info'
        };
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', ilxToolchainOptions);
        const packageClient = toolChainClient.package;
        mock({
            '/var/foo/cloud/icontrollx_installs': {
                'f5-appsvcs-templates-1.1.0-1.noarch.rpm': '12345'
            }
        });
        return packageClient.install()
            .catch((err) => {
                assert.ok(err.message.includes('File path is invalid. Must be one of [ /var/lib/cloud, /var/lib/cloud/icontrollx_installs ]'));
            });
    }).timeout(300000);

    it('should validate installation failure due to FAILED status', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const packageClient = toolChainClient.package;
        nock('http://localhost:8100')
            .post('/mgmt/shared/iapp/package-management-tasks')
            .reply(200, {
                id: "1"
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/package-management-tasks/1')
            .reply(200, {
                id: '1',
                status: 'FAILED'
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/file-transfer/uploads/')
            .reply(200);
        nock('http://localhost:8100')
            .post('/mgmt/shared/file-transfer/uploads/f5-appsvcs-3.17.0-3.noarch.rpm')
            .times(30)
            .reply(200, {
                id: '1'
            });
        mock({
            '/var/lib/cloud/icontrollx_installs': {
                'f5-appsvcs-3.17.0-3.noarch.rpm': '12345'
            }
        });
        return packageClient.install()
            .catch((err) => {
                assert.ok(err.message.includes('RPM installation failed'));
                nock.cleanAll();
            });
    }).timeout(300000);

    it('should validate installation failure due to max retries', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const packageClient = toolChainClient.package;
        nock('http://localhost:8100')
            .post('/mgmt/shared/iapp/package-management-tasks')
            .reply(200, {
                id: "1"
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/iapp/package-management-tasks/1')
            .times(4)
            .reply(200, {
                id: '1',
                status: 'FOO'
            });
        nock('http://localhost:8100')
            .get('/mgmt/shared/file-transfer/uploads/')
            .reply(200);
        nock('http://localhost:8100')
            .post('/mgmt/shared/file-transfer/uploads/f5-appsvcs-3.17.0-3.noarch.rpm')
            .times(40)
            .reply(200, {
                id: '1'
            });
        mock({
            '/var/lib/cloud/icontrollx_installs': {
                'f5-appsvcs-3.17.0-3.noarch.rpm': '12345'
            }
        });
        return packageClient.install()
            .catch((err) => {
                console.log(err.message);
                assert.ok(err.message.includes('Max count exceeded'));
                nock.cleanAll();
            });
    }).timeout(300000);
});

describe('BIG-IP Service Client', () => {
    afterEach(function() {
        if(!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`)
        }
        nock.cleanAll();
        sinon.restore();
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const serviceClient = toolChainClient.service;

        assert.strictEqual(serviceClient.component, 'as3');
        assert.strictEqual(serviceClient.version, standardToolchainOptions.extensionVersion);
    });

    it('should validate isAvailable method', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const serviceClient = toolChainClient.service;
        nock('http://localhost:8100')
            .get('/mgmt/shared/appsvcs/info')
            .reply(200);
        return serviceClient.isAvailable()
            .catch(err => Promise.reject(err));
    });

    it('should validate  failure for isAvailable method', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const serviceClient = toolChainClient.service;
        nock('http://localhost:8100')
            .get('/mgmt/shared/appsvcs/info')
            .times(3)
            .reply(400);
        return serviceClient.isAvailable()
            .catch((err) => {
                assert.ok(err.message.includes('Is available check failed'));
            })
    }).timeout(3000000);


    it('should validate create method', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const serviceClient = toolChainClient.service;
        nock('http://localhost:8100')
            .post('/mgmt/shared/appsvcs/declare')
            .reply(202, {
                selfLink: 'https://localhost/tasks/myTask/1',
            });
        nock('http://localhost:8100')
            .get('/tasks/myTask/1')
            .reply(200);
        return serviceClient.create()
            .then((resp) => {
                assert.strictEqual(resp.code, 202);
            })
            .catch(err => Promise.reject(err));
    });
});

describe('BIG-IP Toolchain Client', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor for AT package', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);

        assert.strictEqual(toolChainClient._mgmtClient, mgmtClient);
        assert.strictEqual(toolChainClient.component, 'as3');
        assert.strictEqual(toolChainClient.version, standardToolchainOptions.extensionVersion);
        assert.strictEqual(toolChainClient.hash, standardToolchainOptions.extensionHash);
        assert.ok(toolChainClient._metadataClient !== null);
    });

    it('should validate constructor for iLX package', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'ilx', ilxToolchainOptions);

        assert.strictEqual(toolChainClient._mgmtClient, mgmtClient);
        assert.strictEqual(toolChainClient.component, 'ilx');
        assert.strictEqual(toolChainClient.url, ilxToolchainOptions.extensionUrl);
        assert.strictEqual(toolChainClient.infoEndpoint, ilxToolchainOptions.extensionVerificationEndpoint);
        assert.ok(toolChainClient._metadataClient !== null);
    });
});
