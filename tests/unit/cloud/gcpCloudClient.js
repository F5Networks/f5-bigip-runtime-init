/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable global-require */

const assert = require('assert');
const sinon = require('sinon'); // eslint-disable-line import/no-extraneous-dependencies

const cloud = 'gcp';

describe('CloudClient - GCP', () => {
    let GCPCloudClient;
    let cloudClient;

    before(() => {
        GCPCloudClient = require('../../../src/lib/cloud/gcp/cloudClient.js').CloudClient;
    });
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        cloudClient = new GCPCloudClient();
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
        return cloudClient.init()
            .then(() => {
                assert.strictEqual(cloudClient.projectId, 'my-project');
            })
            .then(() => {
                assert.strictEqual(cloudClient.authToken, 'my-token');
            });
    });

    it('should validate init metadata request promise rejection _getProjectId', () => {
        cloudClient._getProjectId = sinon.stub().rejects(new Error('Test Rejection'));
        cloudClient._getAuthToken = sinon.stub().resolves('my-token');
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
        return cloudClient.init()
            .then(() => {
                assert.ok(false);
            }).catch((err) => {
                assert.ok(err.message.includes('Test Rejection'));
            });
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
});
