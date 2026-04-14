# 🚀 UltraClean - Hostinger Deployment Commands

**Your SSH Connection:**
```bash
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

**Last Updated:** 10 avril 2026

---

## 📋 Step-by-Step Deployment Guide

### Step 1: Connect to Hostinger via SSH

```bash
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

**Password:** Enter your Hostinger password when prompted

---

### Step 2: Navigate to Domain Directory

Replace `your-domain.ma` with your actual domain:

```bash
cd ~/domains/your-domain.ma/public_html
```

**To find your domain directory:**
```bash
ls ~/domains/
```

---

### Step 3: Clone or Update Repository

#### Option A: Fresh Installation (First Time)

**If repository is PUBLIC (no authentication needed):**

```bash
# Clone the repository
git clone https://github.com/badrlahmdi/ultraclean.git .

# Verify clone was successful
git status
```

**If repository is PRIVATE or authentication fails, use one of these methods:**

**Method 1: Use SSH (Recommended for private repos):**

First, generate SSH key on Hostinger:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter for all defaults
cat ~/.ssh/id_ed25519.pub
```

Copy the output, then:
1. Go to: https://github.com/settings/ssh/new
2. Paste the SSH key
3. Add title: "Hostinger Server"
4. Click "Add SSH key"

Then clone using SSH:
```bash
git clone git@github.com:badrlahmdi/ultraclean.git .
```

**Method 2: Use Personal Access Token (if SSH not available):**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Select scopes: `repo` (for private repos)
4. Generate token and copy it

Then clone using token:
```bash
git clone https://YOUR_TOKEN@github.com/badrlahmdi/ultraclean.git .
```

Replace `YOUR_TOKEN` with your actual personal access token.

**Method 3: Configure Git credentials (not recommended):**

```bash
git config --global credential.helper store
git clone https://github.com/badrlahmdi/ultraclean.git .
# When prompted, use your Personal Access Token as password
```

#### Option B: Update Existing Installation

```bash
# Pull latest changes
git pull origin master

# Verify updates
git status
```

---

### Step 4: Configure Environment File

```bash
# Copy the example environment file
cp .env.production.example .env

# Edit the .env file
nano .env
```

**Update these values in `.env`:**

```env
# Domain Configuration
APP_URL=https://your-domain.ma

# Database Configuration (from Hostinger hPanel → MySQL Databases)
DB_DATABASE=<YOUR_DB_NAME>         # From hPanel → MySQL Databases
DB_USERNAME=<YOUR_DB_USER>         # From hPanel → MySQL Databases
DB_PASSWORD=YOUR_DB_PASSWORD_HERE      # Replace with actual DB password from hPanel

# Mail Configuration (from Hostinger hPanel → Email Accounts)
MAIL_USERNAME=noreply@your-domain.ma
MAIL_PASSWORD=YOUR_MAIL_PASSWORD_HERE
MAIL_FROM_ADDRESS="noreply@your-domain.ma"

# Payment Webhook Secret (already generated)
PAYMENT_WEBHOOK_SECRET=<run: openssl rand -hex 32>
```

**Save and exit nano:** Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 5: Generate Application Key

```bash
php artisan key:generate
```

**Expected output:**
```
Application key set successfully.
```

---

### Step 6: Install Composer Dependencies

```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

**Note:** This may take a few minutes

---

### Step 7: Run Database Migrations

```bash
php artisan migrate --force
```

**Expected output:**
```
Migration table created successfully.
Migrating: 2024_01_01_000001_create_users_table
...
[Success] All migrations completed successfully.
```

**Verify migrations:**
```bash
php artisan migrate:status
```

---

### Step 8: Seed Database

```bash
php artisan db:seed --force
```

**Expected output:**
```
Seeding: DatabaseSeeder
...
Database seeding completed successfully.
```

---

### Step 9: Create Storage Link

```bash
php artisan storage:link
```

**Expected output:**
```
The [public/storage] directory has been linked.
```

---

### Step 10: Cache Configuration

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

**Expected output:**
```
Configuration cached successfully.
Route cache cleared and cached.
Compiled views cleared successfully.
Configuration cached successfully.
```

---

### Step 11: Set Permissions

```bash
chmod -R 775 storage bootstrap/cache public/build
chmod -R 775 storage/logs
```

---

### Step 12: Verify Deployment

```bash
# Check PHP version
php -v

# Check migration status
php artisan migrate:status

# Test the site (replace with your domain)
curl -I https://your-domain.ma
```

**Expected curl output:**
```
HTTP/1.1 200 OK
...
```

---

## 🔧 Hostinger hPanel Configuration

### 1. Create Database

**Go to:** hPanel → MySQL Databases

1. Create database: `<YOUR_DB_NAME>`
2. Create user: `<YOUR_DB_NAME>`
3. Generate a strong password
4. **IMPORTANT:** Grant user full privileges to the database

### 2. Activate SSL

**Go to:** hPanel → SSL

1. Click on your domain
2. Activate free Let's Encrypt certificate

### 3. Set PHP Version

**Go to:** hPanel → PHP

1. Select **PHP 8.2** or **8.3**
2. Click "Switch to PHP 8.2"

### 4. Configure Document Root (CRITICAL)

**Go to:** hPanel → Domains

1. Click on your domain
2. Change folder to: `/public_html/public`
3. Click "Save Changes"

**OR create `.htaccess` at root:**

```bash
cd ~/domains/your-domain.ma
nano .htaccess
```

**Paste this content:**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

**Save:** `Ctrl+X`, `Y`, `Enter`

---

## ⏰ Set Up Cron Job

**Go to:** hPanel → Advanced → Scheduled Tasks (Cron Jobs)

