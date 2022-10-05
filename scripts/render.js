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

    // make sure to run sync_at_components_metadata.sh to get latest versions
    const atcData = yaml.safeLoad(fs.readFileSync('./examples/runtime_configs/snippets/extension_packages_hashed.yaml'));
    const installOps = atcData.extension_packages.install_operations;

    const doVersion = installOps[0].extensionVersion;
    const doHash = installOps[0].extensionHash;
    const as3Version = installOps[1].extensionVersion;
    const as3Hash = installOps[1].extensionHash;
    const tsVersion = installOps[2].extensionVersion;
    const tsHash = installOps[2].extensionHash;
    const fastVersion = installOps[3].extensionVersion;
    const fastHash = installOps[3].extensionHash;

    const atcUrlData = yaml.safeLoad(fs.readFileSync('./examples/runtime_configs/snippets/extension_packages_url.yaml'));
    const urlOps = atcUrlData.extension_packages.install_operations;

    const doUrl = urlOps[0].extensionUrl;
    const as3Url = urlOps[1].extensionUrl;
    const fastUrl = urlOps[2].extensionUrl;

    let template = fs.readFileSync('./scripts/README_template.md', 'utf-8');
    fs.readdirSync('scripts/config/').forEach(file => {
        if (file.indexOf('snippet_') !== -1) {
            template = template.replace(`%${file.replace(/\.[^/.]+$/, "")}%`, fs.readFileSync(`scripts/config/${file}`, {encoding:'utf8', flag:'r'}))
        }
    });
    const output = mustache.render(template, { 
        ADMIN_PASS: '{{{ ADMIN_PASS }}}', 
        AWS_SESSION_TOKEN: '{{{AWS_SESSION_TOKEN}}}',
        RELEASE_VERSION: version, 
        RELEASE_BUILD: build,
        DO_VERSION: doVersion,
        DO_HASH: doHash,
        DO_URL: doUrl,
        AS3_VERSION: as3Version,
        AS3_HASH: as3Hash,
        AS3_URL: as3Url,
        TS_VERSION: tsVersion,
        TS_HASH: tsHash,
        FAST_VERSION: fastVersion,
        FAST_HASH: fastHash,
        FAST_URL: fastUrl
    });
    fs.writeFileSync('./README.md', output);

    // render Terraform example startup scripts
    const clouds = ['aws', 'azure', 'gcp'];
    clouds.forEach(cloud => {
        const tfTemplate = fs.readFileSync(`./scripts/tf_examples/${cloud}.tpl`, 'utf-8');
        const tfOutput = mustache.render(tfTemplate, {
            ADMIN_PASS: '{{{ ADMIN_PASS }}}',
            DEFAULT_GW: '{{{ DEFAULT_GW }}}',
            EXTERNAL_BITMASK: '{{{ EXTERNAL_BITMASK }}}',
            EXTERNAL_GW: '{{{ EXTERNAL_GW }}}',
            EXTERNAL_NETWORK: '{{{ EXTERNAL_NETWORK }}}',
            HOST_NAME: '{{{ HOST_NAME }}}',
            INTERNAL_BITMASK: '{{{ INTERNAL_BITMASK }}}',
            INTERNAL_GW: '{{{ INTERNAL_GW }}}',
            INTERNAL_NETWORK: '{{{ INTERNAL_NETWORK }}}',
            MGMT_BITMASK: '{{{ MGMT_BITMASK }}}',
            MGMT_GW: '{{{ MGMT_GW }}}',
            MGMT_IP: '{{{ MGMT_IP }}}',
            MGMT_NETWORK: '{{{ MGMT_NETWORK }}}',
            SELF_IP_EXTERNAL: '{{{ SELF_IP_EXTERNAL }}}',
            SELF_IP_INTERNAL: '{{{ SELF_IP_INTERNAL }}}',
            DO_VERSION: doVersion,
            DO_HASH: doHash,
            AS3_VERSION: as3Version,
            AS3_HASH: as3Hash,
            TS_VERSION: tsVersion,
            TS_HASH: tsHash,
            FAST_VERSION: fastVersion,
            FAST_HASH: fastHash
        });
        fs.writeFileSync(`./examples/terraform/${cloud}/startup-script.tpl`, tfOutput);
    });

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
