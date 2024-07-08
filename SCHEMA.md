## F5 BIG-IP Runtime Init Schema and Examples

### controls: Schema

_Runtime Init controls used for setting logLevel and other Runtime Init settings_

Type: `object`

<i id="#">path: #</i>

**_Properties_**

 - <b id="#/properties/logLevel">logLevel</b>
	 - Type: `string`
	 - <i id="#/properties/logLevel">path: #/properties/logLevel</i>
	 - The value is restricted to the following: 
		 1. _"debug"_
		 2. _"info"_
		 3. _"silly"_
		 4. _"warn"_
		 5. _"error"_
 - <b id="#/properties/logFilename">logFilename</b>
	 - Type: `string`
	 - <i id="#/properties/logFilename">path: #/properties/logFilename</i>
	 - Example values: 
		 1. _"/var/log/cloud/bigIpRuntimeInit.log"_
 - <b id="#/properties/logToJson">logToJson</b>
	 - Type: `boolean`
	 - <i id="#/properties/logToJson">path: #/properties/logToJson</i>
	 - The value is restricted to the following: 
		 1. _true_
		 2. _false_
 - <b id="#/properties/extensionInstallDelayInMs">extensionInstallDelayInMs</b>
	 - Type: `number`
	 - <i id="#/properties/extensionInstallDelayInMs">path: #/properties/extensionInstallDelayInMs</i>
	 - Example values: 
		 1. `60000`
		 2. `1000`
		 3. `600`


### controls: Configuration Examples

```yaml
controls:
  logLevel: silly
  logFilename: /var/log/cloud/bigIpRuntimeInit-test.log
  logToJson: true
  extensionInstallDelayInMs: 60000

```
***
### runtime_parameters: Schema

_Runtime parameters used to render Automation Toolchain declarations._

Type: `array`

