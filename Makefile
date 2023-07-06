# BIGIP Runtime Init Makefile

CUR_DIR := $(cwd)
PROJECT_DIR := .
LINK_CHECK_DIR := ./scripts/link_checker
METADATA_DIR := ./scripts/metadata
EXTENSION_METADATA_FILE := metadata.json

.PHONY: help
help:
	@echo "Check MakeFile"

link_check:
	echo "Running link checker against all markdown files";
	cd ${LINK_CHECK_DIR} && npm install && cd ${CUR_DIR};
	${LINK_CHECK_DIR}/link_checker.sh ${PROJECT_DIR} "tests scripts node_modules"

generate_extension_metadata:
	cd ${METADATA_DIR} && pip install -r requirements.txt && python3 generate_metadata.py && cd ${CUR_DIR};
	cp ${METADATA_DIR}/${EXTENSION_METADATA_FILE} ${PROJECT_DIR}/src/lib/bigip/toolchain/toolchain_metadata.json