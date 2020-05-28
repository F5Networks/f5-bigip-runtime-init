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

        // SecretClient workaround: We created a private method and are mocking it here because there doesn't seem to be a
        // way to mock out the SecretClient. Since the SecretClient needs the vaultUrl, which is provided at runtime, we are not able to override it.
        // Trying to mock the SecretClient throws this error: TypeError: this.authenticationProvider.signRequest is not a function
        // This seems to be the easiest way to test getSecret in such a scenario.
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
            version: '6e86876be4ce46a49ec578dfda897593'
        }
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret exists and version default used', () => cloudClient.getSecret(
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
                version: '6e86876be4ce46a49ec578dfda897593'
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
                version: '6e86876be4ce46a49ec578dfda897593'
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

    it('should validate getMetadata when compute type is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/compute?api-version=2017-08-01')
            .reply(200, { name: 'ru65wrde-vm0' });

        cloudClient.getMetadata('name', { type: 'compute' })
            .then((result) => {
                assert.strictEqual(result, 'ru65wrde-vm0');
            });
    });

    it('should validate getMetadata when network type is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/network?api-version=2017-08-01')
            .reply(200, { interface: [{ ipv4: { ipAddress: [{ privateIpAddress: '10.0.0.4' }], subnet: [{ address: '10.0.0.0', prefix: '24' }] } }, { ipv4: { ipAddress: [{ privateIpAddress: '10.0.1.4' }], subnet: [{ address: '10.0.1.0', prefix: '24' }] } }] });

        cloudClient.getMetadata('ipv4', { type: 'network', index: 1 })
            .then((result) => {
                assert.strictEqual(result, '10.0.1.4/24');
            });
    });
});