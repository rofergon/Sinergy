#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
api_dir="$repo_root/apps/api"
log_path="$repo_root/.logs/api-localnet.log"

mkdir -p "$repo_root/.logs"

cd "$api_dir"
set -a
source ./.env
source ./.env.localnet
set +a

node dist/main.js >"$log_path" 2>&1 &
app_pid=$!

cleanup() {
  kill "$app_pid" >/dev/null 2>&1 || true
  wait "$app_pid" >/dev/null 2>&1 || true
}

trap cleanup EXIT

for _ in $(seq 1 30); do
  if (echo > /dev/tcp/127.0.0.1/4000) >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

node ./scripts/smoke-localnet.mjs
