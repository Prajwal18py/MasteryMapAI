#!/usr/bin/env bash
set -euo pipefail
python -m pip install --upgrade pip
if [[ "${CLOUD_PROFILE:-full}" == "lite" ]]; then
  python -m pip install --only-binary=:all: -r requirements-cloud-base.txt
else
  python -m pip install --only-binary=:all: torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
  python -m pip install --only-binary=:all: -r requirements-cloud-full.txt
  python -m pip install --only-binary=:all: --no-deps rapidocr-onnxruntime==1.4.4
fi
python -m compileall -q app
