#!/bin/bash
# usage: ./link_checker.sh . "exclude_me and_me"

SEARCH_DIR="$1"
EXCLUDE_PATTERNS="$2"

script_location=$(dirname "$0")
link_checker_exec=${script_location}/node_modules/markdown-link-check/markdown-link-check
errors=0

find $SEARCH_DIR -name \*.md | while read LINE; do
    file="${LINE}"
    # ignore certain files that match an exclude pattern
    match=false
    for pattern in ${EXCLUDE_PATTERNS}; do
        if [[ $file =~ $pattern ]]; then
            match=true
        fi
    done
    if $match; then
        continue
    fi
    # now run
    ${link_checker_exec} -q -c ${script_location}/link_checker_config.json "${file}"
    if [ $? -ne 0 ]; then
        errors=$((errors + 1))
    fi
done

if [[ $errors -gt 0 ]]; then
    echo "Link check failed with ${errors} errors, exiting."
    exit 1
else
    echo "Success"
fi
