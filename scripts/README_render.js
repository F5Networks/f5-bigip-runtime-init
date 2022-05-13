'use strict';
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const mustache = require('mustache');
const {JSONSchemaMarkdown} = require('json-schema-md-doc');
const yaml = require('js-yaml');

function renderDocs() {
    // render README.md
    const packageData = fs.readFileSync('./package.json');
    const packageInfo = JSON.parse(packageData);
    const version = packageInfo.version;
    const build = packageInfo.release;
    let template = fs.readFileSync('./scripts/README_template.md', 'utf-8');
    fs.readdirSync('scripts/config/').forEach(file => {
        if (file.indexOf('snippet_') !== -1) {
            template = template.replace(`%${file.replace(/\.[^/.]+$/, "")}%`, fs.readFileSync(`scripts/config/${file}`, {encoding:'utf8', flag:'r'}))
        }
    });
    const output = mustache.render(template, { RELEASE_VERSION: version, RELEASE_BUILD: build, ADMIN_PASS: '{{{ ADMIN_PASS }}}', AWS_SESSION_TOKEN: '{{{AWS_SESSION_TOKEN}}}' });
    fs.writeFileSync('./README.md', output);

    // render SCHEMA.md
    const schema = require('../src/schema/base_schema.json');
    const attributes = Object.keys(schema.properties);
    console.log(`Discovered these attributes: ${attributes}`);
    class MyDoccer extends JSONSchemaMarkdown {
        constructor(){
            super();
            this.footer = "";
        }
    };


    const completeExamples = yaml.safeLoad(fs.readFileSync(`./scripts/config/complete_examples.yaml`, 'utf8'));
    fs.readdirSync('scripts/config/').forEach(file => {
        if (file.indexOf('example_') !== -1) {
            completeExamples[file.replace(/\.[^/.]+$/, "")]['runtime_config'] = yaml.safeLoad(fs.readFileSync(`scripts/config/${file}`, {encoding:'utf8', flag:'r'}))
        }
    });

    // grab each chunk of schema and append example
    function renderSchema(attribute) {
        try {
            let attributeExample;
            if ( attribute == 'extension_packages' ) {
                attributeExample = yaml.safeLoad(fs.readFileSync(`./scripts/config/extension_packages.yaml`, 'utf8'));
                fs.readdirSync('examples/runtime_configs/snippets/').forEach(file => {
                    if (file.indexOf('extension_packages_') !== -1) {
                        attributeExample[file.replace(/\.[^/.]+$/, "").split('_')[2]] = yaml.safeLoad(fs.readFileSync(`examples/runtime_configs/snippets/${file}`, {encoding:'utf8', flag:'r'}))
                    }
                });
            } else if ( attribute == 'extension_services' ) {
                attributeExample = yaml.safeLoad(fs.readFileSync(`./scripts/config/extension_services.yaml`, 'utf8'));
                fs.readdirSync('examples/runtime_configs/snippets/').forEach(file => {
                    if (file.indexOf('extension_services_') !== -1) {
                        attributeExample[file.replace(/\.[^/.]+$/, "").split('_')[2]] = yaml.safeLoad(fs.readFileSync(`examples/runtime_configs/snippets/${file}`, {encoding:'utf8', flag:'r'}))
                    }
                });
            } else {
                attributeExample = yaml.safeLoad(fs.readFileSync(`./scripts/config/${attribute}.yaml`, 'utf8'));
            }
            const Doccer = new MyDoccer();
            Doccer.load(schema.properties[attribute]);
            Doccer.generate();
            fs.appendFileSync('./SCHEMA.md', `### ${attribute}: Schema\r\n\r\n`);
            fs.appendFileSync('./SCHEMA.md', Doccer.markdown);
            fs.appendFileSync('./SCHEMA.md', '\r\n\r\n');
            fs.appendFileSync('./SCHEMA.md', `### ${attribute}: Configuration Examples\r\n\r\n`);
            fs.appendFileSync('./SCHEMA.md', '```yaml\r\n');
            fs.appendFileSync('./SCHEMA.md', yaml.safeDump(attributeExample));
            fs.appendFileSync('./SCHEMA.md', '\r\n```\r\n');
            fs.appendFileSync('./SCHEMA.md', '***\r\n');
        } catch (e) {
            console.error(`Attribute ${attribute} is missing an example. Please add at least one example to /scripts/config.`, e);
            process.exit(1);
        }
    }

    fs.writeFileSync('./SCHEMA.md', '## F5 BIG-IP Runtime Init Schema and Examples\r\n\r\n');
    attributes.forEach(attribute => renderSchema(attribute));
    fs.appendFileSync('./SCHEMA.md', `## Additional Examples\r\n\r\n`);
    fs.appendFileSync('./SCHEMA.md', `### Automated Toolchain declarations referenced here are available in the examples/automation_toolchain_declarations folder.\r\n\r\n`);
    fs.appendFileSync('./SCHEMA.md', '```yaml\r\n');
    fs.appendFileSync('./SCHEMA.md', yaml.safeDump(completeExamples));
    fs.appendFileSync('./SCHEMA.md', '\r\n```\r\n');
}



renderDocs();