<i id="#">path: #</i>

 - **_Items_**
 - Type: `object`
 - <i id="#/items">path: #/items</i>
 - This schema <u>does not</u> accept additional properties.
 - **_Properties_**
	 - <b id="#/items/properties/name">name</b> `required`
		 - Type: `string`
		 - <i id="#/items/properties/name">path: #/items/properties/name</i>
		 - Example values: 
			 1. _"ADMIN_PASSWORD"_
			 2. _"HOST_NAME"_
	 - <b id="#/items/properties/type">type</b> `required`
		 - Type: `string`
		 - <i id="#/items/properties/type">path: #/items/properties/type</i>
		 - The value is restricted to the following: 
			 1. _"static"_
			 2. _"secret"_
			 3. _"metadata"_
			 4. _"url"_
			 5. _"tag"_
			 6. _"storage"_
	 - <b id="#/items/properties/returnType">returnType</b>
		 - Type: `string`
		 - <i id="#/items/properties/returnType">path: #/items/properties/returnType</i>
		 - The value is restricted to the following: 
			 1. _"string"_
			 2. _"number"_
			 3. _"boolean"_
	 - <b id="#/items/properties/verifyTls">verifyTls</b>
		 - _For enabling secure site verification_
		 - Type: `boolean`
		 - <i id="#/items/properties/verifyTls">path: #/items/properties/verifyTls</i>
		 - Example values: 
			 1. _true_
			 2. _false_
	 - <b id="#/items/properties/trustedCertBundles">trustedCertBundles</b>
		 - _List of paths to certificate bundles to use for all https requests_
		 - Type: `array`
		 - <i id="#/items/properties/trustedCertBundles">path: #/items/properties/trustedCertBundles</i>
		 - Example values: 
			 1. _"/path/to/cert.pem"_
			 2. _"/path/to/another_cert.pem"_
	 - <b id="#/items/properties/ipcalc">ipcalc</b>
		 - Type: `string`
		 - <i id="#/items/properties/ipcalc">path: #/items/properties/ipcalc</i>
		 - The value is restricted to the following: 
			 1. _"base"_
			 2. _"mask"_
			 3. _"bitmask"_
			 4. _"hostmask"_
			 5. _"broadcast"_
			 6. _"size"_
			 7. _"first"_
			 8. _"last"_
			 9. _"address"_
	 - <b id="#/items/properties/value">value</b>
		 - Type: `string`
		 - <i id="#/items/properties/value">path: #/items/properties/value</i>
		 - Example values: 
			 1. _"myValue"_
	 - <b id="#/items/properties/secretProvider">secretProvider</b>
		 - Type: `object`
		 - <i id="#/items/properties/secretProvider">path: #/items/properties/secretProvider</i>
		 - This schema <u>does not</u> accept additional properties.
		 - **_Properties_**
			 - <b id="#/items/properties/secretProvider/properties/environment">environment</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/environment">path: #/items/properties/secretProvider/properties/environment</i>
				 - The value is restricted to the following: 
					 1. _"gcp"_
					 2. _"aws"_
					 3. _"azure"_
					 4. _"hashicorp"_
			 - <b id="#/items/properties/secretProvider/properties/type">type</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/type">path: #/items/properties/secretProvider/properties/type</i>
				 - The value is restricted to the following: 
					 1. _"SecretsManager"_
					 2. _"SecretManager"_
					 3. _"default"_
					 4. _"KeyVault"_
					 5. _"Vault"_
			 - <b id="#/items/properties/secretProvider/properties/appRolePath">appRolePath</b>
				 - _URL path of the App Role, if it's unique or if it includes the namespace_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/appRolePath">path: #/items/properties/secretProvider/properties/appRolePath</i>
				 - Example values: 
					 1. _"/v1/auth/approle/login"_
					 2. _"/v1/MyNameSpace/auth/approle/login"_
			 - <b id="#/items/properties/secretProvider/properties/secretId">secretId</b>
				 - _ID or name of the secret in the secret manager of the specified environment_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/secretId">path: #/items/properties/secretProvider/properties/secretId</i>
				 - Example values: 
					 1. _"mySecretId"_
					 2. _"test-document-01"_
			 - <b id="#/items/properties/secretProvider/properties/secretPath">secretPath</b>
				 - _Path to secret object in Hashicorp Vault_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/secretPath">path: #/items/properties/secretProvider/properties/secretPath</i>
				 - Example values: 
					 1. _"secret/foo"_
			 - <b id="#/items/properties/secretProvider/properties/version">version</b>
				 - _Version identifier for the secret to be retrieved_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/version">path: #/items/properties/secretProvider/properties/version</i>
				 - Example values: 
					 1. _"AWSCURRENT"_
					 2. _"1.0"_
					 3. _"1"_
			 - <b id="#/items/properties/secretProvider/properties/vaultUrl">vaultUrl</b>
				 - _URL of the Azure Key Vault_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/vaultUrl">path: #/items/properties/secretProvider/properties/vaultUrl</i>
				 - Example values: 
					 1. _"https://my-keyvault.vault.azure.net"_
					 2. _"https://my-keyvault.vault.usgovcloudapi.net"_
			 - <b id="#/items/properties/secretProvider/properties/vaultServer">vaultServer</b>
				 - _URL of the Hashicorp Vault server_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/vaultServer">path: #/items/properties/secretProvider/properties/vaultServer</i>
				 - Example values: 
					 1. _"https://my-vault-server:8200"_
					 2. _"http://1.2.3.4:8200"_
				 - The value must match this pattern: `^(https?|http?)://[^\s$.?#].[^\s]*$`
			 - <b id="#/items/properties/secretProvider/properties/secretsEngine">secretsEngine</b>
				 - _Hashicorp Vault secrets engine used_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/secretsEngine">path: #/items/properties/secretProvider/properties/secretsEngine</i>
				 - The value is restricted to the following: 
					 1. _"kv2"_
			 - <b id="#/items/properties/secretProvider/properties/authBackend">authBackend</b>
				 - _Hashicorp Vault authentication backend used_
				 - Type: `object`
				 - <i id="#/items/properties/secretProvider/properties/authBackend">path: #/items/properties/secretProvider/properties/authBackend</i>
				 - **_Properties_**
					 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/type">type</b>
						 - _Hashicorp Vault auth backend type_
						 - Type: `string`
						 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/type">path: #/items/properties/secretProvider/properties/authBackend/properties/type</i>
						 - The value is restricted to the following: 
							 1. _"approle"_
					 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/roleId">roleId</b>
						 - Type: `object`
						 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/roleId">path: #/items/properties/secretProvider/properties/authBackend/properties/roleId</i>
						 - **_Properties_**
							 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/roleId/properties/type">type</b>
								 - Type: `string`
								 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/roleId/properties/type">path: #/items/properties/secretProvider/properties/authBackend/properties/roleId/properties/type</i>
								 - The value is restricted to the following: 
									 1. _"url"_
									 2. _"inline"_
							 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/roleId/properties/value">value</b>
								 - _Hashicorp Vault approle role ID_
								 - Type: `string`
								 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/roleId/properties/value">path: #/items/properties/secretProvider/properties/authBackend/properties/roleId/properties/value</i>
								 - Example values: 
									 1. _"9c9b8014-d2e1-11eb-b8bc-0242ac130003"_
									 2. _"file:///path/to/role-id"_
					 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/secretId">secretId</b>
						 - Type: `object`
						 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/secretId">path: #/items/properties/secretProvider/properties/authBackend/properties/secretId</i>
						 - **_Properties_**
							 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/type">type</b>
								 - Type: `string`
								 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/type">path: #/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/type</i>
								 - The value is restricted to the following: 
									 1. _"url"_
									 2. _"inline"_
							 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/value">value</b>
								 - _Hashicorp Vault approle secret ID_
								 - Type: `string`
								 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/value">path: #/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/value</i>
								 - Example values: 
									 1. _"9c9b84a6-d2e1-11eb-b8bc-0242ac130003"_
									 2. _"file:///path/to/secret-id"_
									 3. _"https://path/to/secret-id"_
							 - <b id="#/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/unwrap">unwrap</b>
								 - _For unwrapping a wrapped secret ID_
								 - Type: `boolean`
								 - <i id="#/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/unwrap">path: #/items/properties/secretProvider/properties/authBackend/properties/secretId/properties/unwrap</i>
								 - Example values: 
									 1. _true_
									 2. _false_
			 - <b id="#/items/properties/secretProvider/properties/field">field</b>
				 - _field name to which secret value is mapped to_
				 - Type: `string`
				 - <i id="#/items/properties/secretProvider/properties/field">path: #/items/properties/secretProvider/properties/field</i>
				 - Example values: 
					 1. _"bigiqPassword"_
					 2. _"regKey"_
	 - <b id="#/items/properties/metadataProvider">metadataProvider</b>
		 - Type: `object`
		 - <i id="#/items/properties/metadataProvider">path: #/items/properties/metadataProvider</i>
		 - This schema <u>does not</u> accept additional properties.
		 - **_Properties_**
			 - <b id="#/items/properties/metadataProvider/properties/environment">environment</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/metadataProvider/properties/environment">path: #/items/properties/metadataProvider/properties/environment</i>
				 - The value is restricted to the following: 
					 1. _"aws"_
					 2. _"azure"_
					 3. _"gcp"_
			 - <b id="#/items/properties/metadataProvider/properties/type">type</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/metadataProvider/properties/type">path: #/items/properties/metadataProvider/properties/type</i>
				 - The value is restricted to the following: 
					 1. _"network"_
					 2. _"compute"_
					 3. _"uri"_
			 - <b id="#/items/properties/metadataProvider/properties/field">field</b>
				 - Type: `string`
				 - <i id="#/items/properties/metadataProvider/properties/field">path: #/items/properties/metadataProvider/properties/field</i>
				 - Example values: 
					 1. _"name"_
					 2. _"hostname"_
					 3. _"ipv4"_
					 4. _"local-ipv4s"_
					 5. _"subnet-ipv4-cidr-block"_
			 - <b id="#/items/properties/metadataProvider/properties/value">value</b>
				 - Type: `string`
				 - <i id="#/items/properties/metadataProvider/properties/value">path: #/items/properties/metadataProvider/properties/value</i>
				 - Example values: 
					 1. _"/latest/dynamic/instance-identity/document"_
					 2. _"/latest/api/token"_
			 - <b id="#/items/properties/metadataProvider/properties/query">query</b>
				 - Type: `string`
				 - <i id="#/items/properties/metadataProvider/properties/query">path: #/items/properties/metadataProvider/properties/query</i>
				 - Example values: 
					 1. _"region"_
					 2. _"accountId"_
			 - <b id="#/items/properties/metadataProvider/properties/ipcalc">ipcalc</b>
				 - Type: `string`
				 - <i id="#/items/properties/metadataProvider/properties/ipcalc">path: #/items/properties/metadataProvider/properties/ipcalc</i>
				 - The value is restricted to the following: 
					 1. _"base"_
					 2. _"mask"_
					 3. _"bitmask"_
					 4. _"hostmask"_
					 5. _"broadcast"_
					 6. _"size"_
					 7. _"first"_
					 8. _"last"_
					 9. _"address"_
			 - <b id="#/items/properties/metadataProvider/properties/index">index</b>
				 - Type: `integer`
				 - <i id="#/items/properties/metadataProvider/properties/index">path: #/items/properties/metadataProvider/properties/index</i>
				 - Example values: 
					 1. _"0"_
					 2. _"1"_
					 3. _"2"_
	 - <b id="#/items/properties/tagProvider">tagProvider</b>
		 - Type: `object`
		 - <i id="#/items/properties/tagProvider">path: #/items/properties/tagProvider</i>
		 - This schema <u>does not</u> accept additional properties.
		 - **_Properties_**
			 - <b id="#/items/properties/tagProvider/properties/environment">environment</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/tagProvider/properties/environment">path: #/items/properties/tagProvider/properties/environment</i>
				 - The value is restricted to the following: 
					 1. _"gcp"_
					 2. _"aws"_
					 3. _"azure"_
			 - <b id="#/items/properties/tagProvider/properties/key">key</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/tagProvider/properties/key">path: #/items/properties/tagProvider/properties/key</i>
				 - Example values: 
					 1. _"hostname"_
					 2. _"id"_
					 3. _"date"_
	 - <b id="#/items/properties/storageProvider">storageProvider</b>
		 - Type: `object`
		 - <i id="#/items/properties/storageProvider">path: #/items/properties/storageProvider</i>
		 - This schema <u>does not</u> accept additional properties.
		 - **_Properties_**
			 - <b id="#/items/properties/storageProvider/properties/environment">environment</b> `required`
				 - Type: `string`
				 - <i id="#/items/properties/storageProvider/properties/environment">path: #/items/properties/storageProvider/properties/environment</i>
				 - The value is restricted to the following: 
					 1. _"aws"_
					 2. _"azure"_
					 3. _"gcp"_
					 4. _"private"_
			 - <b id="#/items/properties/storageProvider/properties/source">source</b> `required`
				 - _The URL of the AWS, Azure, Google Cloud Storage, or privately hosted source file_
				 - Type: `string`
				 - <i id="#/items/properties/storageProvider/properties/source">path: #/items/properties/storageProvider/properties/source</i>
				 - Example values: 
					 1. _"https://mybucket.s3.amazonaws.com/mykey/myfile"_
					 2. _"https://mystorageaccount.blob.core.windows.net/mycontainer/myfile"_
					 3. _"https://storage.cloud.google.com/mybucket/mykey/myfile"_
					 4. _"https://myserver/myfile"_
				 - The value must match this pattern: `^(https?|http?|s3?|gs?)://[^\s$.?#].[^\s]*$`
			 - <b id="#/items/properties/storageProvider/properties/destination">destination</b> `required`
				 - _The location where the downloaded file will be saved_
				 - Type: `string`
				 - <i id="#/items/properties/storageProvider/properties/destination">path: #/items/properties/storageProvider/properties/destination</i>
				 - Example values: 
					 1. _"/var/tmp/file1"_
					 2. _"/var/config/rest/downloads/file1"_
				 - The value must match this pattern: `^(/var/tmp/|/var/config/rest/downloads/)`
			 - <b id="#/items/properties/storageProvider/properties/verifyTls">verifyTls</b>
				 - _For enabling secure site verification_
				 - Type: `boolean`
				 - <i id="#/items/properties/storageProvider/properties/verifyTls">path: #/items/properties/storageProvider/properties/verifyTls</i>
				 - Example values: 
					 1. _true_
					 2. _false_
			 - <b id="#/items/properties/storageProvider/properties/trustedCertBundles">trustedCertBundles</b>
				 - _List of paths to certificate bundles to use for all https requests_
				 - Type: `array`
				 - <i id="#/items/properties/storageProvider/properties/trustedCertBundles">path: #/items/properties/storageProvider/properties/trustedCertBundles</i>
				 - Example values: 
					 1. _"/path/to/cert.pem"_
					 2. _"/path/to/another_cert.pem"_
	 - <b id="#/items/properties/query">query</b>
		 - Type: `string`
		 - <i id="#/items/properties/query">path: #/items/properties/query</i>
		 - Example values: 
			 1. _"region"_
	 - <b id="#/items/properties/headers">headers</b>
		 - Type: `array`
		 - <i id="#/items/properties/headers">path: #/items/properties/headers</i>


