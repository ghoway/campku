#!/usr/bin/env bash
set -euo pipefail

BACKEND_PID=""
ADMIN_PID=""

cleanup() {
    [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" || true
    [[ -n "$ADMIN_PID" ]] && kill "$ADMIN_PID" || true
}

trap cleanup EXIT INT TERM

(cd backend && bun --watch src/server.ts) &
BACKEND_PID=$!
echo "Backend => http://localhost:8080 (bun --watch)"
(cd apps/admin && bun run dev) &
ADMIN_PID=$!
echo "Admin => http://localhost:3000 (bun run dev)"

echo "All services are running. Press Ctrl+C to stop."
wait