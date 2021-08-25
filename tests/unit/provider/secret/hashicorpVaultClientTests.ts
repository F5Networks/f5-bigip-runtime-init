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
import { HashicorpVaultClient } from '../../../../src/lib/provider/secret/hashicorpVaultClient';


describe('Resolver Client', () => {

    let secretMetadata;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        nock.cleanAll();
        secretMetadata = {
            secretProvider: {
                type: 'Vault',
                environment: 'hashicorp',
                vaultServer: 'http://1.1.1.1:8200',
                secretsEngine: 'kv2',
                secretPath: 'kv/data/credential',
                field: 'password',
                version: '1',
                authBackend: {
                    type: 'approle',
                    roleId: {
                        type: 'inline',
                        value: 'qweq-qweq-qwe'
                    },
                    secretId: {
                        type: 'inline',
                        value: 'ewq-eq-eqw'
                    }
                }
            },
            type: 'secret',
            verifyTls: true,
            name: 'TEST'
        };
        nock('http://1.1.1.1:8200')
            .post('/v1/auth/approle/login')
            .reply(200,
                {"request_id":"89527902-256d-0bd0-328b-8288549b991c","lease_id":"",
                    "renewable":false,"lease_duration":0,"data":null,
                    "wrap_info":null,"warnings":null,
                    "auth":{"client_token":"this-is-test-token-value",
                        "accessor":"DR8vhrYNUK7CrkRvextEn4CN",
                        "policies":["default","test"],
                        "token_policies":["default","test"],
                        "metadata":{"role_name":"runtime-init-role"},
                        "lease_duration":3600,"renewable":true,
                        "entity_id":"8b693540-35da-99b9-22fe-70b9eabbd159",
                        "token_type":"service",
                        "orphan":true}
                });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        const hashicorpClient = new HashicorpVaultClient();
        assert.strictEqual(typeof hashicorpClient, 'object');
    });

    it('should validate login method with inline secretId and roleId', () => {
        const hashicorpClient = new HashicorpVaultClient();
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
            });
    });

    it('should validate login method when verifyTls=true with inline secretId and roleId', () => {
        const hashicorpClient = new HashicorpVaultClient();
        secretMetadata.verifyTls = true;
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
            });
    });

    /* eslint-disable  @typescript-eslint/camelcase */
    it('should validate login method with inline secretId and url for roleId as json', () => {
        const hashicorpClient = new HashicorpVaultClient();
        secretMetadata.secretProvider.authBackend.roleId.type = 'url';
        secretMetadata.secretProvider.authBackend.roleId.value = 'https://somedomain.com/document.foo';
        nock('https://somedomain.com')
            .get('/document.foo')
            .reply(200, { role_id: 'roleId-test-value' });


        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
            });
    });

    it('should validate login method with inline secretId and url for roleId as plain text', () => {
        const hashicorpClient = new HashicorpVaultClient();
        secretMetadata.secretProvider.authBackend.roleId.type = 'url';
        secretMetadata.secretProvider.authBackend.roleId.value = 'https://somedomain.com/document.foo';
        secretMetadata.verifyTls = true;
        nock('https://somedomain.com')
            .get('/document.foo')
            .reply(200, 'roleId-test-value' );
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
            });
    });

    /* eslint-disable  @typescript-eslint/camelcase */
    it('should validate login method with url secretId as json and inline roleId', () => {
        const hashicorpClient = new HashicorpVaultClient();
        secretMetadata.secretProvider.authBackend.secretId.type = 'url';
        secretMetadata.secretProvider.authBackend.secretId.value = 'https://somedomain.com/document.foo';
        nock('https://somedomain.com')
            .get('/document.foo')
            .reply(200, { role_id: 'secretId-test-value' });


        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
            });
    });

    it('should validate login method with inline secretId and url for roleId as plain text', () => {
        const hashicorpClient = new HashicorpVaultClient();
        secretMetadata.secretProvider.authBackend.secretId.type = 'url';
        secretMetadata.secretProvider.authBackend.secretId.value = 'https://somedomain.com/document.foo';
        nock('https://somedomain.com')
            .get('/document.foo')
            .reply(200, 'secretId-test-value' );
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
            });
    });

    it('should validate invalid login method', () => {
        nock.cleanAll();
        const hashicorpClient = new HashicorpVaultClient();
        nock('http://1.1.1.1:8200')
            .post('/v1/auth/approle/login')
            .reply(403, {"result": "Access Denied"});
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.fail();
            })
            .catch((err) => {
                assert.ok(err.message.indexOf('Problem with getting client token from HashicorpVaultClient') !== -1);
            });
    });

    it('should validate getSecret method', () => {
        const hashicorpClient = new HashicorpVaultClient();
        nock('http://1.1.1.1:8200')
            .get('/v1/kv/data/credential')
            .reply(200, {"request_id":"61ac698f-15d1-17dc-9095-b23626ea1b97","lease_id":"","renewable":false,"lease_duration":0,"data":{"data":{"password":"b1gAdminPazz"},"metadata":{"created_time":"2021-06-24T16:15:45.963605157Z","deletion_time":"","destroyed":false,"version":1}},"wrap_info":null,"warnings":null,"auth":null});
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
                return hashicorpClient.getSecret(secretMetadata)
            })
            .then((secretValue) => {
                assert.strictEqual(secretValue, 'b1gAdminPazz')
            });
    });

    it('should validate getSecret method with verifyTls=true', () => {
        const hashicorpClient = new HashicorpVaultClient();
        nock('http://1.1.1.1:8200')
            .get('/v1/kv/data/credential')
            .reply(200, {"request_id":"61ac698f-15d1-17dc-9095-b23626ea1b97","lease_id":"","renewable":false,"lease_duration":0,"data":{"data":{"password":"b1gAdminPazz"},"metadata":{"created_time":"2021-06-24T16:15:45.963605157Z","deletion_time":"","destroyed":false,"version":1}},"wrap_info":null,"warnings":null,"auth":null});
        secretMetadata.verifyTls = true;
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
                return hashicorpClient.getSecret(secretMetadata)
            })
            .then((secretValue) => {
                assert.strictEqual(secretValue, 'b1gAdminPazz')
            });
    });

    it('should validate getSecret method with verifyTls=false', () => {
        const hashicorpClient = new HashicorpVaultClient();
        nock('http://1.1.1.1:8200')
            .get('/v1/kv/data/credential')
            .reply(200, {"request_id":"61ac698f-15d1-17dc-9095-b23626ea1b97","lease_id":"","renewable":false,"lease_duration":0,"data":{"data":{"password":"b1gAdminPazz"},"metadata":{"created_time":"2021-06-24T16:15:45.963605157Z","deletion_time":"","destroyed":false,"version":1}},"wrap_info":null,"warnings":null,"auth":null});
        secretMetadata.verifyTls = false;
        return hashicorpClient.login(secretMetadata)
            .then(() => {
                assert.strictEqual(hashicorpClient.clientToken, 'this-is-test-token-value');
                return hashicorpClient.getSecret(secretMetadata)
            })
            .then((secretValue) => {
                assert.strictEqual(secretValue, 'b1gAdminPazz')
            });
    });
});
