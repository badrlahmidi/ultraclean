# 🚀 UltraClean - Quick Deployment to Hostinger

> ⚠️ **SECURITY:** Never commit real passwords, IP addresses, database names, or secrets
> to Git. Replace every `<PLACEHOLDER>` below with your actual values **on the server only**.

---

## Method 1: Using the Automated Script (Recommended)

### Step 1: Run the PowerShell script

```powershell
.\deploy.ps1
```

The script prompts for SSH user, host, port, and domain interactively at runtime.
It never embeds credentials in source code.

---

## Method 2: Manual Commands

### Step 1: Connect to your server

```bash
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

### Step 2: Navigate to domain directory

```bash
cd ~/domains/<YOUR_DOMAIN>/public_html
```

### Step 3: Clone the repository

```bash
git clone https://github.com/badrlahmdi/ultraclean.git .
```

### Step 4: Configure environment file

```bash
cp .env.production.example .env
nano .env
```

**Edit these values with your actual production values:**

```env
APP_URL=https://<YOUR_DOMAIN>
DB_DATABASE=<YOUR_DB_NAME>
DB_USERNAME=<YOUR_DB_USER>
DB_PASSWORD=<YOUR_DB_PASSWORD>
MAIL_USERNAME=<YOUR_MAIL_ADDRESS>
MAIL_FROM_ADDRESS="<YOUR_MAIL_ADDRESS>"
PAYMENT_WEBHOOK_SECRET=<run: openssl rand -hex 32>
```

### Step 5: Install and migrate

```bash
php artisan key:generate
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache
chmod -R 775 storage bootstrap/cache public/build storage/logs
```

---

## 🔧 Hostinger hPanel Configuration

### 1. Document Root (CRITICAL!)

**hPanel → Domains → <YOUR_DOMAIN>**

**Change folder to:** `/public_html/public`

**This is CRITICAL - without this, your site won't work!**

### 2. Activate SSL Certificate

**hPanel → SSL → Activate Let's Encrypt**

### 3. Set PHP Version

**hPanel → PHP → Select PHP 8.2 or 8.3**

### 4. Set Up Cron Job

**hPanel → Advanced → Scheduled Tasks**

**Add New Task** (replace `uXXXX` and `<YOUR_DOMAIN>` with real values):
- Frequency: Every minute (`* * * * *`)
- Command:
```bash
/usr/local/bin/php /home/uXXXX/domains/<YOUR_DOMAIN>/public_html/artisan schedule:run >> /dev/null 2>&1
```

---

## 🔐 Post-Deployment Security

### 1. Login to Your Application

**URL:** `https://<YOUR_DOMAIN>`

The default admin account is created by `AdminUserSeeder`.
See `database/seeders/AdminUserSeeder.php` for the default e-mail.

### 2. IMMEDIATELY After First Login

1. Change admin password to a strong, unique password
2. Change the admin PIN
3. Create real cashier and washer accounts
4. Disable or delete demo/seed accounts

### 3. Configure Business Settings

**Admin → Paramètres:** set center name, address, phone, opening hours, tax rate.

---

## ✅ Deployment Checklist

- [ ] Connected to server via SSH
- [ ] Repository cloned
- [ ] `.env` configured with **real values** (not hardcoded defaults)
- [ ] Application key generated
- [ ] Composer dependencies installed
- [ ] Migrations run successfully
- [ ] Database seeded
- [ ] Storage link created
- [ ] Configuration cached
- [ ] Permissions set correctly
- [ ] **Document root changed to /public_html/public** (CRITICAL!)
- [ ] SSL certificate activated
- [ ] PHP version set to 8.2+
- [ ] Cron job created
- [ ] Can login to admin dashboard
- [ ] Admin password changed immediately
- [ ] Business settings configured

---

## 🐛 Troubleshooting

### 500 Internal Server Error

```bash
tail -100 storage/logs/laravel.log
chmod -R 775 storage bootstrap/cache public/build
php artisan cache:clear && php artisan config:clear
```

### CSS/JS assets don't load

1. Confirm document root is set to `/public_html/public` in hPanel
2. Verify `APP_URL` in `.env` matches your domain exactly

### Database connection fails

```bash
php artisan tinker
>>> DB::connection()->getPdo();
```

Verify credentials in hPanel → MySQL Databases.

---

**After completing all steps, your UltraClean application will be live.**

**Remember:** change your admin password immediately after first login.
