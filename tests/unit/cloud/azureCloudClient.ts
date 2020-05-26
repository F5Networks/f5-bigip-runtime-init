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
import { AzureCloudClient } from '../../../src/lib/cloud/azure/cloudClient'
const cloud = 'azure';

describe('CloudClient - Azure', () => {
    let cloudClient;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        cloudClient = new AzureCloudClient();
        cloudClient._credentials = sinon.stub();

        // We are mocking this entire function because there doesn't seem to be a
        // way to mock out the SecretClient. Since the SecretClient needs the
        // vaultUrl, which is provided at runtime, we are not able to override it.
        // This seems to be the easiest way to test this code in such a scenario.
        cloudClient._getKeyVaultSecret = sinon.stub().callsFake(() => Promise.resolve({ value: 'StrongPassword2010!' }));

        cloudClient.logger = sinon.stub();
        cloudClient.logger.info = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        assert.strictEqual(cloudClient.environment, cloud);
    });

    it('should validate init', () => cloudClient.init());

    it('should validate getSecret when secret exists', () => cloudClient.getSecret(
        'the-secret-name', {
            vaultUrl: 'https://hello-kv.vault.azure.net',
            documentVersion: '6e86876be4ce46a49ec578dfda897593'
        }
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret exists and documentVersion default used', () => cloudClient.getSecret(
        'the-secret-name', {
            vaultUrl: 'https://hello-kv.vault.azure.net'
        }
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret does not exist', () => {
        cloudClient._getKeyVaultSecret = sinon.stub().callsFake(() => Promise.resolve('secret'));
        cloudClient.getSecret(
            'incorrect-secret-name', {
                vaultUrl: 'https://hello-kv.vault.azure.net',
                documentVersion: '6e86876be4ce46a49ec578dfda897593'
            }
        )
            .then((secret) => {
                assert.strictEqual(secret, undefined);
            });
    });

    it('should validate getSecret promise rejection', () => {
        cloudClient._getKeyVaultSecret = sinon.stub().callsFake(() => Promise.reject(new Error('Test rejection')));
        return cloudClient.getSecret(
            'incorrect-secret-name', {
                vaultUrl: 'https://hello-kv.vault.azure.net',
                documentVersion: '6e86876be4ce46a49ec578dfda897593'
            }
        )
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Test rejection'));
            });
    });

    it('should validate getSecret throws error when vault url is not provided', () => {
        assert.throws(() => {
            cloudClient.getSecret('incorrect-secret-name');
        }, (err) => {
            if (err.message.includes('vault url is missing')) {
                return true;
            }
            return false;
        }, 'unexpected error');
    });

    it('should validate getSecret throws error when secret id is not provided', () => {
        assert.throws(() => {
            cloudClient.getSecret('', {
                vaultUrl: 'https://hello-kv.vault.azure.net'
            });
        }, (err) => {
            if (err.message.includes('secret id is missing')) {
                return true;
            }
            return false;
        }, 'unexpected error');
    });

    it('should validate getMetadata promise rejection', () => {
        cloudClient._getMetadata = sinon.stub().callsFake(() => Promise.reject(new Error('Test rejection')));
        return cloudClient.getMetadata(
            'name', {
                type: 'wrong',
                environment: 'azure',
                field: 'name'
            }
        )
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Test rejection'));
            });
    });

    it('should validate getMetadata when hostname field is provided', () => {
        cloudClient._getMetadata = sinon.stub().callsFake(() => Promise.resolve('ru65wrde-vm0'));
        cloudClient.getMetadata(
            'name', {
                type: 'compute',
                environment: 'azure',
                field: 'name'
            }
        )
            .then((result) => {
                assert.strictEqual(result, 'ru65wrde-vm0');
            });
    });

    it('should validate getMetadata when network field is provided', () => {
        cloudClient._getMetadata = sinon.stub().callsFake(() => Promise.resolve('10.0.1.4/24'));
        cloudClient.getMetadata(
            'name', {
                type: 'network',
                environment: 'azure',
                field: 'ipv4',
                index: 1
            }
        )
            .then((result) => {
                assert.strictEqual(result, '10.0.1.4/24');
            });
    });

    it('should validate getMetadata throws error when metadata type is not provided', () => {
        assert.throws(() => {
            cloudClient.getMetadata('name', {
                environment: 'azure',
                field: 'name'
            });
        }, (err) => {
            if (err.message.includes('metadata type is missing')) {
                return true;
            }
            return false;
        }, 'unexpected error');
    });

    it('should validate getMetadata throws error when metadata field is not provided', () => {
        assert.throws(() => {
            cloudClient.getMetadata('', {
                type: 'compute',
                environment: 'azure',
                field: 'name'
            });
        }, (err) => {
            if (err.message.includes('metadata field is missing')) {
                return true;
            }
            return false;
        }, 'unexpected error');
    });

    it('should validate _getMetadata when compute type is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/compute?api-version=2017-08-01')
            .reply(200, { name: 'ru65wrde-vm0' });

        cloudClient._getMetadata('compute', 'name')
            .then((result) => {
                assert.strictEqual(result, 'ru65wrde-vm0');
            });
    });

    it('should validate _getMetadata when network type is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/network?api-version=2017-08-01')
            .reply(200, { interface: [{ ipv4: { ipAddress: [{ privateIpAddress: '10.0.0.4' }], subnet: [{ address: '10.0.0.0', prefix: '24' }] } }, { ipv4: { ipAddress: [{ privateIpAddress: '10.0.1.4' }], subnet: [{ address: '10.0.1.0', prefix: '24' }] } }] });

        cloudClient._getMetadata('network', 'ipv4', 1)
            .then((result) => {
                assert.strictEqual(result, '10.0.1.4/24');
            });
    });

    it('should fail _getMetadata when wrong type is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/foo?api-version=2017-08-01')
            .reply(404, { name: 'foo' });

        cloudClient._getMetadata('foo', 'bar')
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('Runtime parameter metadata type is unknown'));
            });
    });
});