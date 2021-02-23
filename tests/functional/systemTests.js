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
const funcUtils = require('./util.js');

const duts = funcUtils.getHostInfo();
const firstDut = duts[0];

describe('System tests', () => {
    let installedPackages = [];
    let availablePackages = {};
    let postedBigIpRunTimeInitDeclaration = {};
    let installedExtDeclarations = [];
    let customOnboardResultsCount;
    let logFileSize = 0;

    before(function () {
        this.timeout(80000);
        return funcUtils.getAuthToken(firstDut.ip, firstDut.port, firstDut.username, firstDut.password)
            .then((data) => {
                const options = funcUtils.makeOptions({ authToken: data.token });
                options.port = firstDut.port;
                firstDut.authData = data;
                return funcUtils.queryPackages(firstDut.ip, firstDut.port, data.token);
            })
            .then((data) => {
                if (data && data.queryResponse) {
                    installedPackages = data.queryResponse;
                }
                return funcUtils.getPackagesMetadata();
            })
            .then((data) => {
                if (data && data.components) {
                    availablePackages = data;
                }
                return funcUtils.getDeclaration();
            })
            .then((data) => {
                postedBigIpRunTimeInitDeclaration = data;
                const promises = [];
                for (
                    let idx = 0;
                    idx < postedBigIpRunTimeInitDeclaration.extension_services.service_operations.length;
                    idx += 1) {
                    promises.push(funcUtils.getInstalledDeclaration(
                        firstDut.ip,
                        firstDut.port,
                        firstDut.authData.token,
                        postedBigIpRunTimeInitDeclaration.extension_services.service_operations[idx].extensionType
                    ));
                }
                return Promise.all(promises);
            })
            .then((response) => {
                installedExtDeclarations = response.filter(item => item);
                return funcUtils.runShellCommand(`sshpass -p ${firstDut.password} ssh -o StrictHostKeyChecking=no ${firstDut.username}@${firstDut.ip} "bash -c 'ls -l /tmp/created_by* | wc -l'"`);
            })
            .then((response) => {
                customOnboardResultsCount = response.trim();
                return funcUtils.runShellCommand(`sshpass -p ${firstDut.password} ssh -o StrictHostKeyChecking=no ${firstDut.username}@${firstDut.ip} "bash -c 'du -k /var/log/cloud/bigIpRuntimeInit.log | cut -f1'"`);

            })
            .then((response) => {
                logFileSize = parseInt(response.trim());
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should verify AS3 installed', () => {
        const declaredAs3Version = postedBigIpRunTimeInitDeclaration.extension_packages.install_operations.filter(item => item.extensionType === 'as3')[0].extensionVersion;
        if (declaredAs3Version !== undefined) {
            const declaredPackageName = availablePackages.components.as3.versions[declaredAs3Version].packageName;
            assert.ok(installedPackages.filter(item => item.packageName === declaredPackageName).length > 0);
            assert.ok(installedPackages.filter(item => item.version === declaredAs3Version).length > 0);
        }
        assert.ok(installedPackages.filter(item => item.name === 'f5-appsvcs').length > 0);

    });

    it('should verify DO installed', () => {
        const declaredDoVersion = postedBigIpRunTimeInitDeclaration.extension_packages.install_operations.filter(item => item.extensionType === 'do')[0].extensionVersion;
        const declaredPackageName = availablePackages.components.do.versions[declaredDoVersion].packageName;

        assert.ok(installedPackages.filter(item => item.name === 'f5-declarative-onboarding').length > 0);
        assert.ok(installedPackages.filter(item => item.packageName === declaredPackageName).length > 0);
        assert.ok(installedPackages.filter(item => item.version === declaredDoVersion).length > 0);
    });

    it('should verify FAST installed', () => {
        const declaredFastVersion = postedBigIpRunTimeInitDeclaration.extension_packages.install_operations.filter(item => item.extensionType === 'fast')[0].extensionVersion;
        if (declaredFastVersion !== undefined) {
            const declaredPackageName = availablePackages.components.fast.versions[declaredFastVersion].packageName;
            assert.ok(installedPackages.filter(item => item.packageName === declaredPackageName).length > 0);
            assert.ok(installedPackages.filter(item => item.version === declaredFastVersion).length > 0);
        }
        assert.ok(installedPackages.filter(item => item.name === 'f5-appsvcs-templates').length > 0);

    });

    it('should verify iLX installed', () => {
        const declaredPackageName = 'hello-world-0.1.0-0001.noarch';

        assert.ok(installedPackages.filter(item => item.name === 'hello-world').length > 0);
        assert.ok(installedPackages.filter(item => item.packageName === declaredPackageName).length > 0);
    });

    it('should verify successfully installed declarations', () => {
        assert.strictEqual(
            postedBigIpRunTimeInitDeclaration.extension_services.service_operations.length,
            installedExtDeclarations.length
        );
    });

    it('should verify successful execution of pre and post onboards commands', () => {
        assert.strictEqual(parseInt(customOnboardResultsCount), 4);
    });

    it('should validate log file created and written', () => {
        assert.ok(logFileSize > 0);
    });
});
