# Introduction

This directory contains all of the tests for this project.  This documentation is designed to make clear things that would otherwise be unclear.

## Unit

All unit tests are written using the [mocha](https://mochajs.org) framework, and run using ```npm run test``` during automated or manual test.

Triggered: Every commit pushed to central repository.

Best practices:

- Create a separate ```*Test.js``` for each source file being tested.
- Use a standard mocker:  Prefer [sinon](https://sinonjs.org) for all mocks and [nock](https://github.com/nock/nock) for HTTP mocks. 
- Monitor and enforce coverage, but avoid writing tests simply to increase coverage when there is no other perceived value.
- With that being said, **enforce coverage** in automated test.

## Functional

See README under functional test directoy for more details around functonal tests

## Publish

'publish_rpms_dev_cdn' ci job runs under the following conditions:
<br>
* commit branch is develop
* variable PUBLISH_RPM_DEVELOP is set to true
* commit message is equal to 'smart:run_publish_develop_cdn'

Binaries from build process are placed onto CDN.

Development RPM's, file hashes, and installer are located on cdn using the following url's:
* Pattern: https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/\<commit branch\>/f5-bigip-runtime-init-\<package.json version\>-\<package.json release\>.gz.run
* Examples using version v0.9.0 release 1 and commit on branch ESECLDTPLT-2170
  * [f5-bigip-runtime-init installer](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/f5-bigip-runtime-init-0.9.0-1.gz.run)
  * RPMS & checksum file
    * [All clouds rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm)
    * [All checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm.sha256)
    * [Azure rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm)
    * [Azure checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm.sha256)
    * [AWS rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm)
    * [AWS checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm.sha256)
    * [GCP rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm)
    * [GCP checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/develop/ESECLDTPLT-2170/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm.sha256)


'publish_rpms_cdn' ci job runs under the following conditions:
<br>
* commit branch is master
* variable PUBLISH_RPM is set to true
* commit message is equal to 'smart:run_publish_cdn'

Binaries from build process are placed onto CDN.

Production RPM's, file hashes, and installer are located on cdn using the following url's:
* Pattern: https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/\<package.json version\>/f5-bigip-runtime-init-\<package.json version\>-\<package.json release\>.gz.run
* Examples using version v0.9.0 release 1
  * [f5-bigip-runtime-init installer](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/f5-bigip-runtime-init-0.9.0-1.gz.run)
  * RPMS & checksum file
    * [All clouds rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm)
    * [All checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-all-0.9.0-1-signed.noarch.rpm.sha256)
    * [Azure rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm)
    * [Azure checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-azure-0.9.0-1-signed.noarch.rpm.sha256)
    * [AWS rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm)
    * [AWS checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-aws-0.9.0-1-signed.noarch.rpm.sha256)
    * [GCP rpm](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm)
    * [GCP checksum](https://cdn.f5.com/product/cloudsolutions/f5-bigip-runtime-init/v0.9.0/rpms/f5-bigip-runtime-init-gcp-0.9.0-1-signed.noarch.rpm.sha256)


'cleanup_publish_rpms_dev_cdn' ci job is scheduled to run daily.
* Removes binaries from develop CDN when branch is no longer present