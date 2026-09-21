#!/usr/bin/env bash
# Idempotent repository bootstrap for MyStake (Phase 0 monorepo).
# Installs JS workspace deps and the Python API virtualenv.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "==> Installing JS workspace dependencies (pnpm)"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "==> Setting up Python API virtualenv (apps/api/.venv)"
cd "$repo_root/apps/api"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements-dev.txt

echo "==> Install complete"
