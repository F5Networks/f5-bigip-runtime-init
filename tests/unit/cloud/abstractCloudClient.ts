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
import { AbstractCloudClient } from '../../../src/lib/cloud/abstract/cloudClient';

/* eslint-disable global-require */

describe('Cloud Client - Abstract', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should instantiate cloudClient - AWS', () => {
        const logger = sinon.stub();
        const cloudClient = new AbstractCloudClient('aws', logger);

        // check abstract methods that should throw
        const methods = [
            'getSecret',
            'getMetadata',
            'getTagValue',
            'init',
            'getCustomerId',
            'getCloudName',
            'getRegion',
            'getAuthHeaders'
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

    it('should instantiate cloudClient - Azure', () => {
        const logger = sinon.stub();
        const cloudClient = new AbstractCloudClient('azure', logger);

        // check abstract methods that should throw
        const methods = [
            'getSecret',
            'getMetadata',
            'getTagValue',
            'init',
            'getCustomerId',
            'getCloudName',
            'getRegion',
            'getAuthHeaders'
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

    it('should instantiate cloudClient without provided logger - AWS', () => {
        const cloudClient = new AbstractCloudClient('aws', null);
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
