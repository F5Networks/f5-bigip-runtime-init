# Release Process

### Overview

This document provides overview and instructions on release process used for BIG-IP Runtime Init project. 

The release is fully automated process. However, it requires a few manual steps to trigger automation pipeline; all steps are outlined below in details.


### Step #1. Pre-release

Before triggering release pipeline, the following needs to be done as a part of pre-release activities

   1. Update `version` and `release` values under package.json
   2. Run scripts/sync_at_components_metadata.sh to grab the latest ATC versions from CDN.
   3. Edits to the README.md file should be made to scripts/README_template.md. This file is tagged with mustache handlebars used to update README.md with the correctly versioned links based on package.json when scripts/render.js is executed; SCHEMA.md will also be generated based on the contents of base_schema.json. Run this command manually after updating the version in package.json: **node scripts/render.js**
   4. Edits to the Terraform example startup script files should be made in scripts/tf_examples TPL files. The render.js script will update ATC package versions in the resulting output files.
   5. Create Merge Request (aka MR) to merge all changes from `develop` to `main` branch
   6. After merging changes to `main` branch, use pre-configured schedules to trigger functional tests against `main` branch:
      * There a few environment variables which are used for triggering functional tests for different clouds as well as BIG-IP versions:
         - BIGIP_VERSION - specifies BIG-IP version used in testing; possible values (14, 15 or all)
         - TEST_SUITE - specifies Public Cloud against which functional testing will be done; possilbe values ( aws, azure, azure_gov, gcp, or all). 
         - *Example:* Specifying `TEST_SUITE: all and BIGIP_VERSION: all` will trigger 6 tests pipelines to test each supported BIG-IP version (v14 and v15) against each supported Public Cloud (aws, gcp, and azure)

When functional tests against `main` branch is completed, the pre-release part is done. Continue to actual release


### Step #2. Release

The release is triggered by creating a tag with Release Notes on main branch; however, the tag must be in a particular form to trigger the release CI/CD pipeline.

Please use the following steps to trigger release pipeline: 
 
   1. Using Gitlab UI create tag with Release Notes on main branch; the release tag must be in form:
      * `publish-<version>-<release>` 
          - <version> - corresponds to version number specified under package.json
          - <release> - corresponds to release number specified under package.json
          - example: `publish-0.10.0-1`
   2. Navigate to CI/CD Pipelines view to monitor Release Pipeline execution
   
   
#### Release workflow

Creation of `publish-<version>-<release>` tag triggers CI/CD pipeline which includes the following steps
   
   1. Run checks: 
      - Unit tests
      - Lint
      - Content check
      - Audit check
   2. Build package - self-executable with RPM files
   3. Publish
      - Publish package to f5 cdn (NOTE: `<version>` and `<release>` values are used for constructing CDN path; i.e. `https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v<version>/dist/f5-bigip-runtime-init-<version>-<release>.gz.run`)
      - Publish source code to github; only the following will be published:   
         * src/ directory 
         * examples/ directory 
         * diagrams/ directory
         * README.md 
         * SCHEMA.md
         * package.json
         * package-lock.json
         * .gitigonre
         * tsconfig.json
      - NOTE: the list of allowed items can be found under `scripts/publish_github.sh`
   4. Trigger downstream CI/CD pipeline on `f5-cloud-factory/master` to start post-release testing; it includes:
      - Updating bigip.json module template with new version of runtime init
      - Triggering templates functional tests for BIG-IP module and Autoscale solution
      
      
### Additional details

Deploy keys, for gitlab and github repos, are used for committing changes to git; deploy keys are stored under CI/CD settings.
