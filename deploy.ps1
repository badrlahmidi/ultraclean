# UltraClean - Deployment Helper Script for Windows
# This script generates deployment commands for Hostinger
# Date: 10 avril 2026

# Configuration
$SSH_USER = "u897563629"
$SSH_HOST = "91.108.101.158"
$SSH_PORT = "65002"
$DOMAIN = "ultraclean.ritajpos.com"

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'UltraClean - Deployment Commands' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Follow these steps to deploy:' -ForegroundColor Yellow
Write-Host ''

Write-Host 'Step 1: Open PowerShell or Command Prompt' -ForegroundColor White
Write-Host ''

Write-Host 'Step 2: Connect to Hostinger SSH:' -ForegroundColor White
Write-Host "  ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST}" -ForegroundColor Cyan
Write-Host '  (Enter password: Ultraclean@26)' -ForegroundColor Yellow
Write-Host ''

Write-Host 'Step 3: Navigate to domain directory:' -ForegroundColor White
Write-Host '  cd ~/domains/ultraclean.ritajpos.com/public_html' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 4: Clone or update repository:' -ForegroundColor White
Write-Host '  git clone https://github.com/badrlahmdi/ultraclean.git .' -ForegroundColor Cyan
Write-Host '  (or if already exists: git pull origin master)' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 5: Configure .env file:' -ForegroundColor White
Write-Host '  cp .env.production.example .env' -ForegroundColor Cyan
Write-Host '  sed -i "s|APP_URL=.*|APP_URL=https://ultraclean.ritajpos.com|g" .env' -ForegroundColor Cyan
Write-Host '  sed -i "s|DB_DATABASE=.*|DB_DATABASE=u897563629_ultraclean|g" .env' -ForegroundColor Cyan
Write-Host '  sed -i "s|DB_USERNAME=.*|DB_USERNAME=u897563629_ultraclean|g" .env' -ForegroundColor Cyan
Write-Host '  sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=Ultraclean@26|g" .env' -ForegroundColor Cyan
Write-Host '  sed -i "s|MAIL_USERNAME=.*|MAIL_USERNAME=noreply@ultraclean.ritajpos.com|g" .env' -ForegroundColor Cyan
Write-Host '  sed -i "s|PAYMENT_WEBHOOK_SECRET=.*|PAYMENT_WEBHOOK_SECRET=5dff05f9783d94419f3d338e8ecacdf8e4fa3099c5ff6319ca88f574b65542a6|g" .env' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 6: Generate application key:' -ForegroundColor White
Write-Host '  php artisan key:generate' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 7: Install dependencies:' -ForegroundColor White
Write-Host '  composer install --no-dev --optimize-autoloader --no-interaction' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 8: Run migrations:' -ForegroundColor White
Write-Host '  php artisan migrate --force' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 9: Seed database:' -ForegroundColor White
Write-Host '  php artisan db:seed --force' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 10: Create storage link:' -ForegroundColor White
Write-Host '  php artisan storage:link' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 11: Cache configuration:' -ForegroundColor White
Write-Host '  php artisan config:cache' -ForegroundColor Cyan
Write-Host '  php artisan route:cache' -ForegroundColor Cyan
Write-Host '  php artisan view:cache' -ForegroundColor Cyan
Write-Host '  php artisan event:cache' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 12: Set permissions:' -ForegroundColor White
Write-Host '  chmod -R 775 storage bootstrap/cache public/build' -ForegroundColor Cyan
Write-Host '  chmod -R 775 storage/logs' -ForegroundColor Cyan
Write-Host ''

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'AFTER DEPLOYMENT:' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '1. Configure document root in hPanel:' -ForegroundColor White
Write-Host '   Go to: Domains → ultraclean.ritajpos.com' -ForegroundColor Cyan
Write-Host '   Change folder to: /public_html/public' -ForegroundColor Yellow
Write-Host ''

Write-Host '2. Set up cron job in hPanel:' -ForegroundColor White
Write-Host '   Go to: Advanced → Scheduled Tasks' -ForegroundColor Cyan
Write-Host '   Command: * * * * * /usr/local/bin/php /home/u897563629/domains/ultraclean.ritajpos.com/public_html/artisan schedule:run >> /dev/null 2>&1' -ForegroundColor Yellow
Write-Host ''

Write-Host '3. Login to your application:' -ForegroundColor White
Write-Host "   URL: https://$DOMAIN" -ForegroundColor Green
Write-Host '   Email: admin@ritajpos.ma' -ForegroundColor Cyan
Write-Host '   Password: Admin@2026!' -ForegroundColor Cyan
Write-Host '   PIN: 1234' -ForegroundColor Cyan
Write-Host ''

Write-Host '4. IMMEDIATELY change your password!' -ForegroundColor Red
Write-Host ''

Write-Host '5. Configure business settings' -ForegroundColor White
Write-Host ''

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Quick Command Reference' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Copy and paste this entire block after connecting to SSH:' -ForegroundColor Yellow
Write-Host ''

$quickCommands = @"
cd ~/domains/ultraclean.ritajpos.com/public_html && \
git clone https://github.com/badrlahmdi/ultraclean.git . && \
cp .env.production.example .env && \
sed -i "s|APP_URL=.*|APP_URL=https://ultraclean.ritajpos.com|g" .env && \
sed -i "s|DB_DATABASE=.*|DB_DATABASE=u897563629_ultraclean|g" .env && \
sed -i "s|DB_USERNAME=.*|DB_USERNAME=u897563629_ultraclean|g" .env && \
sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=Ultraclean@26|g" .env && \
sed -i "s|MAIL_USERNAME=.*|MAIL_USERNAME=noreply@ultraclean.ritajpos.com|g" .env && \
sed -i "s|PAYMENT_WEBHOOK_SECRET=.*|PAYMENT_WEBHOOK_SECRET=5dff05f9783d94419f3d338e8ecacdf8e4fa3099c5ff6319ca88f574b65542a6|g" .env && \
php artisan key:generate && \
composer install --no-dev --optimize-autoloader --no-interaction && \
php artisan migrate --force && \
php artisan db:seed --force && \
php artisan storage:link && \
php artisan config:cache && \
php artisan route:cache && \
php artisan view:cache && \
php artisan event:cache && \
chmod -R 775 storage bootstrap/cache public/build && \
chmod -R 775 storage/logs
"@

Write-Host $quickCommands -ForegroundColor Green
Write-Host ''

Write-Host 'Commands copied to clipboard!' -ForegroundColor Green
Set-Clipboard -Value $quickCommands
Write-Host ''

Write-Host 'Press any key to exit...' -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")