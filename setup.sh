#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3.12 -m venv .venv
.venv/bin/python scripts/check_env.py
export PIP_CACHE_DIR="$PWD/.cache/pip"
export HF_HOME="$PWD/.cache/huggingface"
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install --only-binary=:all: torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
.venv/bin/python -m pip install --only-binary=:all: -r backend/requirements.txt
(cd backend && ../.venv/bin/python -m ml.train --synthetic --output models/demo)
.venv/bin/python scripts/init_env.py
(cd frontend && npm ci --no-audit --no-fund)
.venv/bin/python scripts/download_models.py || echo "Lexical retrieval remains available. Retry semantic download later."
echo "Run .venv/bin/python scripts/run.py"
