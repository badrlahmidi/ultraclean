# 📋 UltraClean — Deployment Readiness Checklist

**Status:** ✅ READY FOR DEPLOYMENT  
**Date:** 10 avril 2026  
**Build:** Fresh (just completed)  
**Migrations:** All up to date

---

## ✅ Completed Pre-Deployment Tasks

### 1. Code & Build
- [x] All migrations run (52/52 completed)
- [x] Fresh Vite build completed (18.54s)
- [x] Production assets generated in `public/build/`
- [x] `public/build/manifest.json` present and fresh
- [x] Pre-deploy checks passed

### 2. Configuration Files
- [x] `.env.production` created with production defaults
- [x] `PAYMENT_WEBHOOK_SECRET` generated: `5dff05f9783d94419f3d338e8ecacdf8e4fa3099c5ff6319ca88f574b65542a6`
- [x] `deploy.sh` script ready for Hostinger
- [x] `pre-deploy-check.ps1` script available

### 3. Security
- [x] `.env` excluded from Git (in `.gitignore`)
- [x] `node_modules/` excluded from Git
- [x] `APP_DEBUG=false` in production template
- [x] Secure webhook secret generated

---

## ⚠️ Manual Steps Required Before Upload

### Step 1: Configure `.env.production`

Edit `.env.production` and replace the following placeholders:

```env
# Domain Configuration
APP_URL=https://YOUR_DOMAIN_HERE.ma

# Database Configuration (from Hostinger hPanel → MySQL Databases)
DB_DATABASE=uXXXXXXXX_ultraclean      # Replace with actual DB name
DB_USERNAME=uXXXXXXXX_ultraclean      # Replace with actual DB user
DB_PASSWORD=YOUR_DB_PASSWORD_HERE      # Replace with actual DB password

# Mail Configuration (from Hostinger hPanel → Email Accounts)
MAIL_USERNAME=noreply@YOUR_DOMAIN_HERE.ma
MAIL_PASSWORD=YOUR_MAIL_PASSWORD_HERE
MAIL_FROM_ADDRESS="noreply@YOUR_DOMAIN_HERE.ma"

# Optional: Pusher for real-time features
# Create free account at https://pusher.com → Channels → Create App
PUSHER_APP_ID=your_pusher_app_id
PUSHER_APP_KEY=your_pusher_app_key
PUSHER_APP_SECRET=your_pusher_app_secret

# Optional: Sentry for error monitoring
# Create account at https://sentry.io
SENTRY_LARAVEL_DSN=https://your-dsn@sentry.io/project-id
```

### Step 2: Choose Upload Method

#### Option A: Git Upload (Recommended if available)
1. Commit your changes: `git add . && git commit -m "Prep for production"`
2. Push to GitHub: `git push origin main`
3. On Hostinger SSH: `cd ~/domains/your-domain.ma/public_html && git clone https://github.com/badrlahmidi/ultraclean.git .`

#### Option B: SFTP Upload (FileZilla/WinSCP)
1. Connect to Hostinger via SFTP (port 65002)
2. Upload ALL files EXCEPT:
   - `node_modules/` ❌
   - `.env` ❌
   - `.git/` ❌
   - `storage/logs/*` ❌
   - `bootstrap/cache/*` ❌
3. Upload `.env.production` as `.env` on the server
4. **CRITICAL**: Ensure `public/build/` is uploaded (contains compiled assets)

### Step 3: Hostinger Configuration

#### Database Setup
1. **hPanel → MySQL Databases**
2. Create database: `uXXXX_ultraclean`
3. Create user with strong password
4. **IMPORTANT**: Grant user full privileges to the database

#### Domain & SSL
1. **hPanel → Domains**
2. Verify domain points to Hostinger
3. **hPanel → SSL** → Activate free Let's Encrypt certificate

#### PHP Version
1. **hPanel → PHP** → Select **PHP 8.2** or **8.3**

#### Document Root (CRITICAL)
1. **hPanel → Domains** → Click on your domain
2. Change folder to: `/public_html/public`
3. OR create `.htaccess` at root:
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteRule ^(.*)$ public/$1 [L]
   </IfModule>
   ```

---

## 🚀 Deployment Commands (SSH)

After uploading files, connect via SSH and run:

```bash
# 1. Navigate to project
cd ~/domains/your-domain.ma/public_html

