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

describe('Provider: AWS', () => {
    let testSecretValue;
    before(function () {
        this.timeout(80000);

        const client = new AWS.SecretsManager({ region: funcUtils.getEnvironmentInfo().region });
        const secret = client.getSecretValue({ SecretId: funcUtils.getEnvironmentInfo().secret_id });
        var promise = secret.promise();

        return promise.then(
            function(data) {
                testSecretValue = data.SecretString;
            },
            function(error) {
                Promise.reject(error);
            }
        );
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
});
