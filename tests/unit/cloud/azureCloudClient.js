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

const cloud = 'azure';

describe('CloudClient - Azure', () => {
    let AzureCloudClient;
    let cloudClient;

    before(() => {
        AzureCloudClient = require('../../../src/lib/cloud/azure/cloudClient.js').CloudClient;
    });
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
});
