/**
 * Copyright 2019 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import * as yaml from 'js-yaml';
import Validator from '../../src/lib/validator';

const validator = new Validator();

/* eslint-disable quotes, quote-props */

describe('validator', () => {
    it('should validate valid json data', () => {
        const data = {
            "runtime_parameters": [],
            "extension_packages": {
                "install_operations": [
                    {
                        "extensionType": "as3",
                        "extensionVersion": "3.13.0"
                    }
                ]
            },
            "extension_services": {
                "service_operations": []
            }
        };
        const validation = validator.validate(data);
        assert.strictEqual(validation.isValid, true);
        assert.strictEqual(validation.errors, 'No errors');
    });

    it('should validate valid json data from file', () => {
        const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../scripts/config/cloud_config_local.json')).toString());
        const validation = validator.validate(data);
        assert.strictEqual(validation.isValid, true);
        assert.strictEqual(validation.errors, 'No errors');
    });

    it('should validate valid yaml data', () => {
        const data = `
        runtime_parameters: []
        extension_packages:
            install_operations: [{extensionType: as3, extensionVersion: 3.13.0}]
        extension_services:
            service_operations: []
        `;
        const config = yaml.safeLoad(data);
        const validation = validator.validate(config);
        assert.strictEqual(validation.isValid, true);
        assert.strictEqual(validation.errors, 'No errors');
    });

    it('should validate valid yaml data from a file', () => {
        const config = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, '../../scripts/config/cloud_config_local.yaml')).toString());
        const validation = validator.validate(config);
        assert.strictEqual(validation.isValid, true);
        assert.strictEqual(validation.errors, 'No errors');
    });

    it('should invalidate invalid data', () => {
        it('should validate valid data', () => {
            const data = {};
            const validation = validator.validate(data);
            assert.strictEqual(validation.isValid, false);
            assert.strictEqual(Array.isArray(validation.errors), true);
        });
    });
});
