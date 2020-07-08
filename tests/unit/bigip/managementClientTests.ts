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
    host: '192.0.2.1',
    port: 443,
    user: 'admin',
    password: 'admin',
    useTls: true,
    maxRetries: 2,
    retryInterval: 2500
};

describe('BIG-IP Management Client', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor with defaults', () => {
        const mgmtClient = new ManagementClient();

        assert.strictEqual(mgmtClient.host, 'localhost');
        assert.strictEqual(mgmtClient.port, 8100);
        assert.strictEqual(mgmtClient.user, 'admin');
        assert.strictEqual(mgmtClient.password, 'admin');
        assert.strictEqual(mgmtClient.useTls, false);
    });

    it('should validate constructor', () => {
        const mgmtClient = new ManagementClient(standardOptions);

        assert.strictEqual(mgmtClient.host, standardOptions.host);
        assert.strictEqual(mgmtClient.port, standardOptions.port);
        assert.strictEqual(mgmtClient.user, standardOptions.user);
        assert.strictEqual(mgmtClient.password, standardOptions.password);
        assert.strictEqual(mgmtClient.useTls, standardOptions.useTls);
    });


    it('should perform ready check', async () => {
        const mgmtClient = new ManagementClient(standardOptions);

        nock(`https://${standardOptions.host}`)
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

        nock(`https://${standardOptions.host}`)
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
});
