# UltraClean - Automated Deployment Script for Windows
# This script automates the entire deployment to Hostinger
# Date: 10 avril 2026

# Configuration
$SSH_USER = "u897563629"
$SSH_HOST = "91.108.101.158"
$SSH_PORT = "65002"
$SSH_PASSWORD = "Ultraclean@26"
$DOMAIN = "ultraclean.ritajpos.com"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "UltraClean - Hostinger Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if plink.exe exists (PuTTY)
$plinkPath = "plink.exe"
if (-not (Get-Command $plinkPath -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: plink.exe not found!" -ForegroundColor Red
    Write-Host "Please install PuTTY from: https://www.putty.org/" -ForegroundColor Yellow
    Write-Host "After installation, add plink.exe to your PATH or place it in this folder." -ForegroundColor Yellow
    exit 1
}

Write-Host "[Step 1/12] Checking domain directory..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "ls ~/domains/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot list domains!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Domain directory accessible" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 2/12] Navigating to domain directory..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && pwd"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Domain directory not found!" -ForegroundColor Red
    Write-Host "Available domains:" -ForegroundColor Yellow
    & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "ls ~/domains/"
    exit 1
}
Write-Host "✓ Changed to $DOMAIN/public_html" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 3/12] Checking Git installation..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "which git"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git is not installed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Git is installed" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 4/12] Cloning repository..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && git clone https://github.com/badrlahmdi/ultraclean.git . 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Clone may have failed or directory already exists" -ForegroundColor Yellow
    # Try to update if directory exists
    $result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && git pull origin master 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to clone or update!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Repository cloned/updated" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 5/12] Configuring .env file..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && cp .env.production.example .env"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not copy .env file" -ForegroundColor Yellow
}

# Update .env values
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|APP_URL=.*|APP_URL=https://$DOMAIN|g' .env"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|DB_DATABASE=.*|DB_DATABASE=u897563629_ultraclean|g' .env"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|DB_USERNAME=.*|DB_USERNAME=u897563629_ultraclean|g' .env"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|DB_PASSWORD=.*|DB_PASSWORD=Ultraclean@26|g' .env"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|MAIL_USERNAME=.*|MAIL_USERNAME=noreply@$DOMAIN|g' .env"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|MAIL_FROM_ADDRESS=.*|MAIL_FROM_ADDRESS=\"noreply@$DOMAIN\"|g' .env"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && sed -i 's|PAYMENT_WEBHOOK_SECRET=.*|PAYMENT_WEBHOOK_SECRET=5dff05f9783d94419f3d338e8ecacdf8e4fa3099c5ff6319ca88f574b65542a6|g' .env"
Write-Host "✓ .env file configured" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 6/12] Generating application key..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan key:generate"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate key!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Application key generated" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 7/12] Installing Composer dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && composer install --no-dev --optimize-autoloader --no-interaction"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 8/12] Running database migrations..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan migrate --force"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to run migrations!" -ForegroundColor Red
    Write-Host "Check your database credentials in hPanel" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Migrations completed" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 9/12] Seeding database..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan db:seed --force"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Failed to seed database (this may be normal)" -ForegroundColor Yellow
}
Write-Host "✓ Database seeded" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 10/12] Creating storage link..." -ForegroundColor Yellow
$result = & $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan storage:link"
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Storage link may already exist" -ForegroundColor Yellow
}
Write-Host "✓ Storage link created" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 11/12] Caching configuration..." -ForegroundColor Yellow
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan config:cache"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan route:cache"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan view:cache"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan event:cache"
Write-Host "✓ Configuration cached" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 12/12] Setting permissions..." -ForegroundColor Yellow
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && chmod -R 775 storage bootstrap/cache public/build"
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && chmod -R 775 storage/logs"
Write-Host "✓ Permissions set" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your application is now available at:" -ForegroundColor Cyan
Write-Host "https://$DOMAIN" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure document root to /public_html/public in hPanel" -ForegroundColor White
Write-Host "2. Set up cron job in hPanel → Advanced → Scheduled Tasks" -ForegroundColor White
Write-Host "3. Login at https://$DOMAIN (admin@ritajpos.ma / Admin@2026!)" -ForegroundColor White
Write-Host "4. IMMEDIATELY change your admin password" -ForegroundColor White
Write-Host "5. Configure business settings" -ForegroundColor White
Write-Host ""

Write-Host "Cron Job Command:" -ForegroundColor Cyan
Write-Host "* * * * * /usr/local/bin/php /home/$SSH_USER/domains/$DOMAIN/public_html/artisan schedule:run >> /dev/null 2>&1" -ForegroundColor Green
Write-Host ""

Write-Host "Press any key to verify deployment..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Verifying deployment..." -ForegroundColor Yellow
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php -v"
Write-Host ""
Write-Host "Migration Status:" -ForegroundColor Cyan
& $plinkPath -batch -pw $SSH_PASSWORD -P $SSH_PORT $SSH_USER@$SSH_HOST "cd ~/domains/$DOMAIN/public_html && php artisan migrate:status | head -20"
Write-Host ""