/**
 * Copyright 2020 F5 Networks, Inc.
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

// TODO: turn this into a mgmt client to remove device connection info from
// endpoint specific classes such as the toolchain classes, similar to the F5 SDK

class ConnectionInfo {
    setInfo(options) {
        options = options || {};

        this.address = options.address || 'localhost';
        this.port = options.port || 8100;
        this.protocol = options.protocol || 'http';
        this.username = options.username || 'admin';
        this.password = options.password || 'admin';
    }
}

class ConnectionInfoInstance {
    constructor() {
        if (!ConnectionInfoInstance.instance) {
            ConnectionInfoInstance.instance = new ConnectionInfo();
        }
    }

    getInstance() {
        return ConnectionInfoInstance.instance;
    }
}

module.exports = new ConnectionInfoInstance().getInstance();
