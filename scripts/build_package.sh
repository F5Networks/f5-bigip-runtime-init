#!/bin/bash

MAINDIR="$(dirname $0)/.."
NAME=$(cat ${MAINDIR}/package.json | jq .name -r)
CLOUDS=(azure aws gcp all)
COMMON_DEPENDENCIES=$(cat ${MAINDIR}/package.json | jq -r ".dependencyMap.common")
VERSION=$(cat ${MAINDIR}/package.json | jq -r ".version")
RELEASE=$(cat ${MAINDIR}/package.json | jq -r ".release")

echo "*** Clean up dist/ directory"
rm -r dist/
echo "*** Generate JS code using tsc command"
tsc

echo "*** Set persmissions on scripts"
chmod -R 744 ${MAINDIR}/scripts/*

echo "*** Create dist/rpms directory"
mkdir -p dist/rpms
for cloud in "${CLOUDS[@]}"; do
    echo "*** Create ${cloud} artifact directory"
    mkdir -p dist/${cloud}/rpmbuild
    mkdir -p dist/working/${cloud}

    echo "*** Build cloud-specific package.json"
    if [[ ${cloud} == "all" ]]; then
        cp ${MAINDIR}/dist/package.json ${MAINDIR}/dist/working/${cloud}
    else
        cloud_dependencies=$(cat ${MAINDIR}/dist/package.json | jq -r ".dependencyMap.${cloud}")
        final_dependencies=$(jq --argjson common "${COMMON_DEPENDENCIES}" --argjson cloud "${cloud_dependencies}" -n '$common + $cloud')
        jq --argjson final "${final_dependencies}" '.dependencies = $final' ${MAINDIR}/dist/package.json > ${MAINDIR}/dist/working/${cloud}/package.json
    fi

    echo "*** Install cloud-specific dependencies"
    npm install --prefix ${MAINDIR}/dist/working/${cloud} --production

    echo "*** Copy source code to working"
    cp -r ${MAINDIR}/dist/src ${MAINDIR}/dist/working/${cloud}

    echo "*** Generate RPM Package"
    rpmbuild --quiet -bb \
       --define "main $(pwd)" \
       --define "_topdir %{main}/dist/${cloud}/rpmbuild" \
       --define "_name ${NAME}-${cloud}" \
       --define "_version ${VERSION}" \
       --define "_release ${RELEASE}" \
       --define "cloud ${cloud}" \
       f5-bigip-runtime-init.spec
    OUTPUT=$(ls -t dist/${cloud}/rpmbuild/RPMS/noarch/*.rpm 2>/dev/null | head -1)
    cp ${OUTPUT} ${MAINDIR}/dist/${cloud}
    echo "*** Built RPM: ${OUTPUT##*/}"

    echo "*** Sign package titled as ${NAME}-${cloud}-${VERSION}-${RELEASE}.noarch.rpm"
    curl -sk -X POST -H "Authorization: Bearer $CM_SIGNER_ACCESS_TOKEN" -F "file=@dist/${cloud}/${NAME}-${cloud}-${VERSION}-${RELEASE}.noarch.rpm" -o "dist/rpms/${NAME}-${cloud}-${VERSION}-${RELEASE}-signed.noarch.rpm" "https://${RPM_SIGNER}/api/v1/sign/rpm"
    echo "*** Set execution permission ${NAME}-${cloud}-${VERSION}-${RELEASE}-signed.noarch.rpm"
    chmod +x dist/rpms/${NAME}-${cloud}-${VERSION}-${RELEASE}-signed.noarch.rpm
    echo "*** Completed signing packge. Deleting original package: ${NAME}-${cloud}-${VERSION}-${RELEASE}.noarch.rpm"
    rm dist/${cloud}/${NAME}-${cloud}-${VERSION}-${RELEASE}.noarch.rpm

    echo "*** Validate signed RPM Package"
    rpm -qipvv dist/rpms/${NAME}-${cloud}-${VERSION}-${RELEASE}-signed.noarch.rpm
    if [[ $? -ne 0 ]]; then
        echo "Couldn't validate the signed RPM package"
    fi
    echo "*** Finished validating signed RPM Package"

    echo "*** Create SHA-256 file"
    cd dist/rpms/
    sha256sum ${NAME}-${cloud}-${VERSION}-${RELEASE}-signed.noarch.rpm > ${NAME}-${cloud}-${VERSION}-${RELEASE}-signed.noarch.rpm.sha256
    cd ../..
    echo "*** Created SHA-256 checksum files"

    echo "*** Cleanup for ${cloud} cloud ..."
    rm -r dist/${cloud}
    rm -r dist/working/${cloud}
done

echo "*** Remove working files from dist/"
rm -r dist/working
rm -r dist/src
rm -r dist/package.json

echo "*** Start creating makeself package"
echo "*** Copy over install script"
cp ${MAINDIR}/scripts/install_rpm.sh ${MAINDIR}/dist/rpms
echo "*** Set permissions on install script to allow exectuon"
chmod +x ${MAINDIR}/dist/rpms/install_rpm.sh
echo "*** Generate makeself package"
${MAINDIR}/scripts/makeself.sh ${MAINDIR}/dist/rpms dist/${NAME}-${VERSION}-${RELEASE}.gz.run "F5 BIGIP Runtime Init installation" ./install_rpm.sh
