# Structure of folder

The structure of this snippets folder is such that it's designed to give the user sample runtime init config snippets quickly.

Note that the files are named by - ATTRIBUTE, TYPE, CLOUD.

For example the code snippet for,
ATTRIBUTE: runtime_parameters
TYPE: metadata
CLOUD: aws

is stored in runtime_parameters_metadata_aws.yaml

Sample of attributes that are cloud-agnostic, such as bigip_ready, extension_packages, and controls, are in files without the CLOUD name in the filename.