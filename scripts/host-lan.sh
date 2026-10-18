#!/usr/bin/env bash
# Explicitly opt into LAN binding. Room code is read from environment, not args.
set -euo pipefail
cd "$(dirname "$0")/.."
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
if [[ -z "${ROOM_CODE:-}" ]]; then echo 'Set ROOM_CODE to a private room code before hosting.' >&2; exit 1; fi
exec node javascript/server.mjs "$@"