### runtime_parameters: Configuration Examples

```yaml
aws:
  description: AWS Example
  controls:
    logLevel: silly
    logFilename: /var/log/cloud/bigIpRuntimeInit.log
  runtime_parameters:
    - name: ADMIN_PASS
      type: secret
      secretProvider:
        type: SecretManager
        environment: aws
        version: AWSCURRENT
        secretId: test-document-01
    - name: HOST_NAME
      type: metadata
      metadataProvider:
        environment: aws
        type: compute
        field: hostname
    - name: SELF_IP_EXTERNAL
      type: metadata
      metadataProvider:
        environment: aws
        type: network
        field: local-ipv4s
        index: 1
    - name: SELF_IP_INTERNAL
      type: metadata
      metadataProvider:
        environment: aws
        type: network
        field: local-ipv4s
        index: 2
    - name: DEFAULT_ROUTE
      type: metadata
      metadataProvider:
        environment: aws
        type: network
        field: subnet-ipv4-cidr-block
        index: 1
    - name: AWS_FILE_1
      type: storage
      storageProvider:
        environment: aws
        source: 'https://mybucket.s3.amazonaws.com/mykey/myfile1'
        destination: /var/tmp/myfile1
azure:
  description: Azure Example
  controls:
    logLevel: silly
    logFilename: /var/log/cloud/bigIpRuntimeInit.log
  runtime_parameters:
    - name: AZURE_SERVICE_PRINCIPAL
      type: secret
      secretProvider:
        type: KeyVault
        environment: azure
        vaultUrl: 'https://my-keyvault.vault.azure.net'
        secretId: my_azure_secret
    - name: HOST_NAME
      type: metadata
      metadataProvider:
        environment: azure
        type: compute
        field: name
    - name: SELF_IP_INTERNAL
      type: metadata
      metadataProvider:
        environment: azure
        type: network
        field: ipv4
        index: 1
    - name: SELF_IP_EXTERNAL
      type: metadata
      metadataProvider:
        environment: azure
        type: network
        field: ipv4
        index: 2
    - name: AZURE_FILE_1
      type: storage
      storageProvider:
        environment: azure
        source: 'https://mystorageaccount.blob.core.windows.net/mycontainer/myfile1'
        destination: /var/tmp/myfile1
gcp:
  description: Google Example
  controls:
    logLevel: silly
    logFilename: /var/log/cloud/bigIpRuntimeInit.log
  runtime_parameters:
    - name: ADMIN_PASS
      type: secret
      secretProvider:
        type: SecretsManager
        environment: gcp
        version: latest
        secretId: my-secret-id-01
    - name: ROOT_PASS
      type: secret
      secretProvider:
        type: SecretsManager
        environment: gcp
        version: latest
        secretId: my-secret-id-02
    - name: HOST_NAME
      type: metadata
      metadataProvider:
        environment: gcp
        type: compute
        field: name
    - name: GCP_FILE_1
      type: storage
      storageProvider:
        environment: gcp
        source: 'https://storage.cloud.google.com/mybucket/mykey/myfile1'
        destination: /var/tmp/myfile1
hashicorp:
  description: Hashicorp Vault Example
  controls:
    logLevel: silly
    logFilename: /var/log/cloud/bigIpRuntimeInit.log
  runtime_parameters:
    - name: ADMIN_PASS
      type: secret
      secretProvider:
        type: Vault
        environment: hashicorp
        vaultServer: 'http://127.0.0.1:8200'
        secretsEngine: kv2
        secretId: secret/foo
        field: password
        version: 1
        authBackend:
          type: approle
          roleId:
            type: url
            value: 'file:///path/to/role-id'
          secretId:
            type: inline
            value: secret-id
            unwrap: true

```
***
### post_onboard_enabled: Schema

_Used to specify commands which will be executed following extension services operations._

Type: `array`

