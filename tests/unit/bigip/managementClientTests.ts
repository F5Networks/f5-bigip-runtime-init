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
import nock from 'nock';

import { ManagementClient } from '../../../src/lib/bigip/managementClient';

const standardOptions = {
    port: 8100,
    user: 'admin',
    password: 'admin',
    verifyTls: false,
    maxRetries: 2,
    retryInterval: 2500
};
sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'info' });

describe('BIG-IP Management Client', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor with defaults', () => {
        const mgmtClient = new ManagementClient();

        assert.strictEqual(mgmtClient.port, 8100);
        assert.strictEqual(mgmtClient.user, 'admin');
        assert.strictEqual(mgmtClient.password, 'admin');
        assert.strictEqual(mgmtClient.verifyTls, false);
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardOptions);

        assert.strictEqual(mgmtClient.port, standardOptions.port);
        assert.strictEqual(mgmtClient.user, standardOptions.user);
        assert.strictEqual(mgmtClient.password, standardOptions.password);
        assert.strictEqual(mgmtClient.verifyTls, standardOptions.verifyTls);
    });

    it('should perform ready check', async () => {
        const mgmtClient = new ManagementClient(standardOptions);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/ready')
            .reply(200, {
                entries: {
                    'https://localhost/mgmt/tm/sys/ready/0': {
                        nestedStats: {
                            entries: {
                                system: {
                                    description: 'yes'
                                }
                            }
                        }
                    }
                }
            });

        const response = await mgmtClient.isReady();
        assert.strictEqual(response, true);
    });

    it('should validate ready check for failed case', async () => {
        const mgmtClient = new ManagementClient(standardOptions);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/ready')
            .times(102)
            .reply(200, {
                entries: {
                    'https://localhost/mgmt/tm/sys/ready/0': {
                        nestedStats: {
                            entries: {
                                system: {
                                    description: 'not'
                                }
                            }
                        }
                    }
                }
            });
        try {
            await mgmtClient.isReady();
        } catch (err) {
            assert.ok(err.message.includes('Ready check failed'));
        }
    }).timeout(30000000);

    it('getProxySettings should return proxy settings when configured', async () => {
        const mgmtClient = new ManagementClient(standardOptions);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/db')
            .reply(200, {
                items: [
                    {
                        name: 'proxy.password',
                        value: 'mypassword'
                    },
                    {
                        name: 'proxy.username',
                        value: 'myusername'
                    },
                    {
                        name: 'proxy.host',
                        value: 'myhost'
                    },
                    {
                        name: 'proxy.port',
                        value: 3128
                    },
                    {
                        name: 'proxy.protocol',
                        value: 'https'
                    }
                ]
            });

        const response = await mgmtClient.getProxySettings();
        assert.deepStrictEqual(response, { auth: { password: 'mypassword', username: 'myusername' }, host: 'myhost', port: 3128, protocol: 'https' });
    });

    it('getProxySettings should return empty object when not configured', async () => {
        const mgmtClient = new ManagementClient(standardOptions);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/db')
            .reply(200, {
                items: [
                    {
                        name: 'proxy.password',
                        value: '<null>'
                    },
                    {
                        name: 'proxy.username',
                        value: '<null>'
                    },
                    {
                        name: 'proxy.host',
                        value: '<null>'
                    },
                    {
                        name: 'proxy.port',
                        value: '<null>'
                    },
                    {
                        name: 'proxy.protocol',
                        value: '<null>'
                    }
                ]
            });

        const response = await mgmtClient.getProxySettings();
        assert.deepStrictEqual(response, {});
    });

    it('getProxySettings should reject on error', async () => {
        const mgmtClient = new ManagementClient(standardOptions);

        nock('http://localhost:8100')
            .get('/mgmt/tm/sys/db')
            .reply(500);
        try {
            await mgmtClient.getProxySettings();
        } catch (err) {
            assert.ok(err);
        }
    });
});
