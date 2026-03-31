#!/usr/bin/env bash
##############################################################################
# UltraClean — Deploy Script for Hostinger (Linux VPS / shared SSH)
#
# Usage (first deploy):
#   1. Upload project via Git or SFTP to ~/domains/ultraclean.ma/public_html/
#   2. Copy .env.production to .env and fill in all values
#   3. chmod +x deploy.sh && bash deploy.sh --fresh
#
# Usage (update):
#   bash deploy.sh
##############################################################################

set -e  # Exit immediately on error

# ─── Configuration ───────────────────────────────────────────────────────────
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP="${PHP_BIN:-php}"           # override: PHP_BIN=/usr/local/php83/bin/php
COMPOSER="${COMPOSER_BIN:-composer}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   UltraClean — Deployment $(date '+%Y-%m-%d %H:%M')   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

cd "$APP_DIR"

# ─── 1. Pull latest code ─────────────────────────────────────────────────────
echo "▶ [1/8] Git pull..."
git pull origin master

# ─── 2. Composer dependencies ────────────────────────────────────────────────
echo "▶ [2/8] Composer install (no-dev, optimized)..."
$COMPOSER install --no-dev --optimize-autoloader --no-interaction

# ─── 3. Maintenance mode ON ──────────────────────────────────────────────────
echo "▶ [3/8] Enabling maintenance mode..."
$PHP artisan down --retry=10 --secret="ultraclean-bypass-$(date +%s | tail -c 6)"

# ─── 4. Run migrations ───────────────────────────────────────────────────────
echo "▶ [4/8] Running migrations..."
$PHP artisan migrate --force

# ─── 5. Build frontend assets ────────────────────────────────────────────────
echo "▶ [5/8] Building frontend assets..."
if command -v npm &>/dev/null; then
    npm ci --prefer-offline
    npm run build
else
    echo "  ⚠ npm not found — skipping frontend build (upload pre-built /public/build/)"
fi

# ─── 6. Clear & rebuild caches ───────────────────────────────────────────────
echo "▶ [6/8] Caching config / routes / views..."
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan view:cache
$PHP artisan event:cache

# ─── 7. Storage link ─────────────────────────────────────────────────────────
echo "▶ [7/8] Storage link..."
$PHP artisan storage:link --force 2>/dev/null || true

# ─── 8. Maintenance mode OFF ─────────────────────────────────────────────────
echo "▶ [8/8] Disabling maintenance mode..."
$PHP artisan up

echo ""
echo "✅  Deployment complete — $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ─── Optional: restart queue worker (if supervisor is configured) ────────────
# Uncomment if you have a VPS with supervisor:
# echo "▶ Restarting queue workers..."
# $PHP artisan queue:restart
