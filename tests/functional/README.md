# Overview

 This page provides details around functional testing


# Components

  * Gitlab CI/CD - as tasks scheduling and execution mechanism
  * Deployment-tool docker image:
    - Includes terraform; tool for provisioning cloud resources
    - Terrafrom plans defined under the following repo: /automation-sdk/deployment-tool
    - Other CLI tools, such as sshpass and jq 
  * Mocha tests used for verifing installed extensions and posted declarations
  
  
# Workflow

 The functional tests pipeline consists of three phases: 
   1. Init    - provisioning cloud resources using terraform as well as service installation
   2. Execute - mocha tests execution
   3. Cleanup - deprovisioning of cloud resources using terraform 
   
   
# Triggers
 
 There are a few ways to trigger functional tests pipeline: 
 
   - Commit/Merge to develop or master branches
   - Using smart commit; commit message must include the following string: ```/smart:run_functional_tests/```
   - Using schedule with ```$RUN_FUNCTIONAL_TESTS == "true"```
   
 Note: there a few environment variables which are used for triggering functional tests for different clouds as well as BIGIP versions:
   - BIGIP_VERSION - specifies BIGIP version used in testing; possible values (14, 15 or all)
   - TEST_SUITE - specifies Public Cloud against which functional testing will be done; possilbe values ( aws, azure, azure_gov, gcp or all). 
   - *Example:* Specifying `TEST_SUITE: all and BIGIP_VESION: all` will trigger 8 tests pipelines to test each supported BIGIP version (v14 and v15) against each supported Public Cloud (aws, gcp, azure and azure_gov)
   
# Test cases

 All tests can be splitted on two categories: 
 
  1. System specific:
    - Verify installed packages
    - Verify installed declarations 
  2. Cloud specific
    - Verify cloud resources; however f5-bigip-runtime-init does not make any changes on cloud resources   
   
