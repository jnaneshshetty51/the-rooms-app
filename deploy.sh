#!/usr/bin/env bash
# deploy.sh — deploy The Rooms to Hostinger VPS
# Usage: ./deploy.sh [user@host]
# Example: ./deploy.sh root@123.45.67.89

set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────
VPS="${1:-root@YOUR_VPS_IP}"       # override via first arg or edit here
REMOTE_DIR="/opt/therooms"
BRANCH="main"

echo "==> Deploying to $VPS:$REMOTE_DIR (branch: $BRANCH)"

ssh "$VPS" bash -s << EOF
set -euo pipefail

cd "$REMOTE_DIR"

echo "--- Pulling latest code ---"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo "--- Installing dependencies ---"
pnpm install --frozen-lockfile

echo "--- Building all apps ---"
pnpm build

echo "--- Running database migrations ---"
pnpm db:migrate

echo "--- Reloading PM2 ---"
pm2 reload ecosystem.config.js --update-env

echo "--- PM2 status ---"
pm2 status

echo "==> Deploy complete!"
EOF
