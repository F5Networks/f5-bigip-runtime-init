/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

import assert from 'assert';
import sinon from 'sinon';
import nock from 'nock';
import { GcpCloudClient } from '../../../src/lib/cloud/gcp/cloudClient';
const cloud = 'gcp';
sinon.stub(process, 'env').value({ F5_BIGIP_RUNTIME_INIT_LOG_LEVEL: 'silly' });

describe('CloudClient - GCP', () => {
    let cloudClient;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        nock.cleanAll();
        cloudClient = new GcpCloudClient();
        cloudClient.logger = sinon.stub();
        cloudClient.logger.info = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        assert.strictEqual(cloudClient.environment, cloud);
    });

    it('should validate init', () => {
        cloudClient._getProjectId = sinon.stub().resolves('my-project');
        cloudClient.getAuthHeaders = sinon.stub().resolves({
            Authorization: 'Bearer my-token'
        });
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
        .then(() => {
            assert.strictEqual(cloudClient.projectId, 'my-project');
        })
        .then(() => {
            assert.deepStrictEqual(cloudClient.authHeaders, {
                Authorization: 'Bearer my-token'
            });
        })
        .then(() => {
            assert.strictEqual(cloudClient.region, 'my-region');
        })
        .catch(err => Promise.reject(err));
    });

    it('should validate init metadata request promise rejection _getProjectId', () => {
        cloudClient._getProjectId = sinon.stub().rejects(new Error('Test Rejection'));
        cloudClient.getAuthHeaders = sinon.stub().resolves({
            Authorization: 'Bearer my-token'
        });
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
        .then(() => {
            assert.ok(false);
        }).catch((err) => {
            assert.ok(err.message.includes('Test Rejection'));
        });
    });

    it('should validate init metadata request promise rejection getAuthHeaders', () => {
        cloudClient.getAuthHeaders = sinon.stub().rejects(new Error('Test Rejection'));
        cloudClient._getProjectId = sinon.stub().resolves('my-project');
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
        .then(() => {
            assert.ok(false);
        }).catch((err) => {
            assert.ok(err.message.includes('Test Rejection'));
        });
    });

    it('should validate getCloudName', () => {
        assert.strictEqual(cloudClient.getCloudName(), cloud);
    });

    it('should validate getCustomerId', () => {
        cloudClient._getProjectId = sinon.stub().resolves('my-project');
        cloudClient.getAuthHeaders = sinon.stub().resolves({
            Authorization: 'Bearer my-token'
        });
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
        .then(() => {
            assert.strictEqual(cloudClient.getCustomerId(), 'my-project');
        })
        .catch(err => Promise.reject(err));

    });

    it('should validate getRegion', () => {
        cloudClient._getProjectId = sinon.stub().resolves('my-project');
        cloudClient.getAuthHeaders = sinon.stub().resolves({
            Authorization: 'Bearer my-token'
        });
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
        .then(() => {
            assert.strictEqual(cloudClient.getRegion(), 'my-region');
        })
        .catch(err => Promise.reject(err));

    });

    it('should validate _getRegion', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/instance/zone')
            .reply(200, 'projects/121231/zones/us-west-2');
        return cloudClient._getRegion()
        .then((region) => {
            assert.strictEqual(region, 'us-west-2');
        })
        .catch(err => Promise.reject(err));

    });

    it('should validate _getProject', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/project/project-id')
            .reply(200, 'my-project');
        return cloudClient._getProjectId()
        .then((projectId) => {
            assert.strictEqual(projectId, 'my-project');
        });
    });

    it('should validate _getProject promise rejection', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/project/project-id')
            .reply(400, 'foo');
        return cloudClient._getProjectId()
        .then(() => {
            assert.ok(false);
        })
        .catch((err) => {
            assert.ok(err.message.includes('Error getting project id'));
        });
    });

    it('should validate getTagValue method returns tagValue', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/instance/name')
            .reply(200, 'test_vm_name-01');
        cloudClient.compute = sinon.stub();
        cloudClient.compute.zone = sinon.stub().returns({
            vm: sinon.stub().returns({
                getMetadata: sinon.stub().resolves([{labels: {myTestKeyName: 'testValue'}}])
            })
        });
        cloudClient.getTagValue('myTestKeyName')
        .then((tagValue) => {
            assert.strictEqual(tagValue, 'testValue');
        })
        .catch(() => {
            assert.fail();
        });
    });

    it('should validate getTagValue method when no tag matching', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/instance/name')
            .reply(200, 'test_vm_name-01');
        cloudClient.compute = sinon.stub();
        cloudClient.compute.zone = sinon.stub().returns({
            vm: sinon.stub().returns({
                getMetadata: sinon.stub().resolves([{labels: {}}])
            })
        });
        cloudClient.getTagValue('myTestKeyName')
        .then((tagValue) => {
            assert.strictEqual(tagValue, '');
        })
        .catch(() => {
            assert.fail();
        });
    });

    it('should validate getTagValue method call', () => {
        cloudClient._metadata = sinon.stub();
        cloudClient._metadata.request = sinon.stub()
            .callsFake((path, headers, callback) => {
                callback(true, null);
            });
        cloudClient.getTagValue('myTestKeyName', { })
        .then(() => {
            assert.fail();
        })
        .catch(() => {
            assert.ok(true);
        });
    });

    it('should validate getSecret promise rejection', () => {
        cloudClient.projectId = '123456789';
        cloudClient.authHeaders = {
            Authorization: 'Bearer my-token'
        };
        cloudClient.region = 'my-region';
        nock('https://secretmanager.googleapis.com')
            .get('/v1/projects/123456789/secrets/incorrect-secret-name/versions/latest:access')
            .reply(404, { "message": "Secret not found" });
        return cloudClient.getSecret(
            'incorrect-secret-name'
        )
        .then(() => {
            assert.ok(false);
        })
        .catch((err) => {
            assert.ok(err.message.includes('Error getting secret from'));
        });
    });

    it('should validate getSecret throws error when secret metadata is not provided', () => {
        cloudClient.projectId = '123456789';
        cloudClient.authHeaders = {
            Authorization: 'Bearer my-token'
        };
        cloudClient.region = 'my-region';
        return cloudClient.getSecret()
        .then(() => {
            assert.ok(false);
        })
        .catch((err) => {
            assert.ok(err.message.includes('GCP Cloud Client secret id is missing'));
        });
    });

    it('should validate getSecret when secret exists', () => {
        cloudClient.projectId = '123456789';
        cloudClient.authHeaders = {
            Authorization: 'Bearer my-token'
        };
        cloudClient.region = 'my-region';
        nock('https://secretmanager.googleapis.com')
            .get('/v1/projects/123456789/secrets/the-secret-name/versions/some-version:access')
            .reply(200, { "payload": { "data": "U3Ryb25nUGFzc3dvcmQh" } });
        return cloudClient.getSecret(
            'the-secret-name',
            {
                version: 'some-version'
            }
        )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword!');
        });
    });

    it('should validate getSecret when secret exists no version included', () => {
        cloudClient.projectId = '123456789';
        cloudClient.authHeaders = {
            Authorization: 'Bearer my-token'
        };
        cloudClient.region = 'my-region';
        nock('https://secretmanager.googleapis.com')
            .get('/v1/projects/123456789/secrets/the-secret-name/versions/latest:access')
            .reply(200, { "payload": { "data": "U3Ryb25nUGFzc3dvcmQh" } });
        return cloudClient.getSecret(
            'the-secret-name'
        )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword!');
        });
    });

    it('should validate getSecret when fully-qualified secret is provided', () => {
        cloudClient.projectId = '123456789';
        cloudClient.authHeaders = {
            Authorization: 'Bearer my-token'
        };
        cloudClient.region = 'my-region';
        nock('https://secretmanager.googleapis.com')
            .get('/v1/projects/123456789/secrets/the-secret-name/versions/latest:access')
            .reply(200, { "payload": { "data": "U3Ryb25nUGFzc3dvcmQh" } });
        return cloudClient.getSecret(
            'projects/123456789/secrets/the-secret-name/versions/latest'
        )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword!');
        });
    });

    it('should validate getSecret throws error when wrong secret format is provided', () => {
        return cloudClient.getSecret('projects/123456789/secrets/the-secret-name/versions/latest!')
        .then(() => {
            assert.ok(false);
        })
        .catch((err) => {
            assert.ok(err.message.includes('wrong format'));
        });
    });

    it('should validate getMetadata returns compute name field value', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/instance/name')
            .reply(200, 'test_vm_name-01');
        cloudClient.getMetadata('name', { type: 'compute' })
        .then((response) => {
            assert.strictEqual(response, 'test-vm-name-01');
        })
        .catch(err => Promise.reject(err));
    });

    it('should validate getMetadata returns network ip field value', () => {
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/instance/network-interfaces/0/ip')
            .reply(200, '10.0.3.2');
        nock('http://metadata.google.internal')
            .get('/computeMetadata/v1/instance/network-interfaces/0/subnetmask')
            .reply(200, '255.255.255.0');
        cloudClient.getMetadata('ip', { type: 'network', index: 0 })
        .then((response) => {
            assert.strictEqual(response, '10.0.3.2/24');
        })
        .catch(err => Promise.reject(err));
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
        cloudClient.getMetadata('name')
        .then(() => {
            assert.fail();
        })
        .catch((error) => {
            assert.ok(error.message.includes('metadata type is missing'));
        });
    });

    it('should fail getMetadata when index is missing', () => {
        cloudClient.getMetadata('ipv4', { type: 'network' })
        .then(() => {
            assert.fail();
        })
        .catch((error) => {
            assert.ok(error.message.includes('metadata index is missing'));
        });
    });

    it('should fail getMetadata when wrong type is provided', () => {
        cloudClient.getMetadata('name', { type: 'bar' })
        .then(() => {
            assert.fail();
        })
        .catch((error) => {
            assert.ok(error.message.includes('metadata type is unknown'));
        });
    });
});
