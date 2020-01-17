#!/bin/bash

MAINDIR="$(dirname $0)/.."
NAME=$(cat ${MAINDIR}/package.json | jq .name -r)

# set permissions
chmod -R 744 scripts/*

# create artifact directory
mkdir -p dist

# install dependencies
npm install --production

# tar and zip
tar -C ${MAINDIR} --exclude=${PWD##*/}/dist -cf dist/${NAME}.tar src node_modules
gzip -nf dist/${NAME}.tar
