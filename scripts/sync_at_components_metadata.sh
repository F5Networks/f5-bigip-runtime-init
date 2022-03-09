#!/usr/bin/env bash

# This script is intended to update all AT Components defined under the followings:
#       1. Toolchain config file src/lib/bigip/toolchain/toolchain_metadata.json
#       2. Config examples
#       3. Test plans

echo "***** Phase 1. Fetching most recent AT Components metadata from the following location https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json"
remote_toolChain_metadata=$(curl --retry 3 --retry-max-time 15 --max-time 5 --location https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json | yq .)

update_config_file()
{
    file_path=$1
    extension_type=$2
    latest_version=$3

    echo ">>>> Discovered outdated version. Preparing for updates..."
    echo ">>>> Extension Type: $extension_type"
    echo ">>>> Latest available version: $latest_version"
    index=$(cat $file_path | yq ".extension_packages.install_operations | map (.extensionType == $extension_type) | index(true)")
    currentExtUrl=$(cat $file_path | yq ".extension_packages.install_operations[$index].extensionUrl" | tr -d '"')
    currExtensionVersion=$(cat $file_path | yq ".extension_packages.install_operations[$index].extensionVersion")
    currExtensionHash=$(cat $file_path | yq ".extension_packages.install_operations[$index].extensionHash")
    echo ">>>> Generating hash value for latest version"
    downloadUrl=$(echo $remote_toolChain_metadata | yq " .components.$extension_type.versions.$latest_version.downloadUrl" | tr -d '"')
    extensionHash=$(curl --retry 3 --retry-max-time 15 --max-time 5 -L -s $downloadUrl | shasum -a 256 | tr -d ' -')
    echo ">>>> Gathering packageName"
    packageName=$(echo $remote_toolChain_metadata | yq " .components.$extension_type.versions.$latest_version.packageName" | tr -d '"')
    echo ">>>> Updating extensionVersion"
    if [[ $filename == *".json"* ]]; then
        yq ".extension_packages.install_operations[$index].extensionVersion = $latest_version" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
        if [[ $currExtensionHash != "null" ]]; then
            echo ">>>> Updating extensionHash"
            yq ".extension_packages.install_operations[$index].extensionHash = \"$extensionHash\"" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
        fi
        if [[ $ccurrentExtUrl != "null" ]]; then
            echo ">>>> Updating extensionUrl"
            if [[ $currentExtUrl == "file://"* ]]; then
                newExtensionUrl=${currentExtUrl%/*}/${downloadUrl##*/}
                yq ".extension_packages.install_operations[$index].extensionUrl = \"$newExtensionUrl\"" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
            else
                yq ".extension_packages.install_operations[$index].extensionUrl = \"$downloadUrl\"" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
            fi
        fi
    elif [[ $filename == *".yaml"* ]]; then
        yq -Y ".extension_packages.install_operations[$index].extensionVersion = $latest_version" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
        if [[ $currExtensionHash != "null" ]]; then
            echo ">>>> Updating extensionHash"
            yq -Y ".extension_packages.install_operations[$index].extensionHash = \"$extensionHash\"" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
        fi
        if [[ $currentExtUrl != "null" ]]; then
            echo ">>>> Updating extensionUrl"
            if [[ $currentExtUrl == "file://"* ]]; then
                newExtensionUrl=${currentExtUrl%/*}/${downloadUrl##*/}
                yq ".extension_packages.install_operations[$index].extensionUrl = \"$newExtensionUrl\"" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
            else
                yq ".extension_packages.install_operations[$index].extensionUrl = \"$downloadUrl\"" $file_path > tempFile.$$.json && mv tempFile.$$.json $file_path
            fi
        fi
    fi
}

echo "***** Phase 2. Discovering the latest available versions for AT Components"
component_version_map=()
component_names=$(echo $remote_toolChain_metadata | yq '.components | keys | .[]')
for name in ${component_names[@]}; do
    version_metadata=$(echo $remote_toolChain_metadata | yq " .components.$name.versions | to_entries | .[].value | select(.latest == true)")
    packageName=$(echo $version_metadata | yq '.packageName')
    version="";
    versions=$(echo $remote_toolChain_metadata | yq " .components.$name.versions | to_entries | .[].key")
    for item in ${versions[@]}; do
        trimmedVersion=$(echo $item | tr -d '"')
        if [[ $packageName == *$trimmedVersion* ]]; then
            version=$item
        fi
    done
    if [[ ! -z $version ]];then
        component_version_map+=($name:$version)
    fi
