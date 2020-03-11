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

describe('Resolver Client', () => {
    let Resolver;
    let runtimeParameters;

    before(() => {
        Resolver = require('../../../src/lib/resolver/resolverClient.js');
    });

    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        runtimeParameters = [
            {
                name: 'AWS_PASS',
                type: 'secret',
                secretProvider: {
                    type: 'SecretsManager',
                    environment: 'aws',
                    versionStage: 'AWSCURRENT',
                    secretId: 'secert-document'
                }
            },
            {
                name: 'SOME_NAME',
                type: 'static',
                value: 'SOME VALUE'
            }
        ];
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate constructor', () => {
        const resolver = new Resolver();
        assert.strictEqual(typeof resolver, 'object');
    });

    it('should validate resolveRuntimeParameters', () => {
        const resolver = new Resolver();
        resolver._resolveSecret = sinon.stub().resolves('StrongPassword2010+');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 2);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
                assert.strictEqual(results.AWS_PASS, 'StrongPassword2010+');
            });
    });

    it('should validate resolveRuntimeParameters no secret match', () => {
        const resolver = new Resolver();
        resolver._resolveSecret = sinon.stub().resolves('');
        return resolver.resolveRuntimeParameters(runtimeParameters)
            .then((results) => {
                assert.ok(Object.keys(results).length === 1);
                assert.strictEqual(results.SOME_NAME, 'SOME VALUE');
            });
    });

    it('should validate unknown runtime parameter case', () => {
        const resolver = new Resolver();
        runtimeParameters = [
            {
                name: 'AWS_PASS',
                type: 'wrong',
                secretProvider: {
                    type: 'SecretsManager',
                    environment: 'aws',
                    versionStage: 'AWSCURRENT',
                    secretId: 'secert-document'
                }
            },
            {
                name: 'SOME_NAME',
                type: 'static',
                value: 'SOME VALUE'
            }
        ];

        resolver.resolveRuntimeParameters(runtimeParameters)
            .then(() => {
                assert.ok(false);
            })
            .catch((err) => {
                assert.ok(err.message.includes('Runtime parameter type is unknown'));
            });
    });
});
