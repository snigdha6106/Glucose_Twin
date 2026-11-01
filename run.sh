#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "================================================================="
echo "  DIABETES DIGITAL TWIN PLATFORM (Biomedical AI Research Engine) "
echo "================================================================="

# Check virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment with Python 3.11..."
    python3.11 -m venv .venv || python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r backend/requirements.txt
fi

export PYTHONPATH="$DIR/backend"
export MPLCONFIGDIR="$DIR/.mplcache"
export KMP_DUPLICATE_LIB_OK=TRUE
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1
mkdir -p "$DIR/.mplcache"

PORT=8000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Port $PORT is currently in use. Attempting to free previous instance..."
    OLD_PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
    kill -9 $OLD_PID 2>/dev/null || true
    sleep 1
fi

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT=8001
    echo "Port 8000 still occupied; switching to port $PORT..."
fi

echo ""
echo "Starting unified FastAPI application on http://127.0.0.1:$PORT ..."
echo "API Docs available at: http://127.0.0.1:$PORT/docs"
echo "Interactive Dashboard: http://127.0.0.1:$PORT/"
echo ""
echo "Press Ctrl+C to stop the server."
echo "================================================================="

exec .venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port $PORT
