# UltraClean - Deployment Helper Script for Windows
# This script generates deployment commands for Hostinger
# Date: 10 avril 2026

# Configuration — load from environment variables or prompt at runtime.
# Never hardcode production credentials in source-controlled files.
$SSH_USER = if ($env:DEPLOY_SSH_USER) { $env:DEPLOY_SSH_USER } else { Read-Host "SSH username" }
$SSH_HOST = if ($env:DEPLOY_SSH_HOST) { $env:DEPLOY_SSH_HOST } else { Read-Host "SSH host/IP" }
$SSH_PORT = if ($env:DEPLOY_SSH_PORT) { $env:DEPLOY_SSH_PORT } else { "65002" }
$DOMAIN = if ($env:DEPLOY_DOMAIN) { $env:DEPLOY_DOMAIN } else { Read-Host "Domain (e.g. ultraclean.example.com)" }

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
Write-Host '  (Enter your SSH password — never share it or store it in scripts)' -ForegroundColor Yellow
Write-Host ''

Write-Host 'Step 3: Navigate to domain directory:' -ForegroundColor White
Write-Host "  cd ~/domains/$DOMAIN/public_html" -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 4: Clone or update repository:' -ForegroundColor White
Write-Host '  git clone https://github.com/badrlahmidi/ultraclean.git .' -ForegroundColor Cyan
Write-Host '  (or if already exists: git pull origin master)' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Step 5: Configure .env file:' -ForegroundColor White
Write-Host '  cp .env.production.example .env' -ForegroundColor Cyan
Write-Host '  # Edit .env manually with your actual values — do NOT hardcode them here.' -ForegroundColor Yellow
Write-Host '  nano .env' -ForegroundColor Cyan
Write-Host '  # Required values to set: APP_URL, DB_DATABASE, DB_USERNAME, DB_PASSWORD,' -ForegroundColor Yellow
Write-Host '  #   MAIL_USERNAME, PAYMENT_WEBHOOK_SECRET (generate with: openssl rand -hex 32)' -ForegroundColor Yellow
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
Write-Host '   Command: * * * * * /usr/local/bin/php /home/<SSH_USER>/domains/<DOMAIN>/public_html/artisan schedule:run >> /dev/null 2>&1' -ForegroundColor Yellow
Write-Host ''

Write-Host '3. Login to your application:' -ForegroundColor White
Write-Host "   URL: https://$DOMAIN" -ForegroundColor Green
Write-Host '   Use the admin credentials you configured in your .env / seeder' -ForegroundColor Cyan
Write-Host '   IMMEDIATELY change your password after first login!' -ForegroundColor Red
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
# Replace <DOMAIN>, and set all credentials in .env manually.
# Never hardcode passwords or secrets in source-controlled scripts.
cd ~/domains/<DOMAIN>/public_html && \
git clone https://github.com/badrlahmidi/ultraclean.git . && \
cp .env.production.example .env && \
nano .env && \
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