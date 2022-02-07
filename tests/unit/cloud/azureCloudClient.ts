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
import nock from 'nock';
import { AzureCloudClient } from '../../../src/lib/cloud/azure/cloudClient'
import * as bigipMgmtNetInterfacesResponse from '../payloads/bigip_mgmt_net_interface.json';
const cloud = 'azure';

describe('CloudClient - Azure', () => {
    let cloudClient;
    after(() => {
        Object.keys(require.cache)
            .forEach((key) => {
                delete require.cache[key];
            });
    });

    beforeEach(() => {
        cloudClient = new AzureCloudClient();
        cloudClient._credentials = sinon.stub();
        cloudClient.subscriptionId = '1234543';
        cloudClient._metadata = {
            subscriptionId: '1234543',
            location: 'us-west',
            tags: "key01:value02;key02:value02"
        };
        cloudClient.SecretClient = sinon.stub().returns({
            getSecret: sinon.stub().resolves({ value: 'StrongPassword2010!' })
        });
        nock('http://169.254.169.254')
            .get('/metadata/instance?api-version=2017-08-01')
            .reply(200, { compute: { subscriptionId: '1234543', tags: "key01:value02;key02:value02"} });
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

    it('should validate getCustomerId', () => {
        assert.strictEqual(cloudClient.getCustomerId(), '1234543');
    });

    it('should validate getRegion', () => {
        assert.strictEqual(cloudClient.getRegion(), 'us-west');
    });

    it('should validate getCloudName', () => {
        assert.strictEqual(cloudClient.getCloudName(), cloud);
    });

    it('should validate getTagValue method returns correct tag value', () => {
        cloudClient.getTagValue('key01', {})
            .then((tagValye) => {
                assert.strictEqual(tagValye, 'value02')
            })
            .catch(() => {
                assert.fail();
            });
    });

    it('should validate getTagValue method returns no tag value', () => {
        cloudClient.getTagValue('invalidKey', {})
            .then((tagValye) => {
                assert.strictEqual(tagValye, '')
            })
            .catch(() => {
                assert.fail();
            });
    });

    it('should validate getSecret when secret exists', () => cloudClient.getSecret(
        'the-secret-name', {
            vaultUrl: 'https://hello-kv.vault.azure.net',
            version: '6e86876be4ce46a49ec578dfda897593'
        }
    )
        .then((secret) => {
            assert.strictEqual(secret, 'StrongPassword2010!');
        }));

    it('should validate getSecret when secret exists and version default used', () => cloudClient.getSecret(
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
                version: '6e86876be4ce46a49ec578dfda897593'
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
                version: '6e86876be4ce46a49ec578dfda897593'
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

    it('should fail getMetadata when field is missing', () => {
        cloudClient.getMetadata('', { type: 'compute' })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata field is missing'));
            });
    });

    it('should fail getMetadata when type is missing', () => {
        cloudClient.getMetadata('name')
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata type is missing'));
            });
    });

    it('should fail getMetadata when index is missing', () => {
        cloudClient.getMetadata('ipv4', { type: 'network' })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata index is missing'));
            });
    });

    it('should fail getMetadata when wrong type is provided', () => {
        cloudClient.getMetadata('name', { type: 'bar' })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('metadata type is unknown'));
            });
    });

    it('should validate getMetadata when compute type name field is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/compute?api-version=2017-08-01')
            .reply(200, { name: 'ru65wrde-vm0' });

        cloudClient.getMetadata('name', { type: 'compute' })
            .then((result) => {
                assert.strictEqual(result, 'ru65wrde-vm0');
            });
    });

    it('should validate getMetadata when compute type vmId field is provided', () => {
        nock('http://169.254.169.254')
            .get('/metadata/instance/compute?api-version=2017-08-01')
            .reply(200, { vmId: 'XXXX-XXXX-XXXX-XXXX' });

        cloudClient.getMetadata('vmId', { type: 'compute' })
            .then((result) => {
                assert.strictEqual(result, 'XXXX-XXXX-XXXX-XXXX');
            });
    });

    it('should fail getMetadata when mac address is not matched', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        nock('http://169.254.169.254')
            .get('/metadata/instance/network?api-version=2017-08-01')
            .reply(200, { interface: [{ ipv4: { ipAddress: [{ privateIpAddress: '10.0.0.4' }], subnet: [{ address: '10.0.0.0', prefix: '24' }] }, macAddress:'FA163ED0B0DF' }, { ipv4: { ipAddress: [{ privateIpAddress: '10.0.1.4' }], subnet: [{ address: '10.0.1.0', prefix: '24' }] } , macAddress:'abcdexp'}] });

        cloudClient.getMetadata('ipv4', { type: 'network', index: 1 })
            .then(() => {
                assert.fail();
            })
            .catch((error) => {
                assert.ok(error.message.includes('Could not get value from Azure metadata'));
            });
    });

    it('should validate getMetadata when network type is provided for mgmt interface', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        nock('http://169.254.169.254')
            .get('/metadata/instance/network?api-version=2017-08-01')
            .reply(200, { interface: [{ ipv4: { ipAddress: [{ privateIpAddress: '10.0.0.4' }], subnet: [{ address: '10.0.0.0', prefix: '24' }] }, macAddress:'FA163ED0B0DF' }, { ipv4: { ipAddress: [{ privateIpAddress: '10.0.1.4' }], subnet: [{ address: '10.0.1.0', prefix: '24' }] } , macAddress:'FA163EC5BE3D'}] });

        cloudClient.getMetadata('ipv4', { type: 'network', index: 0 })
            .then((result) => {
                assert.strictEqual(result, '10.0.0.4/24');
            });
    });

    it('should validate getMetadata when network type is provided', () => {
        nock('http://localhost:8100')
            .get('/mgmt/tm/net/interface')
            .reply(200, bigipMgmtNetInterfacesResponse );
        nock('http://169.254.169.254')
            .get('/metadata/instance/network?api-version=2017-08-01')
            .reply(200, { interface: [{ ipv4: { ipAddress: [{ privateIpAddress: '10.0.0.4' }], subnet: [{ address: '10.0.0.0', prefix: '24' }] }, macAddress:'FA163ED0B0DF' }, { ipv4: { ipAddress: [{ privateIpAddress: '10.0.1.4' }], subnet: [{ address: '10.0.1.0', prefix: '24' }] } , macAddress:'FA163EC5BE3D'}] });

        cloudClient.getMetadata('ipv4', { type: 'network', index: 1 })
            .then((result) => {
                assert.strictEqual(result, '10.0.1.4/24');
            });
    });
});
