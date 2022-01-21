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
const { google } = require('googleapis');
const secretManager = google.secretmanager('v1');
const fs = require('fs');

const funcUtils = require('../../util.js');

const duts = funcUtils.getHostInfo();
const firstDut = duts[0];
let testSecretValue;


function configureAuth() {
    // To run this in local environment, make sure to export the environmental variable
    // GOOGLE_CREDENTIALS and CI_PROJECT_DIR
    if (process.env.GOOGLE_CREDENTIALS) {
        const tmpCredsFile = `${process.env.CI_PROJECT_DIR}/gcloud_creds.json`;
        fs.writeFileSync(tmpCredsFile, process.env.GOOGLE_CREDENTIALS);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpCredsFile;
        return google.auth.getClient({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
    }
    return Promise.reject(new Error('gcloud creds are not provided via env variable titled as GOOGLE_CREDENTIALS'));
}


describe('Provider: Google', () => {
    let authClient;
    let adminPass;
    let testNewAuthData;
    let testHostName;
    before(() => {
        return configureAuth()
            .then((createdAuthClient) => {
                authClient = createdAuthClient;
                return funcUtils.getAuthToken(firstDut.ip, firstDut.port, firstDut.username, firstDut.password);
            })
            .then((data) => {
                firstDut.authData = data;
                const params = {
                    auth: authClient,
                    name: `projects/${authClient.projectId}/secrets/secret-01-${funcUtils.getEnvironmentInfo().deploymentId}/versions/latest`
                };
                return secretManager.projects.secrets.versions.access(params)
            })
            .then((response) => {
                const buff = Buffer.from(response.data.payload.data, 'base64');
                adminPass = buff.toString('ascii');
                return funcUtils.getAuthToken(firstDut.ip, firstDut.port, firstDut.username, firstDut.password);
            })
            .then((data) => {
                testNewAuthData = data;
                // getting Global Settings
                return funcUtils.getGlobalSettings(firstDut.ip, firstDut.port, testNewAuthData.token)
            })
            .then((response) => {
                testHostName = response.hostname;
            })
            .catch(err => Promise.reject(err));
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should confirm stored password in Key Vault', () => {
        assert.strictEqual(adminPass, 'StrongPassword212+');
    });

    it('should confirm new admin credentials are valid', () => {
        assert.ok('token' in testNewAuthData);
    });

    it('should confirm hostname was updated using DO', () => {
        assert.ok(testHostName.includes('.test'));
    });

    it('should login using new vaultadmin password', () => funcUtils.getAuthToken(firstDut.ip, firstDut.port, 'vaultadmin', 'b1gAdminPazz')
        .then((data) => {
            assert.ok('token' in data);
        })
        .catch((err) => {
            assert.ok(!err);
        }));

    it('should login using new vaultadmin2 password', () => funcUtils.getAuthToken(firstDut.ip, firstDut.port, 'vaultadmin2', 'thisIsTestPassword123')
        .then((data) => {
            assert.ok('token' in data);
        })
        .catch((err) => {
            assert.ok(!err);
        }));
});
