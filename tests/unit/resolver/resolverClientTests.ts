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
import { ResolverClient } from '../../../src/lib/resolver/resolverClient';
import Logger from '../../../src/lib/logger';
sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'info' });


describe('Resolver Client', () => {
    let runtimeParameters;
    let onboardActions;
    let logger: Logger;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        nock.cleanAll();
        nock('http://169.254.169.254')
            .get('/latest/dynamic/instance-identity/document')
            .reply(200, {
                "accountId" : "0000000001",
                "architecture" : "x86_64",
                "availabilityZone" : "us-west-2a",
                "billingProducts" : null,
                "devpayProductCodes" : null,
                "marketplaceProductCodes" : [ "asdasdasfavzxcz" ],
                "imageId" : "ami-000001",
                "instanceId" : "i-0a43ae03d7f8e8f42",
                "instanceType" : "m5.xlarge",
                "kernelId" : null,
                "pendingTime" : "2020-11-19T21:20:26Z",
                "privateIp" : "10.0.0.165",
                "ramdiskId" : null,
                "region" : "us-west-2",
                "version" : "2017-09-30"
            });
        nock('http://169.254.169.254')
            .get('/latest/dynamic/instance-networks/document')
            .reply(200, {
                "accountId" : "0000000001",
                "ipaddress": "192.168.1.22/24",
                "instanceId" : "i-0a43ae03d7f8e8f42",
                "kernelId" : null,
                "pendingTime" : "2020-11-19T21:20:26Z",
                "privateIp" : "10.0.0.165",
                "ramdiskId" : null,
                "region" : "us-west-2",
                "version" : "2017-09-30"
            });

        onboardActions = [
            {
                name: "test_inline_command",
                type: "inline",
                commands: [
                    "test_command_01",
                    "test_command_02"
                ]
            },
            {
                name: "test_file_command",
                type: "file",
                commands: [
                    "test-directory/test-script-01",
                    "test-directory/test-script-02"
                ]
            },
            {
                name: "test_url_command",
                type: "url",
                commands: [
                    "https://test-directory/test-script-01",
                    "https://test-directory/test-script-02"
                ],
                verifyTls: true
            }
        ];

        runtimeParameters = [
            {
                name: 'AWS_PASS',
                type: 'secret',
                secretProvider: {
                    type: 'SecretsManager',
                    environment: 'aws',
                    version: 'AWSCURRENT',
                    secretId: 'secert-document'
                }
            },
            {
                name: 'REGION',
                type: 'url',
                value: 'http://169.254.169.254/latest/dynamic/instance-identity/document',
                query: 'region',
                headers: [ { name: 'Content-Type', value: 'json'}]
            },
            {
                name: 'NETWORK_SIZE_URL',
                type: 'url',
                value: 'http://169.254.169.254/latest/dynamic/instance-networks/document',
                query: 'ipaddress',
                ipcalc: 'size',
                headers: [ { name: 'Content-Type', value: 'json'}]
            },
            {
                name: 'AZURE_PASS',
                type: 'secret',
                secretProvider: {
                    type: 'SecretClient',
                    environment: 'azure',
                    version: '6e86876be4ce46a49ec578dfda897593',
                    secretId: 'this-secret',
                    field: 'sensitiveFieldName',
                    debug: true
                }
            },
            {
                name: 'AZURE_HOST_NAME',
                type: 'metadata',
                metadataProvider: {
                    type: 'compute',
                    environment: 'azure',
                    field: 'name'
                }
            },
            {
                name: 'AZURE_SELF_IP',
                type: 'metadata',
                metadataProvider: {
                    type: 'network',
                    environment: 'azure',
                    field: 'ipv4',
                    index: 1
                }
            },
            {
                name: 'AZURE_SELF_IP_ADDRESS',
                type: 'metadata',
                metadataProvider: {
                    ipcalc: 'address',
                    type: 'network',
                    environment: 'azure',
                    field: 'ipv4',
                    index: 1
                }
            },
            {
                name: 'AZURE_GATEWAY_IP',
                type: 'metadata',
                metadataProvider: {
                    ipcalc: 'first',
                    type: 'network',
                    environment: 'azure',
                    field: 'ipv4',
                    index: 1
                }
            },
            {
                name: 'AZURE_BITMASK',
                type: 'metadata',
                metadataProvider: {
                    ipcalc: 'bitmask',
                    type: 'network',
                    environment: 'azure',
                    field: 'ipv4',
                    index: 1
                }
            },
            {
                name: 'SOME_NAME',
                type: 'static',
                value: 'SOME VALUE'
            },
            {
                name: 'NETWORK_SIZE_STATIC',
                type: 'static',
                value: '192.168.1.22/24',
                ipcalc: 'size'
            }
        ];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        const resolver = new ResolverClient();
        assert.strictEqual(typeof resolver, 'object');
    });

    it('should validate resolveRuntimeParameters', () => {
        const resolver = new ResolverClient();
        resolver.getCloudProvider = sinon.stub().callsFake(() => {
            const cloudClient = {
                init: sinon.stub(),
                getSecret: sinon.stub().resolves('StrongPassword2010+'),
                getMetadata: sinon.stub().resolves('')
            };
            return Promise.resolve(cloudClient);
        });
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.strictEqual(Object.keys(results).length, 6);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AWS_PASS, 'StrongPassword2010+');
                assert.strictEqual(results.AZURE_PASS, 'StrongPassword2010+');
                assert.strictEqual(results.REGION, 'us-west-2');
                assert.strictEqual(results.NETWORK_SIZE_URL, 256);
                assert.strictEqual(results.NETWORK_SIZE_STATIC, 256);
            });
    });

    it('should validate resolveRuntimeParameters for hashicorp case', () => {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'silly' });
        logger = Logger.getLogger();
        const resolver = new ResolverClient();
        nock('http://1.1.1.1:8200')
            .post('/v1/auth/approle/login')
            .times(3)
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
        nock('http://1.1.1.1:8200')
            .get('/v1/kv/data/credential')
            .times(3)
            .reply(200, {"request_id":"fa302a64-0852-4245-1883-782fe8b5b504","lease_id":"","renewable":false,"lease_duration":0,"data":{"data":{"password":"b1gAdminPazz","bigiq_admin_password":"thisIsTestPassword123","bigiq_admin_username":"asdasfdar212@"},"metadata":{"created_time":"2021-08-08T12:16:00.931168619Z","deletion_time":"","destroyed":false,"version":1}},"wrap_info":null,"warnings":null,"auth":null});
        runtimeParameters = [
            {
                name: 'SECRET_FROM_HASHICORP_VAULT_01',
                type: 'secret',
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
                }
            },
            {
                name: 'SECRET_FROM_HASHICORP_VAULT_02',
                type: 'secret',
                secretProvider: {
                    type: 'Vault',
                    environment: 'hashicorp',
                    vaultServer: 'http://1.1.1.1:8200',
                    secretsEngine: 'kv2',
                    secretPath: 'kv/data/credential',
                    field: 'bigiq_admin_password',
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
                }
            },
            {
                name: 'SECRET_FROM_HASHICORP_VAULT_03',
                type: 'secret',
                secretProvider: {
                    type: 'Vault',
                    environment: 'hashicorp',
                    vaultServer: 'http://1.1.1.1:8200',
                    secretsEngine: 'kv2',
                    secretPath: 'kv/data/credential',
                    field: 'bigiq_admin_username',
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
                }
            }
        ];
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 3);
                assert.strictEqual(results['SECRET_FROM_HASHICORP_VAULT_01'], 'b1gAdminPazz');
                assert.strictEqual(results['SECRET_FROM_HASHICORP_VAULT_02'], 'thisIsTestPassword123');
                assert.strictEqual(results['SECRET_FROM_HASHICORP_VAULT_03'], 'asdasfdar212@');
            });
    });

    it('should validate resolveRuntimeParameters object for hashicorp case', () => {
        sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'silly' });
        logger = Logger.getLogger();
        const resolver = new ResolverClient();
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
        nock('http://1.1.1.1:8200')
            .get('/v1/kv/data/credential')
            .reply(200, {"request_id":"fa302a64-0852-4245-1883-782fe8b5b504","lease_id":"","renewable":false,"lease_duration":0,"data":{"data":{"secret0":"b1gAdminPazz","secret1":"thisIsTestPassword123","secret2":"asdasfdar212@"},"metadata":{"created_time":"2021-08-08T12:16:00.931168619Z","deletion_time":"","destroyed":false,"version":1}},"wrap_info":null,"warnings":null,"auth":null});
        runtimeParameters = [
            {
                name: 'SECRET_FROM_HASHICORP_VAULT',
                type: 'secret',
                secretProvider: {
                    type: 'Vault',
                    environment: 'hashicorp',
                    vaultServer: 'http://1.1.1.1:8200',
                    secretsEngine: 'kv2',
                    secretPath: 'kv/data/credential',
                    field: 'data',
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
                }
            }
        ];
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.strictEqual(results['SECRET_FROM_HASHICORP_VAULT'].secret0, 'b1gAdminPazz');
                assert.strictEqual(results['SECRET_FROM_HASHICORP_VAULT'].secret1, 'thisIsTestPassword123');
                assert.strictEqual(results['SECRET_FROM_HASHICORP_VAULT'].secret2, 'asdasfdar212@');
            });
    });


    it('should validate resolveRuntimeParameters no secret match', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('');
        resolver._resolveMetadata = sinon.stub().resolves('ru65wrde-vm0');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.strictEqual(Object.keys(results).length, 9);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AZURE_HOST_NAME, 'ru65wrde-vm0');
            });
    });

    it('should validate self IP metadata and ipcalc resolveRuntimeParameters', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('');
        resolver.getCloudProvider = sinon.stub().callsFake(() => {
            const cloudClient = {
                init: sinon.stub(),
                getMetadata: sinon.stub().resolves('10.0.1.4/24')
            };
            return Promise.resolve(cloudClient);
        });
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.strictEqual(Object.keys(results).length, 9);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AZURE_SELF_IP, '10.0.1.4/24');
                assert.strictEqual(results.AZURE_GATEWAY_IP, '10.0.1.1');
                assert.strictEqual(results.AZURE_BITMASK, 24);
                assert.strictEqual(results.AZURE_SELF_IP_ADDRESS, '10.0.1.4');
            });
    });

    it('should validate resolveRuntimeParameters no parameter match', () => {
        const resolver = new ResolverClient();
        resolver._resolveSecret = sinon.stub().resolves('');
        resolver._resolveMetadata = sinon.stub().resolves('');
        resolver._resolveUrl = sinon.stub().resolves('');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.strictEqual(Object.keys(results).length, 2);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.NETWORK_SIZE_STATIC, 256);
            });
    });

    it('should validate unknown runtime parameter case', () => {
        const resolver = new ResolverClient();
        runtimeParameters = [
            {
                name: 'AWS_PASS',
                type: 'wrong',
                secretProvider: {
                    type: 'SecretsManager',
                    environment: 'aws',
                    version: 'AWSCURRENT',
                    secretId: 'secert-document'
                }
            },
            {
                name: 'AZURE_PASS',
                type: 'wrong',
                secretProvider: {
                    type: 'SecretClient',
                    environment: 'azure',
                    version: '6e86876be4ce46a49ec578dfda897593',
                    secretId: 'this-secret',
                    debug: true
                }
            },
            {
                name: 'AZURE_HOST_NAME',
                type: 'wrong',
                metadataProvider: {
                    type: 'compute',
                    environment: 'azure',
                    field: 'name'
                }
            },
            {
                name: 'SOME_NAME',
                type: 'static',
                value: 'SOME VALUE'
            }
        ];

        resolver.resolveRuntimeParameters(runtimeParameters)
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Runtime parameter type is unknown'));
            });
    });

    it('should validate resolveOnboardActions', () => {
        const resolver = new ResolverClient();
        resolver.utilsRef.verifyDirectory = sinon.stub();
        resolver.utilsRef.runShellCommand = sinon.stub().resolves('');
        resolver.utilsRef.downloadToFile = sinon.stub().resolves('');
        return resolver.resolveOnboardActions(onboardActions, true)
            .then(() => {
                assert.ok(resolver.utilsRef.verifyDirectory.called);
                assert.ok(resolver.utilsRef.runShellCommand.called);
                assert.ok(resolver.utilsRef.downloadToFile.called);
            })
            .catch(() => {
                assert.ok(false);
            });
    });

    it('should validate resolveOnboardActions with no secrets in actions', () => {
        const resolver = new ResolverClient();
        resolver.utilsRef.verifyDirectory = sinon.stub();
        resolver.utilsRef.runShellCommand = sinon.stub().resolves('');
        resolver.utilsRef.downloadToFile = sinon.stub().resolves('');
        return resolver.resolveOnboardActions(onboardActions, false)
            .then(() => {
                assert.ok(resolver.utilsRef.verifyDirectory.called);
                assert.ok(resolver.utilsRef.runShellCommand.called);
                assert.ok(resolver.utilsRef.downloadToFile.called);
            })
            .catch(() => {
                assert.ok(false);
            });
    });

    it('should validate resolveOnboardActions throw error', () => {
        const resolver = new ResolverClient();
        resolver.utilsRef.verifyDirectory = sinon.stub();
        const invalidOnboardActions = [
            {
                name: "test_inline_command",
                type: "invalid",
                commands: [
                    "test_command_01",
                    "test_command_02"
                ]
            }
        ];
        return resolver.resolveOnboardActions(invalidOnboardActions)
            .then(() => {
                assert.ok(false);
            })
            .catch((error) => {
                assert.ok(error.message.includes('Unexpected onboard action type'))
            });
    });

    it('should validate _resolveUrl throw error when invalida JSON', () => {
        const resolver = new ResolverClient();
        nock.cleanAll();
        runtimeParameters = [
            {
                name: 'REGION',
                type: 'url',
                value: 'http://169.254.169.254/my-test'
            }
        ];
        nock('http://169.254.169.254')
            .get('/my-test')
            .reply(200, 'us-west');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => assert.strictEqual(results.REGION, 'us-west'))
            .catch(() => assert.ok(false))
    });

    it('should validate _resolveUrl works correctly when fetched string value is bigger than supported number data type', () => {
        const resolver = new ResolverClient();
        nock.cleanAll();
        runtimeParameters = [
            {
                name: 'TEST_PASSWORD',
                type: 'url',
                value: 'http://169.254.169.254/my-test-password'
            }
        ];
        nock('http://169.254.169.254')
            .get('/my-test-password')
            .reply(200, '9058358705045800063');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => assert.strictEqual(results.TEST_PASSWORD, '9058358705045800063'))
            //.catch(() => assert.ok(false))
    });
});