<i id="#">path: #</i>

 - **_Items_**
 - Type: `object`
 - <i id="#/items">path: #/items</i>
 - **_Properties_**
	 - <b id="#/items/properties/name">name</b>
		 - Type: `string`
		 - <i id="#/items/properties/name">path: #/items/properties/name</i>
		 - Example values: 
			 1. _"my_postonboard_command"_
			 2. _"example_local_exec"_
	 - <b id="#/items/properties/type">type</b>
		 - Type: `string`
		 - <i id="#/items/properties/type">path: #/items/properties/type</i>
		 - The value is restricted to the following: 
			 1. _"inline"_
			 2. _"file"_
			 3. _"url"_
	 - <b id="#/items/properties/command">command</b>
		 - Type: `array`
		 - <i id="#/items/properties/command">path: #/items/properties/command</i>
			 - **_Items_**
			 - Type: `string`
			 - <i id="#/items/properties/command/items">path: #/items/properties/command/items</i>
			 - Example values: 
				 1. _"/tmp/post_onboard_script.sh"_
				 2. _"https://the-delivery-location.com/remote_post_onboard.sh"_
	 - <b id="#/items/properties/verifyTls">verifyTls</b>
		 - _For enabling secure site verification_
		 - Type: `boolean`
		 - <i id="#/items/properties/verifyTls">path: #/items/properties/verifyTls</i>
		 - Example values: 
			 1. _true_
			 2. _false_
	 - <b id="#/items/properties/trustedCertBundles">trustedCertBundles</b>
		 - _List of paths to certificate bundles to use for all https requests_
		 - Type: `array`
		 - <i id="#/items/properties/trustedCertBundles">path: #/items/properties/trustedCertBundles</i>
		 - Example values: 
			 1. _"/path/to/cert.pem"_
			 2. _"/path/to/another_cert.pem"_


### post_onboard_enabled: Configuration Examples

```yaml
inline:
  description: Runs commands specified inline
  post_onboard_enabled:
    - name: example_inline_command
      type: inline
      commands:
        - touch /tmp/post_onboard_script.sh
        - chmod 777 /tmp/post_onboard_script.sh
        - >-
          echo "touch /tmp/create_by_autogenerated_post_local" >
          /tmp/post_onboard_script.sh
local_exec:
  description: Runs commands from a local file
  post_onboard_enabled:
    - name: example_local_exec
      type: file
      commands:
        - /tmp/post_onboard_script.sh
remote_exec:
  description: Runs commands from a URL
  post_onboard_enabled:
    - name: example_remote_exec
      type: url
      commands:
        - 'https://the-delivery-location.com/remote_post_onboard.sh'

```
***
### pre_onboard_enabled: Schema

_Used to specify commands which will be executed before extension package operations before BIG-IP is ready._

Type: `array`

<i id="#">path: #</i>

 - **_Items_**
 - Type: `object`
 - <i id="#/items">path: #/items</i>
 - **_Properties_**
	 - <b id="#/items/properties/name">name</b>
		 - Type: `string`
		 - <i id="#/items/properties/name">path: #/items/properties/name</i>
		 - Example values: 
			 1. _"my_preonboard_command"_
			 2. _"example_local_exec"_
			 3. _"provision_rest"_
	 - <b id="#/items/properties/type">type</b>
		 - Type: `string`
		 - <i id="#/items/properties/type">path: #/items/properties/type</i>
		 - The value is restricted to the following: 
			 1. _"inline"_
			 2. _"file"_
			 3. _"url"_
	 - <b id="#/items/properties/command">command</b>
		 - Type: `array`
		 - <i id="#/items/properties/command">path: #/items/properties/command</i>
			 - **_Items_**
			 - Type: `string`
			 - <i id="#/items/properties/command/items">path: #/items/properties/command/items</i>
			 - Example values: 
				 1. _"/usr/bin/setdb provision.extramb 500"_
				 2. _"/usr/bin/setdb restjavad.useextramb true"_
				 3. _"/tmp/pre_onboard_script.sh"_
	 - <b id="#/items/properties/verifyTls">verifyTls</b>
		 - _For enabling secure site verification_
		 - Type: `boolean`
		 - <i id="#/items/properties/verifyTls">path: #/items/properties/verifyTls</i>
		 - Example values: 
			 1. _true_
			 2. _false_
	 - <b id="#/items/properties/trustedCertBundles">trustedCertBundles</b>
		 - _List of paths to certificate bundles to use for all https requests_
		 - Type: `array`
		 - <i id="#/items/properties/trustedCertBundles">path: #/items/properties/trustedCertBundles</i>
		 - Example values: 
			 1. _"/path/to/cert.pem"_
			 2. _"/path/to/another_cert.pem"_


### pre_onboard_enabled: Configuration Examples

```yaml
inline:
  description: >-
    Runs commands specified inline. For improved performance, F5 recommends
    including pre_onboard commands to increase provisioning of the REST
    framework, and to pre-provision the ASM module when deploying WAF.
  pre_onboard_enabled:
    - name: example_inline_command
      type: inline
      commands:
        - touch /tmp/pre_onboard_script.sh
        - chmod 777 /tmp/pre_onboard_script.sh
        - >-
          echo "touch /tmp/create_by_autogenerated_pre_local" >
          /tmp/pre_onboard_script.sh
        - /usr/bin/setdb provision.extramb 500
        - /usr/bin/setdb restjavad.useextramb true
local_exec:
  description: Runs commands from a local file
  pre_onboard_enabled:
    - name: example_local_exec
      type: file
      commands:
        - /tmp/pre_onboard_script.sh
remote_exec:
  description: Runs commands from a URL
  pre_onboard_enabled:
    - name: example_remote_exec
      type: url
      commands:
        - 'https://the-delivery-location.com/remote_pre_onboard.sh'

```
***
### bigip_ready_enabled: Schema

_Used to specify commands which will be executed before extension package operations after BIG-IP and MCPD are up and running._

Type: `array`

<i id="#">path: #</i>

 - **_Items_**
 - Type: `object`
 - <i id="#/items">path: #/items</i>
 - **_Properties_**
	 - <b id="#/items/properties/name">name</b>
		 - Type: `string`
		 - <i id="#/items/properties/name">path: #/items/properties/name</i>
		 - Example values: 
			 1. _"my_preonboard_command"_
			 2. _"example_local_exec"_
			 3. _"provision_rest"_
	 - <b id="#/items/properties/type">type</b>
		 - Type: `string`
		 - <i id="#/items/properties/type">path: #/items/properties/type</i>
		 - The value is restricted to the following: 
			 1. _"inline"_
			 2. _"file"_
			 3. _"url"_
	 - <b id="#/items/properties/command">command</b>
		 - Type: `array`
		 - <i id="#/items/properties/command">path: #/items/properties/command</i>
			 - **_Items_**
			 - Type: `string`
			 - <i id="#/items/properties/command/items">path: #/items/properties/command/items</i>
			 - Example values: 
				 1. _"tmsh create net vlan external interfaces replace-all-with { 1.1 }"_
				 2. _"tmsh create sys folder /LOCAL_ONLY device-group none traffic-group traffic-group-local-only"_
				 3. _"tmsh save sys config"_
	 - <b id="#/items/properties/verifyTls">verifyTls</b>
		 - _For enabling secure site verification_
		 - Type: `boolean`
		 - <i id="#/items/properties/verifyTls">path: #/items/properties/verifyTls</i>
		 - Example values: 
			 1. _true_
			 2. _false_
	 - <b id="#/items/properties/trustedCertBundles">trustedCertBundles</b>
		 - _List of paths to certificate bundles to use for all https requests_
		 - Type: `array`
		 - <i id="#/items/properties/trustedCertBundles">path: #/items/properties/trustedCertBundles</i>
		 - Example values: 
			 1. _"/path/to/cert.pem"_
			 2. _"/path/to/another_cert.pem"_


