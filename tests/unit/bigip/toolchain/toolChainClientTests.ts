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
    version: '3.17.0',
    hash: '41151962912408d9fc6fc6bde04c006b6e4e155fc8cc139d1797411983b7afa6'
};

describe('BIG-IP Metadata Client', () => {
    it('should validate constructor', () => {
        const component = 'as3';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.component, component);
        assert.strictEqual(toolChainClient._metadataClient.version, standardToolchainOptions.version);
        assert.strictEqual(toolChainClient._metadataClient.hash, standardToolchainOptions.hash);
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

        assert.strictEqual(toolChainClient._metadataClient.getComponentVersion(), standardToolchainOptions.version);
    });

    it('should return the component hash', () => {
        const component = 'as3';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

        assert.strictEqual(toolChainClient._metadataClient.getComponentHash(), standardToolchainOptions.hash);
    });

    it('should return the download URL', () => {
        const component = 'as3';
        const url = 'https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.17.0/f5-appsvcs-3.17.0-3.noarch.rpm';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

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

    it('should return the info endpoint', () => {
        const component = 'as3';
        const infoEndpoint = '/mgmt/shared/appsvcs/info';
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, component, standardToolchainOptions);

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
        assert.strictEqual(packageClient.version, standardToolchainOptions.version);
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
        assert.strictEqual(serviceClient.version, standardToolchainOptions.version);
    });

});

describe('BIG-IP Toolchain Client', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardMgmtOptions);
        const toolChainClient = new ToolChainClient(mgmtClient, 'as3', standardToolchainOptions);

        assert.strictEqual(toolChainClient._mgmtClient, mgmtClient);
        assert.strictEqual(toolChainClient.component, 'as3');
        assert.strictEqual(toolChainClient.version, standardToolchainOptions.version);
        assert.strictEqual(toolChainClient.hash, standardToolchainOptions.hash);
        assert.ok(toolChainClient._metadataClient !== null);
    });
});
