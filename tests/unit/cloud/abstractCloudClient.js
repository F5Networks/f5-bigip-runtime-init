/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const sinon = require('sinon'); // eslint-disable-line import/no-extraneous-dependencies

/* eslint-disable global-require */

describe('Cloud Client - Abstract', () => {
    let CloudClient;

    before(() => {
        CloudClient = require('../../../src/lib/cloud/abstract/cloudClient.js').AbstractCloudClient;
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should instantiate cloudClient', () => {
        const logger = sinon.stub();
        const cloudClient = new CloudClient('aws', logger);

        // check abstract methods that should throw
        const methods = [
            'getSecret'
        ];
        methods.forEach((func) => {
            assert.throws(
                () => {
                    cloudClient[func]();
                },
                (err) => {
                    if (err.message.includes('must be implemented in child class')) {
                        return true;
                    }
                    return false;
                },
                'unexpected error'
            );
        });
    });

    it('should instantiate cloudClient without provided logger', () => {
        const cloudClient = new CloudClient('aws', null);
        // check abstract methods that should throw
        const methods = [
            'getSecret'
        ];
        methods.forEach((func) => {
            assert.throws(
                () => {
                    cloudClient[func]();
                },
                (err) => {
                    if (err.message.includes('must be implemented in child class')) {
                        return true;
                    }
                    return false;
                },
                'unexpected error'
            );
        });
    });
});
