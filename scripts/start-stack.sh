#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

start_postgres() {
  echo "[stack] Starting PostgreSQL service..."
  sudo service postgresql start
}

push_schema() {
  echo "[stack] Pushing Prisma schema..."
  pnpm --dir "$ROOT_DIR" --filter @latam-payouts/api prisma:push
}

start_workspace() {
  echo "[stack] Starting API and web apps..."
  cd "$ROOT_DIR"
  exec pnpm dev
}

require_command sudo
require_command service
require_command pnpm

if [[ ! -f "$ROOT_DIR/apps/api/.env" ]]; then
  echo "[stack] Warning: apps/api/.env was not found." >&2
fi

start_postgres
push_schema
start_workspace