1. Click "Add New Task"
2. **Frequency:** Every minute (`* * * * *`)
3. **Command:**
   ```bash
   /usr/local/bin/php /home/<YOUR_SSH_USER>/domains/your-domain.ma/public_html/artisan schedule:run >> /dev/null 2>&1
   ```
4. Click "Save"

**Note:** Replace `your-domain.ma` with your actual domain

---

## 🔐 Post-Deployment Security

### 1. Login and Change Password

**URL:** `https://your-domain.ma`

**Default Credentials:**
- Email: see `database/seeders/AdminUserSeeder.php` for the default seeded account
- Password: **change immediately after first login**
- PIN: `1234`

**Immediate Actions:**
1. Login to the dashboard
2. Go to **Profile** or **Paramètres**
3. Change password to a strong, unique password
4. Create real user accounts (cashier, washer)
5. Disable or delete demo accounts

### 2. Configure Business Settings

**Go to:** Admin → Paramètres

**Configure:**
- ✅ Center name (Nom du centre)
- ✅ Address (Adresse)
- ✅ Phone number (Téléphone)
- ✅ Opening hours (Heures d'ouverture)
- ✅ Closing hours (Heures de fermeture)
- ✅ Tax rate (TVA) - typically 20%
- ✅ Invoice prefix (Préfixe facture)

### 3. Verify Services & Pricing

**Go to:** Admin → Services

- Review all service prices
- Adjust if necessary
- Verify categories are correct

**Go to:** Admin → Vehicle Types

- Verify vehicle categories
- Ensure prices are correct

---

## 🐛 Troubleshooting

### Error 500 - Internal Server Error

```bash
# Check Laravel logs
tail -100 storage/logs/laravel.log

# Check permissions
chmod -R 775 storage bootstrap/cache public/build

# Clear configuration cache
php artisan config:clear
php artisan cache:clear
```

### Assets Not Loading (CSS/JS)

```bash
# Check APP_URL in .env
nano .env
# Verify APP_URL matches your domain exactly

# Verify manifest.json exists
ls -la public/build/manifest.json

# Verify public/build permissions
chmod -R 755 public/build/

# Clear cache
php artisan cache:clear
php artisan view:clear
```

### Database Connection Error

```bash
# Test database connection
php artisan tinker
>>> DB::connection()->getPdo();

# Verify .env database credentials
cat .env | grep DB_

# Check if database exists in hPanel
# Go to: hPanel → MySQL Databases
```

### 419 Page Expired

```bash
# Check SESSION_DOMAIN in .env
nano .env
# Ensure SESSION_DOMAIN=null (no value)

# Clear configuration cache
php artisan config:cache
php artisan session:table
php artisan migrate
```

### Permission Denied Errors

```bash
# Fix storage permissions
chmod -R 775 storage
chmod -R 775 storage/logs
chmod -R 775 storage/framework
chmod -R 775 storage/framework/cache
chmod -R 775 storage/framework/sessions
chmod -R 775 storage/framework/views

# Fix cache permissions
chmod -R 775 bootstrap/cache

# Fix build permissions
chmod -R 755 public/build
```

### Git Authentication Issues

```bash
# If git clone fails with authentication error
# Use HTTPS with personal access token
git clone https://YOUR_TOKEN@github.com/badrlahmdi/ultraclean.git .

# Or configure git credentials
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

---

## 📊 Deployment Verification Checklist

After completing all steps, verify:

- [ ] SSH connection works
- [ ] Repository cloned/updated successfully
- [ ] `.env` file configured with correct values
- [ ] Application key generated
- [ ] Composer dependencies installed
- [ ] All 52 migrations run successfully
- [ ] Database seeded
- [ ] Storage link created
- [ ] Configuration cached
- [ ] Permissions set correctly
- [ ] Database created in hPanel
- [ ] SSL certificate activated
- [ ] PHP version set to 8.2+
- [ ] Document root configured to `/public_html/public`
- [ ] Cron job created
- [ ] Can login to admin dashboard
- [ ] Admin password changed
- [ ] Business settings configured
- [ ] Services and pricing verified
- [ ] All pages load correctly
- [ ] CSS and JS assets load
- [ ] No 500 errors
- [ ] No permission errors

---

## 🔄 Future Updates

### To Update the Application

```bash
# SSH into Hostinger
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>

# Navigate to project
cd ~/domains/your-domain.ma/public_html

# Pull latest changes
git pull origin master

# Install new dependencies
composer install --no-dev --optimize-autoloader --no-interaction

# Run migrations
php artisan migrate --force

# Clear and cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
chmod -R 775 storage bootstrap/cache public/build
```

---

## 📞 Support Resources

- **GitHub Repository:** https://github.com/badrlahmdi/ultraclean.git
- **Deployment Readiness:** `docs/DEPLOYMENT-READINESS.md`
- **Installation Guide:** `docs/GUIDE-INSTALLATION-CLIENT.md`
- **Deployment Script:** `deploy.sh`

---

## ✨ Quick Reference Commands

```bash
# Connect to SSH
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>

# Navigate to project
cd ~/domains/your-domain.ma/public_html

# Update code
git pull origin master

# Run migrations
php artisan migrate --force

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Rebuild cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Fix permissions
chmod -R 775 storage bootstrap/cache public/build

# Check logs
tail -100 storage/logs/laravel.log

# Check migration status
php artisan migrate:status
```

---

**Deployment Date:** 10 avril 2026  
**SSH User:** <YOUR_SSH_USER>  
**SSH Host:** <YOUR_SERVER_IP>  
**SSH Port:** 65002  

**Good luck with your deployment! 🚀**