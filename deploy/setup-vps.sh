#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "== Sumbing Weather Bot VPS setup =="
echo "Application directory: $APP_DIR"

if [[ ! -f ".env" ]]; then
    cp .env.example .env
    echo
    echo "Created .env from .env.example."
    echo "Edit .env and add DISCORD_TOKEN, then run this script again."
    exit 1
fi

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is not installed. Install Node.js 22.12+ (22.22.2 recommended) and run this script again."
    exit 1
fi

if ! node -e '
    const [major, minor] = process.versions.node.split(".").map(Number);
    process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1);
'; then
    echo "Node.js 22.12+ is required. Current version: $(node --version)"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is not installed or is not on PATH."
    exit 1
fi

for key in DISCORD_TOKEN REDIS_URL; do
    if ! grep -Eq "^[[:space:]]*${key}=[^[:space:]]+" .env; then
        echo "Missing ${key} in .env."
        exit 1
    fi
done

if ! command -v redis-cli >/dev/null 2>&1; then
    echo "Warning: redis-cli was not found. Make sure Redis is installed and running before starting the bot."
else
    if ! redis-cli ping >/dev/null 2>&1; then
        echo "Warning: local Redis did not answer to ping. The bot will not start until REDIS_URL is reachable."
    fi
fi

echo "Installing locked dependencies..."
npm ci

echo "Building production JavaScript..."
npm run build

echo "Removing development-only packages..."
npm prune --omit=dev

if ! command -v pm2 >/dev/null 2>&1; then
    echo "PM2 is not installed. Installing it globally..."
    npm install --global pm2
fi

mkdir -p logs
pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save

echo
echo "Bot started with PM2."
echo "Check status: pm2 status"
echo "Follow logs:  pm2 logs sumbing-weather-bot"
echo
echo "To enable restart after VPS reboot, run the command printed by:"
echo "  pm2 startup"