### bigip_ready_enabled: Configuration Examples

```yaml
inline:
  description: Runs commands specified inline
  bigip_ready_enabled:
    - name: set_message_size
      type: inline
      commands:
        - >-
          /usr/bin/curl -s -f -u admin: -H "Content-Type: application/json" -d
          '{"maxMessageBodySize":134217728}' -X POST
          http://localhost:8100/mgmt/shared/server/messaging/settings/8100 | jq
          .
local_exec:
  description: Runs commands from a local file
  bigip_ready_enabled:
    - name: example_local_exec
      type: file
      commands:
        - /tmp/bigip_ready_enabled.sh
remote_exec:
  description: Runs commands from a URL
  bigip_ready_enabled:
    - name: example_remote_exec
      type: url
      commands:
        - 'https://the-delivery-location.com/bigip_ready_enabled.sh'

```
***
### extension_packages: Schema

_Used to specify Automation Toolchain packages to be installed on device._

Type: `object`

<i id="#">path: #</i>

This schema <u>does not</u> accept additional properties.

**_Properties_**

 - <b id="#/properties/install_operations">install_operations</b> `required`
	 - _Specify the type, version, location, and endpoint of packages to install_
	 - Type: `array`
	 - <i id="#/properties/install_operations">path: #/properties/install_operations</i>
		 - **_Items_**
		 - Type: `object`
		 - <i id="#/properties/install_operations/items">path: #/properties/install_operations/items</i>
		 - This schema <u>does not</u> accept additional properties.
		 - **_Properties_**
			 - <b id="#/properties/install_operations/items/properties/extensionType">extensionType</b> `required`
				 - Type: `string`
				 - <i id="#/properties/install_operations/items/properties/extensionType">path: #/properties/install_operations/items/properties/extensionType</i>
				 - The value is restricted to the following: 
					 1. _"do"_
					 2. _"as3"_
					 3. _"ts"_
					 4. _"cf"_
					 5. _"fast"_
					 6. _"ilx"_
			 - <b id="#/properties/install_operations/items/properties/extensionVersion">extensionVersion</b>
				 - Type: `string`
				 - <i id="#/properties/install_operations/items/properties/extensionVersion">path: #/properties/install_operations/items/properties/extensionVersion</i>
				 - Example values: 
					 1. _"1.12.0"_
					 2. _"3.19.1"_
			 - <b id="#/properties/install_operations/items/properties/extensionHash">extensionHash</b>
				 - Type: `string`
				 - <i id="#/properties/install_operations/items/properties/extensionHash">path: #/properties/install_operations/items/properties/extensionHash</i>
				 - Example values: 
					 1. _"ba2db6e1c57d2ce6f0ca20876c820555ffc38dd0a714952b4266c4daf959d987"_
					 2. _"95c2b76fb598bbc36fb93a2808f2e90e6c50f7723d27504f3eb2c2850de1f9e1"_
			 - <b id="#/properties/install_operations/items/properties/verifyTls">verifyTls</b>
				 - _For enabling secure site verification_
				 - Type: `boolean`
				 - <i id="#/properties/install_operations/items/properties/verifyTls">path: #/properties/install_operations/items/properties/verifyTls</i>
				 - Example values: 
					 1. _true_
					 2. _false_
			 - <b id="#/properties/install_operations/items/properties/trustedCertBundles">trustedCertBundles</b>
				 - _List of paths to certificate bundles to use for all https requests_
				 - Type: `array`
				 - <i id="#/properties/install_operations/items/properties/trustedCertBundles">path: #/properties/install_operations/items/properties/trustedCertBundles</i>
				 - Example values: 
					 1. _"/path/to/cert.pem"_
					 2. _"/path/to/another_cert.pem"_
			 - <b id="#/properties/install_operations/items/properties/extensionUrl">extensionUrl</b>
				 - Type: `string`
				 - <i id="#/properties/install_operations/items/properties/extensionUrl">path: #/properties/install_operations/items/properties/extensionUrl</i>
				 - Example values: 
					 1. _"https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.20.0/f5-appsvcs-3.20.0-3.noarch.rpm"_
					 2. _"file:///var/config/rest/downloads/f5-declarative-onboarding-1.10.0-2.noarch.rpm"_
			 - <b id="#/properties/install_operations/items/properties/extensionVerificationEndpoint">extensionVerificationEndpoint</b>
				 - Type: `string`
				 - <i id="#/properties/install_operations/items/properties/extensionVerificationEndpoint">path: #/properties/install_operations/items/properties/extensionVerificationEndpoint</i>
				 - Example values: 
					 1. _"/mgmt/shared/myIlxApp/info"_


### extension_packages: Configuration Examples

```yaml
default:
  extension_packages:
    install_operations:
      - extensionType: do
        extensionVersion: 1.44.0
      - extensionType: as3
        extensionVersion: 3.51.0
      - extensionType: fast
        extensionVersion: 1.25.0
versioned:
  extension_packages:
    install_operations:
      - extensionType: do
        extensionVersion: 1.44.0
      - extensionType: as3
        extensionVersion: 3.51.0
      - extensionType: fast
        extensionVersion: 1.25.0
hashed:
  extension_packages:
    install_operations:
      - extensionType: do
        extensionVersion: 1.44.0
        extensionHash: 3b05d9bcafbcf0b5b625ff81d6bab5ad26ed90c0dd202ded51756af3598a97ec
      - extensionType: as3
        extensionVersion: 3.51.0
        extensionHash: e151a9ccd0fd60c359f31839dc3a70bfcf2b46b9fedb8e1c37e67255ee482c0f
      - extensionType: ts
        extensionVersion: 1.35.0
        extensionHash: 839698d98a8651a90b3d509cde4b382338461a253878c9fd00c894699ef0e844
      - extensionType: fast
        extensionVersion: 1.25.0
        extensionHash: 434309179af405e6b663e255d4d3c0a1fd45cac9b561370e350bb8dd8b39761f
url:
  extension_packages:
    install_operations:
      - extensionType: do
        extensionUrl: >-
          https://github.com/F5Networks/f5-declarative-onboarding/releases/download/v1.44.0/f5-declarative-onboarding-1.44.0-5.noarch.rpm
        extensionVersion: 1.44.0
      - extensionType: as3
        extensionUrl: 'file:///var/config/rest/downloads/f5-appsvcs-3.51.0-5.noarch.rpm'
        extensionVersion: 3.51.0
      - extensionType: fast
        extensionUrl: >-
          https://github.com/F5Networks/f5-appsvcs-templates/releases/download/v1.25.0/f5-appsvcs-templates-1.25.0-1.noarch.rpm
        extensionVersion: 1.25.0
ilx:
  extension_packages:
    install_operations:
      - extensionType: do
        extensionVersion: 1.44.0
      - extensionType: as3
        extensionVersion: 3.51.0
      - extensionType: fast
        extensionVersion: 1.25.0
      - extensionType: ilx
        extensionUrl: 'file:///var/config/rest/downloads/myIlxApp.rpm'
        extensionVersion: 1.0.0
        extensionVerificationEndpoint: /mgmt/shared/myIlxApp/info

```
***
### extension_services: Schema

