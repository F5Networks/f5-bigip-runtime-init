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

import { ManagementClient } from '../../../../src/lib/bigip/managementClient';
import { ToolChainClient } from '../../../../src/lib/bigip/toolchain/toolChainClient';

const standardMgmtOptions = {
    host: '192.0.2.1',
    port: 443,
    user: 'admin',
    password: 'admin',
    useTls: true
};

const standardToolchainOptions = {
    extensionVersion: '3.17.0',
    extensionHash: '41151962912408d9fc6fc6bde04c006b6e4e155fc8cc139d1797411983b7afa6'
};

const ilxToolchainOptions = {
    extensionUrl: 'file:///var/lib/cloud/icontrollx_installs/f5-appsvcs-templates-1.1.0-1.noarch.rpm',
    extensionVerificationEndpoint: '/mgmt/shared/fast/info'
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
        sinon.restore();
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const packageClient = toolChainClient.package;

        assert.strictEqual(packageClient.component, 'as3');
        assert.strictEqual(packageClient.version, standardToolchainOptions.extensionVersion);
    });
});

describe('BIG-IP Service Client', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);
        const serviceClient = toolChainClient.service;

        assert.strictEqual(serviceClient.component, 'as3');
        assert.strictEqual(serviceClient.version, standardToolchainOptions.extensionVersion);
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
