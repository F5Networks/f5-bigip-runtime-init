#!/bin/bash -x

LOG_FILE="/var/log/cloud/bigIpRuntimeInit.log"
SUCCESS_STRING="All operations finished successfully"
RETRIES=120
SLEEP_TIME=10

for (( i=0; i<=$RETRIES; i++ )); do
    if [[ -f "${LOG_FILE}" ]]  && egrep "${SUCCESS_STRING}" "${LOG_FILE}"; then
      echo 'Onboard Complete' > /var/tmp/ONBOARD_COMPLETE
      break
    else
      echo "Waiting for onboard complete. sleeping ${SLEEP_TIME} seconds"
      sleep ${SLEEP_TIME}
    fi
done

if [[ -f "/var/tmp/ONBOARD_COMPLETE" ]]; then
  echo 'Onboard Complete'
else
  echo 'Onboard Failed'
  exit 1
fi