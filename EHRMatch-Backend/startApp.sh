#!/usr/bin/env bash

cd $(dirname "$0")
BACKEND_DIR=$(pwd)

if [ -z $FRONTEND_DIR ]; then
	read -p "Enter absolute path to frontend repository: " FRONTEND_DIR
fi

if [ -z $_CONDA_ROOT ]; then
	read -p "Enter anaconda root directory: " _CONDA_ROOT
fi

if [ -z $FRONTEND_LOG ]; then
	FRONTEND_LOG="/dev/null"
fi

cd "${BACKEND_DIR}"
. ${_CONDA_ROOT}/etc/profile.d/conda.sh
conda activate ehrmatch
python app.py &

cd "${FRONTEND_DIR}"
ng serve --open > ${FRONTEND_LOG} 2>&1 &

exit