done

echo ">>>>> Generated package to latest version map: ${component_version_map[@]}"

echo "***** Phase 3. Syncing local config to match remote"
echo $remote_toolChain_metadata | yq . > src/lib/bigip/toolchain/toolchain_metadata.json

echo "***** Phase 4. Syncing all config examples to use lastest version"
config_files=$(ls examples/runtime_configs/)
for filename in $config_files; do
    echo ">>>> Processing file: examples/runtime_configs/$filename"
    isRuntimeConfig=$(cat examples/runtime_configs/$filename | yq ".extension_packages.install_operations")
    if [[ "$isRuntimeConfig" != "null" ]]; then
        for item in ${component_version_map[@]}; do
            latestVersion=${item##*:}
            extensionType=${item%:*}
            currUsedVersion=$(cat examples/runtime_configs/$filename | yq ".extension_packages.install_operations[] | select (.extensionType == $extensionType) | .extensionVersion")
            if [[ ! -z $currUsedVersion ]]; then
                if [[ $currUsedVersion != $latestVersion ]]; then
                    update_config_file "examples/runtime_configs/$filename" $extensionType $latestVersion
                fi
            fi
        done
    else
        echo ">>>>> WARNING: Found config file without install_operations defined  - ${filename}"
    fi
done

config_files=$(ls examples/runtime_configs/snippets/)
for filename in $config_files; do
    echo ">>>> Processing file: examples/runtime_configs/snippets/$filename"
    isRuntimeConfig=$(cat examples/runtime_configs/snippets/$filename | yq ".extension_packages.install_operations")
    if [[ "$isRuntimeConfig" != "null" ]]; then
        for item in ${component_version_map[@]}; do
            latestVersion=${item##*:}
            extensionType=${item%:*}
            currUsedVersion=$(cat examples/runtime_configs/snippets/$filename | yq ".extension_packages.install_operations[] | select (.extensionType == $extensionType) | .extensionVersion")
            if [[ ! -z $currUsedVersion ]]; then
                if [[ $currUsedVersion != $latestVersion ]]; then
                    update_config_file "examples/runtime_configs/snippets/$filename" $extensionType $latestVersion
                fi
            fi
        done
    else
        echo ">>>>> WARNING: Found config file without install_operations defined  - ${filename}"
    fi
done

config_files=$(ls scripts/config/)
for filename in $config_files; do
    echo ">>>> Processing file: scripts/config/$filename"
    isRuntimeConfig=$(cat scripts/config/$filename | yq ".extension_packages.install_operations")
    if [[ "$isRuntimeConfig" != "null" ]]; then
        for item in ${component_version_map[@]}; do
            latestVersion=${item##*:}
            extensionType=${item%:*}
            currUsedVersion=$(cat scripts/config/$filename | yq ".extension_packages.install_operations[] | select (.extensionType == $extensionType) | .extensionVersion")
            if [[ ! -z $currUsedVersion ]]; then
                if [[ $currUsedVersion != $latestVersion ]]; then
                    update_config_file "scripts/config/$filename" $extensionType $latestVersion
                fi
            fi
        done
    else
        echo ">>>>> WARNING: Found config file without install_operations defined  - ${filename}"
    fi
done


echo "***** Phase 5. Checking all configs used by functional tests"
SUPPORTED_CLOUDS=(aws azure gcp base)

for cloud in ${SUPPORTED_CLOUDS[@]}; do
    echo ">>>>> Verifying user-data used for $cloud functional tests"
    grep "\-\-\-" plans/${cloud}/user_data.tpl -A 150 > temp_$cloud.yaml
    for item in ${component_version_map[@]}; do
        latestVersion=${item##*:}
        extensionType=${item%:*}
        currUsedVersion=$(cat temp_$cloud.yaml | yq ".extension_packages.install_operations[] | select (.extensionType == $extensionType) | .extensionVersion")
        if [[ ! -z $currUsedVersion ]]; then
          if [[ $currUsedVersion != $latestVersion ]]; then
                echo ">>>> WARNING: Update user-data, used for $cloud functional tests, with new version ($latestVersion) of AT Component: $extensionType"
                touch $cloud.update
          fi
        fi
    done
    rm temp_$cloud.yaml
done






