#!/bin/bash

MAINDIR="$(dirname $0)/.."
NAME=$(cat ${MAINDIR}/package.json | jq .name -r)
CLOUDS=(azure aws gcp all)
COMMON_DEPENDENCIES=$(cat ${MAINDIR}/package.json | jq -r ".dependencyMap.common")

# delete dist if it exists
rm -r dist/

# set permissions
chmod -R 744 ${MAINDIR}/scripts/*

for cloud in "${CLOUDS[@]}"; do
    # create artifact directory
    mkdir -p dist/${cloud}

    # build cloud-specific package.json
    if [[ ${cloud} == "all" ]]; then
        cp ${MAINDIR}/package.json ${MAINDIR}/environments/${cloud}
    else
        cloud_dependencies=$(cat ${MAINDIR}/package.json | jq -r ".dependencyMap.${cloud}")
        final_dependencies=$(jq --argjson common "${COMMON_DEPENDENCIES}" --argjson cloud "${cloud_dependencies}" -n '$common + $cloud')
        jq --argjson final "${final_dependencies}" '.dependencies = $final' ${MAINDIR}/package.json > ${MAINDIR}/environments/${cloud}/package.json
    fi

    # install cloud-specific dependencies 
    npm install --prefix ${MAINDIR}/environments/${cloud} --production

    # copy src
    cp -r ${MAINDIR}/src ${MAINDIR}/environments/${cloud}

    # tar and zip
    tar -C ${MAINDIR}/environments/${cloud} --exclude=${PWD##*/}/dist -cf dist/${cloud}/${NAME}-${cloud}.tar src node_modules package.json
    gzip -nf dist/${cloud}/${NAME}-${cloud}.tar

    # create sha256 hash
    dir=$(pwd)
    cd dist/${cloud}/
    openssl dgst -sha256 ${NAME}-${cloud}.tar.gz > ${NAME}-${cloud}.tar.gz.sha256
    cd $dir

    # clean up
    rm ${MAINDIR}/environments/${cloud}/package.json
    rm -r ${MAINDIR}/environments/${cloud}/node_modules
    rm -r ${MAINDIR}/environments/${cloud}/src
done

# create sha256 of install.sh
openssl dgst -sha256 scripts/install.sh > dist/install.sh.sha256