# pre-deploy-check.ps1
$ErrorActionPreference = "Stop"
$hasErrors = $false

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RitajPOS - Pre-Deploy Validation Check" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# [1] Vite Manifest
Write-Host "[1/6] Checking Vite build manifest..." -NoNewline
$manifest = "public\build\.vite\manifest.json"
$manifestAlt = "public\build\manifest.json"

if ((Test-Path $manifest) -or (Test-Path $manifestAlt)) {
    $path = if (Test-Path $manifest) { $manifest } else { $manifestAlt }
    $age = (Get-Date) - (Get-Item $path).LastWriteTime
    if ($age.TotalMinutes -gt 60) {
        Write-Host " WARNING" -ForegroundColor Yellow
        Write-Warning " Build is $([int]$age.TotalMinutes) min old. Run 'npm run build'."
    }
    else {
        Write-Host " OK" -ForegroundColor Green
    }
}
else {
    Write-Host " FAIL" -ForegroundColor Red
    $hasErrors = $true
}

# [2] node_modules
Write-Host "[2/6] Checking node_modules exclusion..." -NoNewline
if (Test-Path "node_modules") {
    $ignore = Get-Content ".gitignore" -ErrorAction SilentlyContinue
    if ($ignore -match "node_modules") { Write-Host " OK" -ForegroundColor Green }
    else { Write-Host " FAIL (Add to gitignore)"; $hasErrors = $true }
}
else { Write-Host " OK" -ForegroundColor Green }

# [3] .env exclusion
Write-Host "[3/6] Checking .env exclusion..." -NoNewline
if ((Get-Content ".gitignore" -ErrorAction SilentlyContinue) -match "^\.env$") {
    Write-Host " OK" -ForegroundColor Green
}
else { Write-Host " WARNING" -ForegroundColor Yellow }

# [4] APP_DEBUG
Write-Host "[4/6] Checking APP_DEBUG..." -NoNewline
if (Test-Path ".env") {
    if ((Get-Content ".env" -Raw) -match "APP_DEBUG=true") {
        Write-Host " WARNING" -ForegroundColor Yellow
    }
    else { Write-Host " OK" -ForegroundColor Green }
}
else { Write-Host " SKIP" -ForegroundColor DarkGray }

# [5] Composer
Write-Host "[5/6] Checking composer.lock..." -NoNewline
if (Test-Path "composer.lock") { Write-Host " OK" -ForegroundColor Green }
else { Write-Host " FAIL"; $hasErrors = $true }

# [6] Migrations
Write-Host "[6/6] Checking migrations..." -NoNewline
try {
    if ((php artisan migrate:status --no-ansi 2>&1) -match "Pending") {
        Write-Host " WARNING" -ForegroundColor Yellow
    }
    else { Write-Host " OK" -ForegroundColor Green }
}
catch { Write-Host " SKIP" -ForegroundColor DarkGray }

Write-Host ""
if ($hasErrors) {
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT BLOCKED" -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "  All checks passed - Safe to deploy." -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    exit 0
}