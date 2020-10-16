# BIGIP Runtime Init Makefile

CUR_DIR := $(cwd)
PROJECT_DIR := .
LINK_CHECK_DIR := ./scripts/link_checker

.PHONY: help
help:
	@echo "Check MakeFile"

link_check:
	echo "Running link checker against all markdown files";
	cd ${LINK_CHECK_DIR} && npm install && cd ${CUR_DIR};
	${LINK_CHECK_DIR}/link_checker.sh ${PROJECT_DIR} "tests scripts node_modules"
