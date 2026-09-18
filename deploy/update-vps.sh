#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [[ ! -f ".env" ]]; then
    echo ".env is missing. Copy .env.example to .env and configure it first."
    exit 1
fi

echo "Installing locked dependencies..."
npm ci

echo "Building production JavaScript..."
npm run build

echo "Removing development-only packages..."
npm prune --omit=dev

mkdir -p logs
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save

echo "Update complete."