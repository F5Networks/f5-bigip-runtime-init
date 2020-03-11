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

describe('Util', () => {
    let util;

    before(() => {
        util = require('../../src/lib/utils.js');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });


    describe('retrier', () => {
        it('should validate resolve', () => {
            const fakeFuncSpy = sinon.stub().resolves();

            return util.retrier(fakeFuncSpy, [], { })
                .then(() => {
                    assert.strictEqual(fakeFuncSpy.callCount, 1);
                })
                .catch(err => Promise.reject(err));
        });

        it('should validate reject', () => {
            const fakeFuncSpy = sinon.stub().rejects();
            const retryCount = 2;

            return util.retrier(fakeFuncSpy, [], { maxRetries: retryCount, retryInterval: 10 })
                .then(() => {
                    assert.fail(); // should reject
                })
                .catch(() => {
                    assert.strictEqual(fakeFuncSpy.callCount, retryCount);
                });
        });
    });

    describe('renderData', () => {
        it('should validate renderData with correct inputs', () => {
            const response = util.renderData('{{ TEST_VALUE }} - TRUE',
                { TEST_VALUE: 'TRUE' });
            assert.strictEqual(response, 'TRUE - TRUE');
        });
    });
});
