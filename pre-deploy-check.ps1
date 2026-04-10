# pre-deploy-check.ps1
# ARCH-PLAN-1.2f — Pre-deployment validation script for RitajPOS (Hostinger)
#
# Usage:
#   .\pre-deploy-check.ps1
#
# Run this script before every FTP/Git deployment to Hostinger.
# It aborts if any critical condition is unmet.

$ErrorActionPreference = "Stop"
$hasErrors = $false

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RitajPOS — Pre-Deploy Validation Check" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ── [1] Verify public/build/manifest.json exists ────────────────────────────
Write-Host "[1/6] Checking Vite build manifest..." -NoNewline
$manifest = "public\build\.vite\manifest.json"
$manifestAlt = "public\build\manifest.json"

if ((Test-Path $manifest) -or (Test-Path $manifestAlt)) {
    $manifestPath = if (Test-Path $manifest) { $manifest } else { $manifestAlt }
    $buildAge = (Get-Date) - (Get-Item $manifestPath).LastWriteTime
    if ($buildAge.TotalMinutes -gt 60) {
        Write-Host " WARNING" -ForegroundColor Yellow
        Write-Warning "  Build is $([int]$buildAge.TotalMinutes) minutes old. Consider running 'npm run build' again."
    }
    else {
        Write-Host " OK (built $([int]$buildAge.TotalMinutes) min ago)" -ForegroundColor Green
    }
}
else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Error "  ABORT: public/build manifest.json not found. Run 'npm run build' first."
    $hasErrors = $true
}

# ── [2] Verify node_modules is NOT staged for commit/upload ────────────────
Write-Host "[2/6] Checking node_modules is excluded..." -NoNewline
if (Test-Path "node_modules") {
    $gitignore = Get-Content ".gitignore" -ErrorAction SilentlyContinue
    if ($gitignore -match "node_modules") {
        Write-Host " OK (in .gitignore)" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Error "  ABORT: node_modules/ exists but is NOT in .gitignore. Add it immediately."
        $hasErrors = $true
    }
}
else {
    Write-Host " OK (not present)" -ForegroundColor Green
}

# ── [3] Verify .env is NOT committed ────────────────────────────────────────
Write-Host "[3/6] Checking .env is not committed..." -NoNewline
$gitIgnoreContent = Get-Content ".gitignore" -ErrorAction SilentlyContinue
if ($gitIgnoreContent -match "^\.env$") {
    Write-Host " OK" -ForegroundColor Green
}
else {
    Write-Host " WARNING" -ForegroundColor Yellow
    Write-Warning "  .env does not appear to be in .gitignore. Verify manually."
}

# ── [4] Verify APP_DEBUG is not 'true' in .env ──────────────────────────────
Write-Host "[4/6] Checking APP_DEBUG is not exposed..." -NoNewline
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "APP_DEBUG=true") {
        Write-Host " WARNING" -ForegroundColor Yellow
        Write-Warning "  APP_DEBUG=true found in .env. Set to false before deploying to production."
    }
    else {
        Write-Host " OK" -ForegroundColor Green
    }
}
else {
    Write-Host " SKIP (.env not found locally)" -ForegroundColor DarkGray
}

# ── [5] Verify composer dependencies are up to date ────────────────────────
Write-Host "[5/6] Checking composer.lock is committed..." -NoNewline
if (Test-Path "composer.lock") {
    Write-Host " OK" -ForegroundColor Green
}
else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Error "  ABORT: composer.lock is missing. Run 'composer install' first."
    $hasErrors = $true
}

# ── [6] Check for pending migrations (local SQLite dev DB) ──────────────────
Write-Host "[6/6] Checking for pending migrations..." -NoNewline
try {
    $migrationStatus = php artisan migrate:status --no-ansi 2>&1
    if ($migrationStatus -match "Pending") {
        Write-Host " WARNING" -ForegroundColor Yellow
        Write-Warning "  There are pending migrations. Run 'php artisan migrate' before deploying."
    }
    else {
        Write-Host " OK" -ForegroundColor Green
    }
}
catch {
    Write-Host " SKIP (artisan unavailable)" -ForegroundColor DarkGray
}

# ── Result ────────────────────────────────────────────────────────────────────
Write-Host ""
if ($hasErrors) {
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT BLOCKED — fix errors above." -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  All checks passed — safe to deploy." -ForegroundColor Green
    Write-Host "  Next steps:" -ForegroundColor Green
    Write-Host "    git push origin master" -ForegroundColor White
    Write-Host "    (then on server) bash deploy.sh" -ForegroundColor White
    Write-Host "=============================================" -ForegroundColor Green
    exit 0
}