_Used to specify configuration operations to be performed against specific extensions on device._

Type: `object`

<i id="#">path: #</i>

This schema <u>does not</u> accept additional properties.

**_Properties_**

 - <b id="#/properties/service_operations">service_operations</b> `required`
	 - _Specify the operations to be performed against the specified services_
	 - Type: `array`
	 - <i id="#/properties/service_operations">path: #/properties/service_operations</i>
		 - **_Items_**
		 - Type: `object`
		 - <i id="#/properties/service_operations/items">path: #/properties/service_operations/items</i>
		 - This schema <u>does not</u> accept additional properties.
		 - **_Properties_**
			 - <b id="#/properties/service_operations/items/properties/extensionType">extensionType</b>
				 - Type: `string`
				 - <i id="#/properties/service_operations/items/properties/extensionType">path: #/properties/service_operations/items/properties/extensionType</i>
				 - The value is restricted to the following: 
					 1. _"do"_
					 2. _"as3"_
					 3. _"ts"_
					 4. _"fast"_
					 5. _"cf"_
			 - <b id="#/properties/service_operations/items/properties/type">type</b>
				 - Type: `string`
				 - <i id="#/properties/service_operations/items/properties/type">path: #/properties/service_operations/items/properties/type</i>
				 - **Comment**<br/>_url in case of local file (file:) or remote (https: or http:) and inline in case the declaration is part of the config file_
				 - The value is restricted to the following: 
					 1. _"url"_
					 2. _"inline"_
			 - <b id="#/properties/service_operations/items/properties/value">value</b>
				 - _URL of local or remote file containing the declarations to be applied, or the entire declaration inline as an object_
				 - <i id="#/properties/service_operations/items/properties/value">path: #/properties/service_operations/items/properties/value</i>
				 - Example values: 
					 1. _"https://cdn.f5.com/product/cloudsolutions/declarations/template2-0/autoscale-waf/autoscale_do_payg.json"_
					 2. _"file:///examples/automation_toolchain_declarations/as3.json"_
					 3. _"class: AS3 action: deploy persist: true declaration: class: ADC schemaVersion: 3.0.0 id: urn:uuid:33045210-3ab8-4636-9b2a-c98d22ab915d label: Sample 1 remark: Simple HTTP Service with Round-Robin Load Balancing Sample_01: class: Tenant A1: class: Application template: http serviceMain: class: Service_HTTP virtualAddresses: - 10.0.1.10 pool: web_pool web_pool: class: Pool monitors: - http members: - servicePort: 80 serverAddresses: - 192.0.1.10 - 192.0.1.11"_
			 - <b id="#/properties/service_operations/items/properties/verifyTls">verifyTls</b>
				 - _For enabling secure site verification_
				 - Type: `boolean`
				 - <i id="#/properties/service_operations/items/properties/verifyTls">path: #/properties/service_operations/items/properties/verifyTls</i>
				 - Example values: 
					 1. _true_
					 2. _false_
			 - <b id="#/properties/service_operations/items/properties/trustedCertBundles">trustedCertBundles</b>
				 - _List of paths to certificate bundles to use for all https requests_
				 - Type: `array`
				 - <i id="#/properties/service_operations/items/properties/trustedCertBundles">path: #/properties/service_operations/items/properties/trustedCertBundles</i>
				 - Example values: 
					 1. _"/path/to/cert.pem"_
					 2. _"/path/to/another_cert.pem"_


### extension_services: Configuration Examples

```yaml
url:
  extension_services:
    service_operations:
      - extensionType: do
        type: url
        value: >-
          https://cdn.f5.com/product/cloudsolutions/declarations/template2-0/autoscale-waf/autoscale_do_payg.json
        verifyTls: false
      - extensionType: as3
        type: url
        value: >-
          https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_as3.json
file:
  extension_services:
    service_operations:
      - extensionType: as3
        type: url
        value: 'file:///examples/automation_toolchain_declarations/as3.json'
inline:
  extension_services:
    service_operations:
      - extensionType: do
        type: inline
        value:
          schemaVersion: 1.0.0
          class: Device
          label: >-
            Quickstart 1NIC BIG-IP declaration for Declarative Onboarding with
            BYOL license
          async: true
          Common:
            class: Tenant
            My_DbVariables:
              class: DbVariables
              ui.advisory.enabled: true
              ui.advisory.color: blue
              ui.advisory.text: BIG-IP Quickstart
            My_Provisioning:
              class: Provision
              asm: nominal
              ltm: nominal
            My_Ntp:
              class: NTP
              servers:
                - 169.254.169.253
              timezone: UTC
            My_Dns:
              class: DNS
              nameServers:
                - 169.254.169.253
            My_License:
              class: License
              licenseType: regKey
              regKey: AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEE
            My_System:
              class: System
              autoPhonehome: true
              hostname: HOST_NAME
            quickstart:
              class: User
              partitionAccess:
                all-partitions:
                  role: admin
              password: BIGIP_PASSWORD
              shell: bash
              userType: regular
      - extensionType: as3
        type: inline
        value:
          class: AS3
          action: deploy
          persist: true
          declaration:
            class: ADC
            schemaVersion: 3.0.0
            id: 'urn:uuid:33045210-3ab8-4636-9b2a-c98d22ab915d'
            label: Sample 1
            remark: Simple HTTP Service with Round-Robin Load Balancing
            Sample_01:
              class: Tenant
              A1:
                class: Application
                template: http
                serviceMain:
                  class: Service_HTTP
                  virtualAddresses:
                    - 10.0.1.10
                  pool: web_pool
                web_pool:
                  class: Pool
                  monitors:
                    - http
                  members:
                    - servicePort: 80
                      serverAddresses:
                        - 192.0.1.10
                        - 192.0.1.11

```
***
### post_hook: Schema

_Details of an HTTP request to send when deployment is finished._

Type: `array`

<i id="#">path: #</i>



### post_hook: Configuration Examples

```yaml
webhook:
  description: Sends webhook payload to specified URL
  post_hook:
    - name: example_webhook
      type: webhook
      url: 'https://webhook.site'
custom_properties:
  description: Sends webhook payload with user-specified custom properties
  post_hook:
    - name: example_webhook
      type: webhook
      url: 'https://webhook.site'
      properties:
        optionalKey1: optional_value1
        optionalKey2: optional_value2

```
***
## Additional Examples

