'use strict';
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import * as fs from 'fs';
import Mustache from 'mustache';

const rawdata = fs.readFileSync('../package.json');
const packageInfo = JSON.parse(rawdata);
const version = packageInfo.version;
const build = packageInfo.release;
const template = fs.readFileSync('./README_template.md', 'utf-8');

function renderReadme() {
    const output = Mustache.render(template, { RELEASE_VERSION: version, RELEASE_BUILD: build });
    fs.writeFileSync('../README.md', output);
}

renderReadme();