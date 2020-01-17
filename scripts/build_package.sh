#!/bin/bash

MAINDIR="$(dirname $0)/.."
NAME=$(cat ${MAINDIR}/package.json | jq .name -r)

# set permissions
chmod -R 744 scripts/*

# tar and zip
tar -C ${MAINDIR} --exclude=${PWD##*/}/dist -cf dist/${NAME}.tar src
gzip -nf dist/${NAME}.tar
