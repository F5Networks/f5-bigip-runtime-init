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

describe('CloudClient - GCP', () => {
    let cloudClient;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
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
        cloudClient._getAuthToken = sinon.stub().resolves('my-token');
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
            .then(() => {
                assert.strictEqual(cloudClient.projectId, 'my-project');
            })
            .then(() => {
                assert.strictEqual(cloudClient.authToken, 'my-token');
            })
            .then(() => {
                assert.strictEqual(cloudClient.region, 'my-region');
            })
            .catch(err => Promise.reject(err));
    });

    it('should validate init metadata request promise rejection _getProjectId', () => {
        cloudClient._getProjectId = sinon.stub().rejects(new Error('Test Rejection'));
        cloudClient._getAuthToken = sinon.stub().resolves('my-token');
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
            .then(() => {
                assert.ok(false);
            }).catch((err) => {
                assert.ok(err.message.includes('Test Rejection'));
            });
    });

    it('should validate init metadata request promise rejection _getAuthToken', () => {
        cloudClient._getAuthToken = sinon.stub().rejects(new Error('Test Rejection'));
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
        cloudClient._getAuthToken = sinon.stub().resolves('my-token');
        cloudClient._getRegion = sinon.stub().resolves('my-region');
        return cloudClient.init()
            .then(() => {
                assert.strictEqual(cloudClient.getCustomerId(), 'my-project');
            })
            .catch(err => Promise.reject(err));

    });

    it('should validate getRegion', () => {
        cloudClient._getProjectId = sinon.stub().resolves('my-project');
        cloudClient._getAuthToken = sinon.stub().resolves('my-token');
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
        cloudClient.google = sinon.stub();
        cloudClient.google.auth = sinon.stub();
        cloudClient.google.auth.getProjectId = sinon.stub().resolves('my-project');
        return cloudClient._getProjectId()
            .then((projectId) => {
                assert.strictEqual(projectId, 'my-project');
            });
    });

    it('should validate _getProject promise rejection', () => {
        cloudClient.google = sinon.stub();
        cloudClient.google.auth = sinon.stub();
        cloudClient.google.auth.getProjectId = sinon.stub().rejects();
        return cloudClient._getProjectId()
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Error getting project id'));
            });
    });

    it('should validate _getAuthToken', () => {
        cloudClient.google = sinon.stub();
        cloudClient.google.auth = sinon.stub();
        cloudClient.google.auth.getClient = sinon.stub().resolves('my-token');
        return cloudClient._getAuthToken()
            .then((authToken) => {
                assert.strictEqual(authToken, 'my-token');
            });
    });

    it('should validate _getAuthToken promise rejection', () => {
        cloudClient.google = sinon.stub();
        cloudClient.google.auth = sinon.stub();
        cloudClient.google.auth.getClient = sinon.stub().rejects();
        return cloudClient._getAuthToken()
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Error getting auth token'));
            });
    });

    it('should validate getSecret promise rejection', () => {
        cloudClient.secretmanager.projects.secrets.versions.access = sinon.stub().rejects();
        return cloudClient.getSecret(
            'incorrect-secret-name',
            'some-version'
        )
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Error getting secret from'));
            });
    });

    it('should validate getSecret throws error when secret metadata is not provided', () => {
        assert.throws(() => {
            cloudClient.getSecret();
        }, (err) => {
            if (err.message.includes('GCP Cloud Client secret id is missing')) {
                return true;
            }
            return false;
        }, 'unexpected error');
    });

    it('should validate getSecret when secret exists', () => {
        cloudClient.secretmanager.projects.secrets.versions.access = sinon.stub().resolves({
            data: {
                payload: {
                    data: 'U3Ryb25nUGFzc3dvcmQh'
                }
            }
        });
        return cloudClient.getSecret(
            'the-secret-name',
            'some-version'
        )
            .then((secret) => {
                assert.strictEqual(secret, 'StrongPassword!');
            });
    });

    it('should validate getSecret when secret exists no version included', () => {
        cloudClient.secretmanager.projects.secrets.versions.access = sinon.stub().resolves({
            data: {
                payload: {
                    data: 'U3Ryb25nUGFzc3dvcmQh'
                }
            }
        });
        return cloudClient.getSecret(
            'the-secret-name'
        )
            .then((secret) => {
                assert.strictEqual(secret, 'StrongPassword!');
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
