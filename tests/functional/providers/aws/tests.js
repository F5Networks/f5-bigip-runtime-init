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
const AWS = require('aws-sdk');

const funcUtils = require('../../util.js');

const duts = funcUtils.getHostInfo();
const firstDut = duts[0];
const env = funcUtils.getEnvironmentInfo();

describe('Provider: AWS', () => {
    let testSecretValue;
    let testNewAuthData;
    let testHostName;
    let testMgmtIp;
    let as3Declaration;
    before(function () {
        this.timeout(80000);

        const client = new AWS.SecretsManager({ region: env.region });
        const secret = client.getSecretValue({ SecretId: env.secret_id });
        var promise = secret.promise();

        return promise
        .then(
            function(data) {
                testSecretValue = data.SecretString;
            },
            function(error) {
                Promise.reject(error);
            }
        )
        .then(() => {
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
        .then(() => {
            const mgmtUri = '/mgmt/tm/sys/management-ip';
            // getting mgmt-ip
            return funcUtils.getBigipApi(firstDut.ip, firstDut.port, testNewAuthData.token, mgmtUri);
        })
        .then((response) => {
            testMgmtIp = response.items[0].name.substring(0, response.items[0].name.length -3).replace(/[.]/g,'-')
            return Promise.resolve();
        })
        .then(() => {
            return funcUtils.getInstalledDeclaration(
                firstDut.ip,
                firstDut.port,
                testNewAuthData.token,
                'as3'
            )
        })
        .then((data) => {
            as3Declaration = data
         })
        .catch(err => Promise.reject(err));
    });

    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should confirm stored password in SecretsManager', () => {
        assert.strictEqual(testSecretValue, 'StrongPassword2010!');
    });

    it('should login using new admin password', () => funcUtils.getAuthToken(firstDut.ip, firstDut.port, 'admin', 'StrongPassword2010!')
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

    it('should login using new vaultadmin2 password', () => funcUtils.getAuthToken(firstDut.ip, firstDut.port, 'vaultadmin2', 'thisIsTestPassword123')
        .then((data) => {
            assert.ok('token' in data);
        })
        .catch((err) => {
            assert.ok(!err);
        }));

    it('should confirm hostname was updated using DO', () => {
        assert.strictEqual(testHostName, 'ip-' + testMgmtIp + '.' + env.region + '.compute.internal');
    });

    it ('should validate that runtime init resolve region correctly', () => {
        assert.ok(!JSON.stringify(as3Declaration).includes('{{{REGION}}}'))
    });

});
