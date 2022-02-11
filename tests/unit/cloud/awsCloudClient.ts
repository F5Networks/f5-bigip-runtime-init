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
import { AwsCloudClient } from '../../../src/lib/cloud/aws/cloudClient';
import * as bigipMgmtNetInterfacesResponse from '../payloads/bigip_mgmt_net_interface.json';
const cloud = 'aws';

describe('CloudClient - AWS', () => {
    let cloudClient;
    let metadataPathRequest;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        cloudClient = new AwsCloudClient();
        cloudClient.accountId = '1234543';
        cloudClient.customerId = '1234543';
        cloudClient.region = 'us-west';
        cloudClient.secretsManager = sinon.stub();
        cloudClient._sessionToken = 'TEST_SESSION_TOKEN';
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<object>{
                return Promise.resolve({ SecretString: 'StrongPassword2010!' });
            }
        }));
        cloudClient.logger = sinon.stub();
        cloudClient.logger.info = sinon.stub();
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<object>{
                return Promise.resolve({ SecretString: 'StrongPassword2010!' });
            }
        }));
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        assert.strictEqual(cloudClient.environment, cloud);
    });

    it('should validate init', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        cloudClient._getInstanceIdentityDoc = sinon.stub().resolves({
            region: 'some-aws-region',
            instanceId: 'some-instance-id'
        });
        cloudClient._fetchMetadataSessionToken = sinon.stub().resolves('TEST_SESSION_TOKEN');
        return cloudClient.init()
            .then(() => {
                assert.strictEqual(cloudClient.region, 'some-aws-region');
            });
    });

    it('should validate init metadata request promise rejection', () => {
        cloudClient._fetchMetadataSessionToken = sinon.stub().resolves('TEST_SESSION_TOKEN');
        cloudClient._getInstanceIdentityDoc = sinon.stub().rejects(new Error('Test Rejection'));
        return cloudClient.init()
            .then(() => {
                assert.ok(false);
            }).catch((err) => {
                assert.ok(err.message.includes('Test Rejection'));
            });
    });

    it('should call _getInstanceIdentityDoc to get instance data', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        cloudClient._getInstanceIdentityDoc()
        .then(() => {
            assert.strictEqual(metadataPathRequest, '/latest/dynamic/instance-identity/document');
        })
        .catch((err) => {
            assert.fail();
        });
    });

    it('_metadata should reject upon error with _getInstanceIdentityDoc', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        const expectedError = 'cannot contact AWS metadata service';
        return cloudClient.init()
            .then(() => {
                // eslint-disable-next-line arrow-body-style
                cloudClient._metadata.request = sinon.stub()
                    .callsFake((path, headers, callback) => {
                        callback(new Error(expectedError));
                    });
                return cloudClient._getInstanceIdentityDoc();
            })
            .then(() => {
                assert.ok(false, 'should have rejected');
            })
            .catch((err) => {
                assert.strictEqual(err.message, expectedError);
            });
    });

    it('should validate getCustomerId', () => {
        assert.strictEqual(cloudClient.getCustomerId(), '1234543');
    });

    it('should validate getRegion', () => {
        assert.strictEqual(cloudClient.getRegion(), 'us-west');
    });

    it('should validate getCloudName', () => {
        assert.strictEqual(cloudClient.getCloudName(), cloud);
    });

    it('should validate getSecret when secret exists', () => cloudClient.getSecret(
        'the-secret-name', {
            version: 'some-version'
        }
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret exists and version default used', () => cloudClient.getSecret(
        'the-secret-name'
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret does not exists', () => {
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<void> {
                return Promise.resolve();
            }
        }));
        cloudClient.getSecret(
            'incorrect-secret-name',
            {
                version: 'some-version'
            }
        )
            .then((secret) => {
                assert.strictEqual(secret, '');
            });
    });

    it('should validate getSecret promise rejection', () => {
        cloudClient.secretsManager.getSecretValue = sinon.stub().callsFake(() => ({
            promise(): Promise<void> {
                return Promise.reject(new Error('Test rejection'));
            }
        }));
        return cloudClient.getSecret(
            'incorrect-secret-name',
            {
                version: 'some-version'
            }
        )
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Test rejection'));
            });
    });

    it('should validate getSecret throws error when secret metadata is not provided', () => {
        cloudClient.getSecret().catch((err) => {
            if (err.message.includes('secert id is missing')) {
                assert.ok(true);
            }
        });
    });

    it('should fail getMetadata when field is missing', () => {
        cloudClient.getMetadata('', { type: 'compute' })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata field is missing'));
            });
    });

    it('should fail getMetadata when type is missing', () => {
        cloudClient.getMetadata('hostname')
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata type is missing'));
            });
    });

    it('should fail getMetadata when index is missing', () => {
        cloudClient.getMetadata('local-ipv4s', { type: 'network' })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata index is missing'));
            });
    });

    it('should fail getMetadata when wrong type is provided', () => {
        cloudClient.getMetadata('hostname', { type: 'bar' })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata type is unknown'));
            });
    });

    it('should validate getMetadata when compute type is provided', () => {
        cloudClient._sessionToken = 'TEST_SESSION_TOKEN';
        nock('https://169.254.169.254')
            .get('/latest/meta-data/hostname')
            .reply(200, 'ru65wrde_vm0' );
        cloudClient.getMetadata('hostname', { type: 'compute' })
            .then((result) => {
                assert.strictEqual(result, 'ru65wrde-vm0');
            })
            .catch((error) => {
                assert.fail(error);
            });
    });

    it('should call _fetchMetadataSessionToken to get session token', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, 'TEST_SESSION_TOKEN');
            });
        cloudClient._fetchMetadataSessionToken()
            .then(() => {
                assert.strictEqual(metadataPathRequest, '/latest/api/token');
                assert.strictEqual(cloudClient._sessionToken, 'TEST_SESSION_TOKEN');
            })
            .catch(() => {
                assert.fail();
            });
    });

    it('should call _fetchMetadataSessionToken to validate error case', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(true, 'TEST_SESSION_TOKEN');
            });
        cloudClient._fetchMetadataSessionToken()
            .then(() => {
                assert.fail();
            })
            .catch(() => {
                assert.ok(true);
            });
    });

    it('should call _fetchUri to validate function without query', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, 'pass');
            });
        cloudClient._fetchUri('/latest/meta-data/hostname')
            .then((result) => {
               assert.strictEqual(result,'pass');
            })
            .catch(() => {
                assert.fail();
            });
    });

    it('should call _fetchUri to validate function with query', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, "{\"test\" : \"pass\"}");
            });
        cloudClient._fetchUri('/latest/meta-data/hostname', 'test')
            .then((result) => {
                assert.strictEqual(result,'pass');
            })
            .catch((err) => {
                assert.fail(err);
            });
    });

    it('should call _getInstanceCompute to get instance data', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, 'ru65wrde-vm0');
            });
        cloudClient._getInstanceCompute('hostname')
        .then(() => {
            assert.strictEqual(metadataPathRequest, '/latest/meta-data/hostname');
        })
        .catch(() => {
            assert.fail();
        });
    });

    it('should validate _getInstanceCompute reject', () => {
        cloudClient._getInstanceCompute = sinon.stub().rejects(new Error('Test Rejection'));
        cloudClient._getInstanceCompute('hostname')
            .then((result) => {
                assert.fail(result);
            })
            .catch((err) => {
            assert.ok(err.message.includes('Test Rejection'));
            });
    });
    it('_metadata should reject upon error when using _getInstanceCompute', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        const expectedError = 'cannot contact AWS metadata service';
        return cloudClient.getMetadata('hostname', { type: 'compute'})
            .then(() => {
                // eslint-disable-next-line arrow-body-style
                cloudClient._metadata.request = sinon.stub()
                    .callsFake((path, headers, callback) => {
                        callback(new Error(expectedError));
                    });
                return cloudClient._getInstanceCompute('hostname');
            })
            .then(() => {
                assert.ok(false, 'should have rejected');
            })
            .catch((err) => {
                assert.strictEqual(err.message, expectedError);
            });
    });

    it('should validate getMetadata when network type is provided with local-ipv4s using index other than  0', () => {
        nock('https://169.254.169.254')
            .get('/latest/meta-data/network/interfaces/macs/fa:16:3e:c5:be:3d/local-ipv4s')
            .reply(200, '10.0.1.4');
        nock('https://169.254.169.254')
            .get('/latest/meta-data/network/interfaces/macs/fa:16:3e:c5:be:3d/subnet-ipv4-cidr-block')
            .reply(200, '10.0.1.0/24');
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient.getMetadata('local-ipv4s', { type: 'network', index: 1 })
            .then((result) => {
                assert.strictEqual(result, '10.0.1.4/24');
            })
            .catch((error) => {
                assert.fail(error);
            });
    });

    it('should validate getMetadata when network type is provided with subnet-ipv4-cidr-block using index 0', () => {
        cloudClient._getInstanceNetwork = sinon.stub().resolves('10.0.33.8/29');
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient.getMetadata('subnet-ipv4-cidr-block', { type: 'network', index: 0 })
            .then((result) => {
                assert.strictEqual(result, '10.0.33.9');
            })
            .catch((error) => {
                assert.fail(error);
            });
    });

    it('should validate getMetadata when network type is provided with subnet-ipv4-cidr-block using index 0', () => {
        nock('https://169.254.169.254')
            .get('/latest/meta-data/network/interfaces/macs/fa:16:3e:d0:b0:df/subnet-ipv4-cidr-block')
            .reply(200, '10.0.1.0/24');
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient.getMetadata('subnet-ipv4-cidr-block', { type: 'network', index: 0 })
            .then((result) => {
                assert.strictEqual(result, '10.0.1.1');
            })
            .catch((error) => {
                assert.fail(error);
            });
    });

    it('should validate getMetadata when type is uri and with query', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, "{\"test\" : \"pass\"}");
            });
        cloudClient.getMetadata('/latest/meta-data/hostname', { type: 'uri', query: 'test'})
            .then((result) => {
                assert.strictEqual(result, 'pass');
            })
            .catch((error) => {
                assert.fail(error);
            });
    });

    it('should validate getTagValue method call', () => {
        cloudClient._ec2 = sinon.stub();
        cloudClient._ec2.describeTags = sinon.stub().callsFake(() => ({
            promise(): Promise<any> {
                return Promise.resolve({ Tags: [{Value:"testValue"}]});
            }
        }));
        cloudClient.getTagValue('myTestKeyName', {})
            .then((tagValue) => {
                assert.strictEqual(tagValue, 'testValue');
            })
            .catch(() => {
                assert.fail();
            });
    });


    it('should validate getTagValue method call when no matching Tags', () => {
        cloudClient._ec2 = sinon.stub();
        cloudClient._ec2.describeTags = sinon.stub().callsFake(() => ({
            promise(): Promise<any> {
                return Promise.resolve({ Tags: []});
            }
        }));
        cloudClient.getTagValue('myTestKeyName', {})
            .then((tagValue) => {
                assert.strictEqual(tagValue, '');
            })
            .catch((err) => {
                assert.fail();
            });
    });

    it('should validate getTagValue method call when no Tags property recieved', () => {
        cloudClient._ec2 = sinon.stub();
        cloudClient._ec2.describeTags = sinon.stub().callsFake(() => ({
            promise(): Promise<any> {
                return Promise.resolve({});
            }
        }));
        cloudClient.getTagValue('myTestKeyName', {})
            .then((tagValue) => {
                assert.strictEqual(tagValue, '');
            })
            .catch((err) => {
                assert.fail();
            });
    });

    it('should validate getMetadata rejection when type is uri and with query', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(true, null);
            });
        cloudClient.getMetadata('/latest/meta-data/hostname', { type: 'uri', query: 'test'})
            .then(() => {
                assert.fail();
            })
            .catch(() => {
                assert.ok(true);
            });
    });

    it('should validate getMetadata when network type is provided with interface-id using index 0', () => {
        nock('https://169.254.169.254')
            .get('/latest/meta-data/network/interfaces/macs/fa:16:3e:d0:b0:df/interface-id')
            .reply(200, 'some-id');
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient.getMetadata('interface-id', { type: 'network', index: 0 })
            .then((result) => {
                assert.strictEqual(result, 'some-id');
            })
            .catch((error) => {
                assert.fail(error);
            });
    });

    it('should call _getInstanceNetwork to get instance data', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, '10.0.0.1');
            });
        cloudClient._getInstanceNetwork('subnet-ipv4-cidr-block', 'network', 'fa:16:3e:d0:b0:df')
        .then(() => {
            assert.strictEqual(metadataPathRequest, '/latest/meta-data/network/interfaces/macs/fa:16:3e:d0:b0:df/subnet-ipv4-cidr-block');
        })
        .catch(() => {
            assert.fail();
        });
    });

    it('should validate _getInstanceNetwork reject', () => {
        cloudClient._getInstanceNetwork = sinon.stub().rejects(new Error('Test Rejection'));
        cloudClient._getInstanceNetwork('subnet-ipv4-cidr-block', { type: 'network', index: 0 })
            .then((result) => {
                assert.fail(result);
            })
            .catch((err) => {
            assert.ok(err.message.includes('Test Rejection'));
            });
    });
    it('_metadata should reject upon error when using _getInstanceNetwork', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        const expectedError = 'cannot contact AWS metadata service';
        return cloudClient.getMetadata('interface-id', { type: 'network', index: 1 })
            .then(() => {
                // eslint-disable-next-line arrow-body-style
                cloudClient._metadata.request = sinon.stub()
                    .callsFake((path, headers, callback) => {
                        callback(new Error(expectedError));
                    });
                return cloudClient._getInstanceNetwork('interface-id');
            })
            .then(() => {
                assert.ok(false, 'should have rejected');
            })
            .catch((err) => {
                assert.strictEqual(err.message, expectedError);
            });
    });

    it('_metadata should reject upon error when using _getInstanceNetwork with local-ipv4s', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        const expectedError = 'cannot contact AWS metadata service';
        return cloudClient.getMetadata('local-ipv4s', { type: 'network', index: 1 })
            .then(() => {
                // eslint-disable-next-line arrow-body-style
                cloudClient._metadata.request = sinon.stub()
                    .callsFake((path, headers, callback) => {
                        callback(new Error(expectedError));
                    });
                return cloudClient._getInstanceNetwork('local-ipv4s');
            })
            .then(() => {
                assert.ok(false, 'should have rejected');
            })
            .catch((err) => {
                assert.strictEqual(err.message, expectedError);
            });
    });

    it('_metadata should reject upon error when using _getInstanceNetwork with subnet-ipv4-cidr-block', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                metadataPathRequest = path;
                callback(null, JSON.stringify({
                    region: 'some-aws-region',
                    instanceId: 'some-instance-id',
                    secretsManager: sinon.stub()
                }));
            });
        const expectedError = 'Invalid net address: {"region":"some-aws-region","instanceId":"some-instance-id"}';
        return cloudClient.getMetadata('subnet-ipv4-cidr-block', { type: 'network', index: 1 })
            .then(() => {
                // eslint-disable-next-line arrow-body-style
                cloudClient._metadata.request = sinon.stub()
                    .callsFake((path, headers, callback) => {
                        callback(new Error(expectedError));
                    });
                return cloudClient._getInstanceNetwork('subnet-ipv4-cidr-block');
            })
            .then(() => {
                assert.ok(false, 'should have rejected');
            })
            .catch((err) => {
                assert.strictEqual(err.message, expectedError);
            });
    });
});