### Automated Toolchain declarations referenced here are available in the examples/automation_toolchain_declarations folder.

```yaml
example_1:
  description: >-
    Verifies and installs Automation Toolchain components (DO, AS3, FAST) on a
    local BIG-IP and then configures AS3 from a local declaration file.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    bigip_ready_enabled:
      - name: set_message_size
        type: inline
        commands:
          - >-
            /usr/bin/curl -s -f -u admin: -H "Content-Type: application/json" -d
            '{"maxMessageBodySize":134217728}' -X POST
            http://localhost:8100/mgmt/shared/server/messaging/settings/8100 |
            jq .
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
          extensionHash: 3b05d9bcafbcf0b5b625ff81d6bab5ad26ed90c0dd202ded51756af3598a97ec
        - extensionType: as3
          extensionVersion: 3.51.0
          extensionHash: e151a9ccd0fd60c359f31839dc3a70bfcf2b46b9fedb8e1c37e67255ee482c0f
        - extensionType: fast
          extensionVersion: 1.25.0
          extensionHash: 434309179af405e6b663e255d4d3c0a1fd45cac9b561370e350bb8dd8b39761f
    extension_services:
      service_operations:
        - extensionType: as3
          type: url
          value: 'file:///examples/automation_toolchain_declarations/as3.json'
example_2:
  description: >-
    Verifies and installs DO and myIlxApp RPMs from local directories and
    configures DO from a local declaration file. Install operations with an
    extensionUrl value that points to a local file stored on BIG-IP system.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionUrl: >-
            file:///var/config/rest/downloads/f5-declarative-onboarding-1.44.0-5.noarch.rpm
          extensionHash: 3b05d9bcafbcf0b5b625ff81d6bab5ad26ed90c0dd202ded51756af3598a97ec
          extensionVersion: 1.44.0
        - extensionType: ilx
          extensionUrl: 'file:///var/config/rest/downloads/myIlxApp.rpm'
          extensionVersion: 1.0.0
          extensionVerificationEndpoint: /mgmt/shared/myIlxApp/info
          extensionHash: de615341b91beaed59195dceefc122932580d517600afce1ba8d3770dfe42d28
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: 'file:///var/config/rest/downloads/do.json'
example_3:
  description: >-
    Installs DO, AS3, and FAST on a local BIG-IP and renders the Azure service
    principal secret into an AS3 declaration downloaded from a URL.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: AZURE_SERVICE_PRINCIPAL
        type: secret
        secretProvider:
          type: KeyVault
          environment: azure
          vaultUrl: 'https://my-keyvault.vault.azure.net'
          secretId: my_azure_secret
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: >-
            https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_do.json
        - extensionType: as3
          type: url
          value: >-
            file:///examples/automation_toolchain_declarations/example_3_as3.json
example_4:
  description: >-
    Renders secret referenced within DO declaration to configure the admin
    password on a BIG-IP device in AWS.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: ADMIN_PASS
        type: secret
        secretProvider:
          type: SecretManager
          environment: aws
          version: AWSCURRENT
          secretId: test-document-01
      - name: ROOT_PASS
        type: secret
        secretProvider:
          type: SecretManager
          environment: aws
          version: AWSCURRENT
          secretId: test-document-02
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: 'file:///examples/automation_toolchain_declarations/example_4_do.json'
example_5:
  description: >-
    Renders secret referenced within DO declaration to configure the admin
    password on a BIG-IP device in GCP.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: ADMIN_PASS
        type: secret
        secretProvider:
          type: SecretsManager
          environment: gcp
          version: latest
          secretId: my-secret-id-01
      - name: ROOT_PASS
        type: secret
        secretProvider:
          type: SecretsManager
          environment: gcp
          version: latest
          secretId: my-secret-id-02
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: 'file:///examples/automation_toolchain_declarations/example_5_do.json'
example_6:
  description: >-
    Replaces variables used within DO and AS3 declarations with properties from
    instance metadata to configure hostname, self IP addresses and pool members
    on BIG-IP device.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: HOST_NAME
        type: metadata
        metadataProvider:
          environment: aws
          type: compute
          field: hostname
      - name: SELF_IP_EXTERNAL
        type: metadata
        metadataProvider:
          environment: aws
          type: network
          field: local-ipv4s
          index: 1
      - name: SELF_IP_INTERNAL
        type: metadata
        metadataProvider:
          environment: aws
          type: network
          field: local-ipv4s
          index: 2
      - name: DEFAULT_ROUTE
        type: metadata
        metadataProvider:
          environment: aws
          type: network
          field: subnet-ipv4-cidr-block
          index: 1
      - name: REGION
        type: url
        value: 'http://169.254.169.254/latest/dynamic/instance-identity/document'
        query: region
        headers:
          - name: Content-type
            value: json
          - name: User-Agent
            value: bigip-ve
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: 'file:///examples/automation_toolchain_declarations/example_6_do.json'
        - extensionType: as3
          type: url
          value: >-
            file:///examples/automation_toolchain_declarations/example_7_as3.json
example_7:
  description: >-
    Installs AS3, DO, and FAST and uses an inline AS3 declaration to setup the
    BIG-IP.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: as3
          type: inline
          value:
            class: AS3
            action: deploy
            persist: true
            declaration:
              class: ADC
              schemaVersion: 3.0.0
              id: 'urn:uuid:33045210-3ab8-4636-9b2a-c98d22ab915d'
              label: Sample 1
              remark: Simple HTTP Service with Round-Robin Load Balancing
              Sample_01:
                class: Tenant
                A1:
                  class: Application
                  template: http
                  serviceMain:
                    class: Service_HTTP
                    virtualAddresses:
                      - 10.0.1.10
                    pool: web_pool
                  web_pool:
                    class: Pool
                    monitors:
                      - http
                    members:
                      - servicePort: 80
                        serverAddresses:
                          - 192.0.1.10
                          - 192.0.1.11
example_8:
  description: Using runtime parameters with inline Automation Toolchain declarations.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: SCHEMA_VERSION
        type: static
        value: 3.0.0
      - name: HOST_NAME
        type: static
        value: bigip1.example.com
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: inline
          value:
            schemaVersion: '{{{ SCHEMA_VERSION }}}'
            class: Device
            async: true
            label: my BIG-IP declaration for declarative onboarding
            Common:
              class: Tenant
              hostname: '{{{ HOST_NAME }}}'
              myDns:
                class: DNS
                nameServers:
                  - 8.8.8.8
              myNtp:
                class: NTP
                servers:
                  - 0.pool.ntp.org
                timezone: UTC
              myProvisioning:
                class: Provision
                ltm: nominal
                asm: nominal
              dbvars:
                class: DbVariables
                provision.extramb: 500
                restjavad.useextramb: true
        - extensionType: as3
          type: inline
          value:
            class: AS3
            action: deploy
            persist: true
            declaration:
              class: ADC
              schemaVersion: '{{{ SCHEMA_VERSION }}}'
              label: Sample 1
              remark: Simple HTTP Service with Round-Robin Load Balancing
              Sample_01:
                class: Tenant
                A1:
                  class: Application
                  template: http
                  serviceMain:
                    class: Service_HTTP
                    virtualAddresses:
                      - 10.0.1.10
                    pool: web_pool
                  web_pool:
                    class: Pool
                    monitors:
                      - http
                    members:
                      - servicePort: 80
                        serverAddresses:
                          - 192.0.1.10
                          - 192.0.1.11
example_9:
  description: Using custom pre-onboard and post-onboard commands.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    pre_onboard_enabled:
      - name: example_inline_command
        type: inline
        commands:
          - touch /tmp/pre_onboard_script.sh
          - chmod 777 /tmp/pre_onboard_script.sh
          - >-
            echo "touch /tmp/create_by_autogenerated_pre_local" >
            /tmp/pre_onboard_script.sh
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
      - name: example_local_exec
        type: file
        commands:
          - /tmp/pre_onboard_script.sh
      - name: example_remote_exec
        type: url
        commands:
          - 'https://the-delivery-location.com/remote_pre_onboard.sh'
    post_onboard_enabled:
      - name: example_inline_command
        type: inline
        commands:
          - touch /tmp/post_onboard_script.sh
          - chmod 777 /tmp/post_onboard_script.sh
          - >-
            echo "touch /tmp/create_by_autogenerated_post_local" >
            /tmp/post_onboard_script.sh
      - name: example_local_exec
        type: file
        commands:
          - /tmp/post_onboard_script.sh
      - name: example_remote_exec
        type: url
        commands:
          - 'https://the-delivery-location.com/remote_post_onboard.sh'
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
example_10:
  description: Sending a customized webhook on completion.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    post_hook:
      - name: example_webhook
        type: webhook
        url: 'https://webhook.site'
        verifyTls: true
        properties:
          optionalKey1: optional_value1
          optionalKey2: optional_value2
example_11:
  description: >-
    Overrides default certificate validation/verification using the verifyTls
    parameter. The following attributes support verifyTls: pre_onboard_enabled,
    post_onboard_enabled, extension_packages.install_operations,
    extension_services.service_operations, and post_hook.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
          extensionHash: 3b05d9bcafbcf0b5b625ff81d6bab5ad26ed90c0dd202ded51756af3598a97ec
        - extensionType: as3
          extensionUrl: >-
            https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.51.0/f5-appsvcs-3.51.0-5.noarch.rpm
          extensionVersion: 3.51.0
          verifyTls: false
        - extensionType: ilx
          extensionUrl: 'file:///var/config/rest/downloads/myIlxApp.rpm'
          extensionVersion: 1.0.0
          extensionVerificationEndpoint: /mgmt/shared/myIlxApp/info
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: >-
            https://cdn.f5.com/product/cloudsolutions/declarations/autoscale-waf/autoscale_do_payg.json
          verifyTls: false
        - extensionType: as3
          type: url
          value: >-
            https://cdn.f5.com/product/cloudsolutions/templates/f5-azure-arm-templates/examples/modules/bigip/autoscale_as3.json
    post_hook:
      - name: example_webhook
        type: webhook
        url: 'https://postman-echo.com/post'
        verifyTls: false
        properties:
          optionalKey1: optional_value1
          optionalKey2: optional_value2
    post_onboard_enabled:
      - name: example_inline_command
        type: inline
        commands:
          - touch /tmp/post_onboard_script.sh
          - chmod 777 /tmp/post_onboard_script.sh
          - >-
            echo "touch /tmp/created_by_autogenerated_post_local" >
            /tmp/post_onboard_script.sh
      - name: example_local_exec
        type: file
        commands:
          - /tmp/post_onboard_script.sh
      - name: example_remote_exec
        type: url
        verifyTls: false
        commands:
          - >-
            https://ak-metadata-package-poc.s3.amazonaws.com/remote_post_onboard.sh
      - name: example_remote_exec
        type: url
        commands:
          - >-
            https://ak-metadata-package-poc.s3.amazonaws.com/remote_post_onboard.sh
    pre_onboard_enabled:
      - name: example_remote_exec
        type: url
        commands:
          - >-
            https://ak-metadata-package-poc.s3.amazonaws.com/remote_pre_onboard.sh
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
example_12:
  description: >-
    Licenses BIG-IP device using BIG-IQ utility offering and authenticating with
    credentials stored in Azure KeyVault.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: HOST_NAME
        type: metadata
        metadataProvider:
          environment: azure
          type: compute
          field: name
      - name: BIGIQ_ADMIN_PASS
        type: secret
        secretProvider:
          type: KeyVault
          environment: azure
          vaultUrl: 'https://my-keyvault.vault.azure.net'
          secretId: my_azure_secret
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: url
          value: 'file:///examples/automation_toolchain_declarations/example_7_do.json'
example_13:
  description: Renders the admin password using Hashicorp Vault approle authentication.
  runtime_config:
    controls:
      logLevel: silly
      logFilename: /var/log/cloud/bigIpRuntimeInit.log
    runtime_parameters:
      - name: ADMIN_PASS
        type: secret
        secretProvider:
          type: Vault
          environment: hashicorp
          vaultServer: 'http://127.0.0.1:8200'
          secretsEngine: kv2
          secretId: secret/foo
          field: password
          version: 1
          authBackend:
            type: approle
            roleId:
              type: url
              value: 'file:///path/to/role-id'
            secretId:
              type: inline
              value: secret-id
              unwrap: true
      - name: SECOND_PASS
        type: secret
        secretProvider:
          type: Vault
          environment: hashicorp
          vaultServer: 'http://127.0.0.1:8200'
          secretsEngine: kv2
          secretId: secret/bar
          field: data
          version: 1
          authBackend:
            type: approle
            roleId:
              type: url
              value: 'file:///path/to/role-id'
            secretId:
              type: inline
              value: secret-id
    pre_onboard_enabled:
      - name: provision_rest
        type: inline
        commands:
          - /usr/bin/setdb provision.extramb 500
          - /usr/bin/setdb restjavad.useextramb true
    extension_packages:
      install_operations:
        - extensionType: do
          extensionVersion: 1.44.0
        - extensionType: as3
          extensionVersion: 3.51.0
        - extensionType: fast
          extensionVersion: 1.25.0
    extension_services:
      service_operations:
        - extensionType: do
          type: inline
          value:
            schemaVersion: 1.0.0
            class: Device
            async: true
            label: my BIG-IP declaration for declarative onboarding
            Common:
              class: Tenant
              hostname: '{{ HOST_NAME }}.local'
              admin:
                class: User
                userType: regular
                password: '{{ ADMIN_PASS }}'
                shell: bash
              admin2:
                class: User
                userType: regular
                password: '{{ SECOND_PASS.admin2_password }}'
                shell: bash
                partitionAccess:
                  all-partitions:
                    role: admin
              dbvars:
                class: DbVariables
                provision.extramb: 500
                restjavad.useextramb: true

```
