/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');

/* eslint-disable import/no-extraneous-dependencies */
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const funcUtils = require('../../util.js');

const duts = funcUtils.getHostInfo();
const firstDut = duts[0];
let testSecretValue;

describe('Provider: Azure', () => {
    before(function () {
        this.timeout(80000);

        let credential;
        let keyVaultClient;
        const clientId = process.env.AZURE_CLIENT_ID;
        const clientSecret = process.env.AZURE_CLIENT_SECRET;
        const tenantId = process.env.AZURE_TENANT_ID;
        const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;

        if (clientId && clientSecret && subscriptionId && tenantId) {
            if (funcUtils.getEnvironmentInfo().domain == 'azure') {
                credential = new DefaultAzureCredential();
            } else {
                credential = new DefaultAzureCredential({ authorityHost: 'https://login.microsoftonline.us' });
            }
            keyVaultClient = new SecretClient(`https://testvault-${funcUtils.getEnvironmentInfo().deploymentId}.vault.${funcUtils.getEnvironmentInfo().domain}.net/`, credential);
        }

        return keyVaultClient.getSecret('test-azure-admin-secret')
            .then((testSecret) => {
                if (testSecret) {
                    testSecretValue = testSecret.value;
                }
                return funcUtils.getAuthToken(firstDut.ip, firstDut.port, firstDut.username,
                    firstDut.password);
            })
            .then((data) => {
                firstDut.authData = data;


                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should confirm stored password in Key Vault', () => {
        assert.strictEqual(testSecretValue, 'StrongAdminPass212+');
    });

    it('should login using new admin password', () => funcUtils.getAuthToken(firstDut.ip, firstDut.port, 'admin', 'StrongAdminPass212+')
        .then((data) => {
            assert.ok('token' in data);
        })
        .catch((err) => {
            assert.ok(!err);
        }));

    it('should login using new vaultadmin password', () => funcUtils.getAuthToken(firstDut.ip, firstDut.port, 'vaultadmin', 'b1gAdminPazz')
        .then((data) => {
            assert.ok('token' in data);
        })
        .catch((err) => {
            assert.ok(!err);
        }));
});