# 2. Find PHP version
php -v          # Check version
# Use php8.2 or php8.3 if php is too old

# 3. Set up .env
mv .env.production .env
# OR copy and edit:
# cp .env.production.example .env
# nano .env

# 4. Generate app key
php artisan key:generate

# 5. Install dependencies (if composer available)
composer install --no-dev --optimize-autoloader --no-interaction

# 6. Run migrations
php artisan migrate --force

# 7. Seed initial data
php artisan db:seed --force

# 8. Create storage link
php artisan storage:link

# 9. Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 10. Set permissions
chmod -R 775 storage bootstrap/cache
chmod -R 775 public/build

# 11. Verify
php artisan migrate:status    # All should be "Ran"
curl -I https://your-domain.ma  # Should return 200 OK
```

---

## ⏰ Cron Job Setup

**hPanel → Advanced → Scheduled Tasks (Cron Jobs)**

Add task:
- **Frequency**: Every minute (`* * * * *`)
- **Command**: `/usr/local/bin/php /home/uXXXX/domains/your-domain.ma/public_html/artisan schedule:run >> /dev/null 2>&1`

> **Note**: If using Hostinger Starter (no cron), change `QUEUE_CONNECTION=database` to `QUEUE_CONNECTION=sync` in `.env`

---

## 🔐 Post-Deployment Security

### 1. Change Default Admin Credentials
1. Login at: `https://your-domain.ma`
   - Email: `admin@ritajpos.ma`
   - Password: `Admin@2026!`
   - PIN: `1234`
2. **IMMEDIATELY** change password in Profile
3. Create real user accounts (cashier, washer)
4. Disable demo accounts

### 2. Configure Business Settings
**Admin → Paramètres:**
- Center name, address, phone
- Opening/closing hours
- Tax rate (TVA)
- Invoice prefix

### 3. Verify Services & Pricing
**Admin → Services:** Review and adjust service prices
**Admin → Vehicle Types:** Verify categories

---

## 🐛 Troubleshooting

### Error 500
```bash
tail -100 storage/logs/laravel.log
chmod -R 775 storage bootstrap/cache
php artisan config:clear
```

### Assets Not Loading
1. Verify `APP_URL` in `.env` matches domain
2. Check `public/build/manifest.json` exists
3. Verify permissions: `chmod -R 755 public/build/`

### Database Connection Error
```bash
php artisan tinker
>>> DB::connection()->getPdo();
```

### 419 Page Expired
- Check `SESSION_DOMAIN` in `.env` (should be null)
- Run `php artisan config:cache`

---

## 📊 Current Project Status

| Item | Status |
|------|--------|
| Codebase | ✅ Ready |
| Migrations | ✅ All 52 migrations run |
| Frontend Build | ✅ Fresh (just completed) |
| Production Config | ✅ `.env.production` created |
| Webhook Secret | ✅ Generated |
| Documentation | ✅ Complete |

**Build Details:**
- Build time: 18.54s
- CSS: 101.53 kB (gzipped: 15.79 kB)
- JS (app): 353.70 kB (gzipped: 117.58 kB)
- JS (charts): 358.34 kB (gzipped: 107.28 kB)
- Total assets: 150+ files

---

## 📞 Support

- **Installation Guide**: `docs/GUIDE-INSTALLATION-CLIENT.md`
- **Deployment Script**: `deploy.sh`
- **Pre-deploy Check**: `pre-deploy-check.ps1`

---

## ✨ Next Steps

1. ✅ **Replace placeholders** in `.env.production`
2. ✅ **Upload files** to Hostinger (Git or SFTP)
3. ✅ **Configure Hostinger** (database, SSL, PHP, document root)
4. ✅ **Run deployment commands** via SSH
5. ✅ **Set up cron job**
6. ✅ **Change admin password**
7. ✅ **Configure business settings**
8. ✅ **Test all features**

---

**Last Updated:** 10 avril 2026 - 20:28  
**Prepared By:** Cline AI Assistant  
**Project Version:** 1.0