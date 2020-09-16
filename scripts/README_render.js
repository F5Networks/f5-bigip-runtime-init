'use strict';
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const mustache = require('mustache');

const rawdata = fs.readFileSync('./package.json');
const packageInfo = JSON.parse(rawdata);
const version = packageInfo.version;
const build = packageInfo.release;
const template = fs.readFileSync('./scripts/README_template.md', 'utf-8');

function renderReadme() {
    const output = mustache.render(template, { RELEASE_VERSION: version, RELEASE_BUILD: build });
    fs.writeFileSync('./README.md', output);
}

renderReadme();