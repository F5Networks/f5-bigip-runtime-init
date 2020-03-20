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
        cloudClient.credentials = sinon.stub();
        cloudClient.keyVaultSecretClient = sinon.stub();
        cloudClient.keyVaultSecretClient.getSecret = sinon.stub().callsFake(() => ({
            promise() {
                return Promise.resolve({ value: 'StrongPassword2010!' });
            }
        }));

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
            versionInfo: '6e86876be4ce46a49ec578dfda897593',
            debug: true
        }
    )
        .then((secret) => {
            assert.strictEqual(secret.value, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret exists and versionInfo default used', () => cloudClient.getSecret(
        'the-secret-name', {
            vaultUrl: 'https://hello-kv.vault.azure.net',
            debug: true
        }
    )
        .then((secret) => {
            assert.strictEqual(secret.value, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret does not exist', () => {
        cloudClient.keyVaultSecretClient.getSecret = sinon.stub().callsFake(() => ({
            promise() {
                return Promise.resolve();
            }
        }));
        cloudClient.getSecret(
            'incorrect-secret-name', {
                vaultUrl: 'https://hello-kv.vault.azure.net',
                versionInfo: '6e86876be4ce46a49ec578dfda897593',
                debug: true
            }
        )
            .then((secret) => {
                assert.strictEqual(secret, undefined);
            });
    });

    it('should validate getSecret promise rejection', () => {
        cloudClient.keyVaultSecretClient.getSecret = sinon.stub().callsFake(() => ({
            promise() {
                return Promise.reject(new Error('Test rejection'));
            }
        }));
        return cloudClient.getSecret(
            'incorrect-secret-name', {
                vaultUrl: 'https://hello-kv.vault.azure.net',
                versionInfo: '6e86876be4ce46a49ec578dfda897593',
                debug: true
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
            cloudClient.getSecret('incorrect-secret-name', { debug: true });
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
                vaultUrl: 'https://hello-kv.vault.azure.net',
                debug: true
            });
        }, (err) => {
            if (err.message.includes('secret id is missing')) {
                return true;
            }
            return false;
        }, 'unexpected error');
    });
});
