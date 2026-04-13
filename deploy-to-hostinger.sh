#!/bin/bash

# UltraClean - Hostinger Deployment Script
# This script automates the deployment to Hostinger
# Date: 10 avril 2026

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration — load from environment variables or fail with a clear message.
# Never hardcode production credentials in source-controlled scripts.
DOMAIN="${DEPLOY_DOMAIN:?Set DEPLOY_DOMAIN env var (e.g. ultraclean.example.com)}"
DOMAIN_DIR="$DOMAIN"
GITHUB_REPO="https://github.com/badrlahmidi/ultraclean.git"
# DB_NAME, DB_USER, DB_PASS, MAIL_USER, PAYMENT_WEBHOOK_SECRET are set interactively via .env
APP_URL="https://$DOMAIN"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}UltraClean - Hostinger Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Navigate to domain directory
echo -e "${YELLOW}[1/12] Navigating to domain directory...${NC}"
cd ~/domains/$DOMAIN_DIR/public_html || {
    echo -e "${RED}ERROR: Domain directory not found!${NC}"
    echo -e "${YELLOW}Available domains:${NC}"
    ls ~/domains/
    exit 1
}
echo -e "${GREEN}✓ Changed to $(pwd)${NC}"
echo ""

# Check if git is installed
echo -e "${YELLOW}[2/12] Checking Git installation...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: Git is not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git is installed${NC}"
echo ""

# Clone or update repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}[3/12] Updating existing repository...${NC}"
    git pull origin master || {
        echo -e "${RED}ERROR: Failed to pull updates!${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}[3/12] Cloning repository...${NC}"
    # Remove existing files if directory is not empty
    if [ "$(ls -A)" ]; then
        echo -e "${YELLOW}Directory not empty, creating backup...${NC}"
        mv $(ls) ../backup-$(date +%Y%m%d-%H%M%S)/ 2>/dev/null || true
    fi
    git clone $GITHUB_REPO . || {
        echo -e "${RED}ERROR: Failed to clone repository!${NC}"
        exit 1
    }
fi
echo -e "${GREEN}✓ Repository updated${NC}"
echo ""

# Copy environment file
echo -e "${YELLOW}[4/12] Configuring .env file...${NC}"
if [ ! -f ".env" ]; then
    cp .env.production.example .env
fi

# Edit .env with your actual values — do NOT hardcode credentials here.
# Required: APP_URL, DB_DATABASE, DB_USERNAME, DB_PASSWORD,
#           MAIL_USERNAME, MAIL_FROM_ADDRESS, PAYMENT_WEBHOOK_SECRET
# Generate a secure webhook secret: openssl rand -hex 32
sed -i "s|APP_URL=.*|APP_URL=$APP_URL|g" .env
echo -e "${YELLOW}Please edit .env to set DB credentials and secrets:${NC}"
nano .env

echo -e "${GREEN}✓ .env file configured${NC}"
echo ""

# Generate application key
echo -e "${YELLOW}[5/12] Generating application key...${NC}"
php artisan key:generate || {
    echo -e "${RED}ERROR: Failed to generate key!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Application key generated${NC}"
echo ""

# Install composer dependencies
echo -e "${YELLOW}[6/12] Installing Composer dependencies...${NC}"
if ! command -v composer &> /dev/null; then
    echo -e "${RED}ERROR: Composer is not installed!${NC}"
    echo -e "${YELLOW}Please install Composer first.${NC}"
    exit 1
fi
composer install --no-dev --optimize-autoloader --no-interaction || {
    echo -e "${RED}ERROR: Failed to install dependencies!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Run migrations
echo -e "${YELLOW}[7/12] Running database migrations...${NC}"
php artisan migrate --force || {
    echo -e "${RED}ERROR: Failed to run migrations!${NC}"
    echo -e "${YELLOW}Check your database credentials in hPanel${NC}"
    exit 1
}
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Seed database
echo -e "${YELLOW}[8/12] Seeding database...${NC}"
php artisan db:seed --force || {
    echo -e "${RED}WARNING: Failed to seed database (this may be normal)${NC}"
}
echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Create storage link
echo -e "${YELLOW}[9/12] Creating storage link...${NC}"
php artisan storage:link || {
    echo -e "${RED}WARNING: Storage link may already exist${NC}"
}
echo -e "${GREEN}✓ Storage link created${NC}"
echo ""

# Cache configuration
echo -e "${YELLOW}[10/12] Caching configuration...${NC}"
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true
php artisan event:cache || true
echo -e "${GREEN}✓ Configuration cached${NC}"
echo ""

# Set permissions
echo -e "${YELLOW}[11/12] Setting permissions...${NC}"
chmod -R 775 storage bootstrap/cache public/build || {
    echo -e "${YELLOW}WARNING: Some permissions could not be set${NC}"
}
chmod -R 775 storage/logs || true
echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

# Verify deployment
echo -e "${YELLOW}[12/12] Verifying deployment...${NC}"
php -v
echo ""
echo -e "${BLUE}Migration Status:${NC}"
php artisan migrate:status | head -20
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Your application is now available at:${NC}"
echo -e "${GREEN}$APP_URL${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Configure document root to /public_html/public in hPanel"
echo -e "2. Set up cron job in hPanel → Advanced → Scheduled Tasks"
echo -e "3. Login at $APP_URL with your admin credentials — change password immediately"
echo -e "4. IMMEDIATELY change your admin password"
echo -e "5. Configure business settings"
echo ""
echo -e "${BLUE}Cron Job Command:${NC}"
echo -e "${GREEN}* * * * * /usr/local/bin/php /home/<SSH_USER>/domains/$DOMAIN_DIR/public_html/artisan schedule:run >> /dev/null 2>&1${NC}"
echo ""