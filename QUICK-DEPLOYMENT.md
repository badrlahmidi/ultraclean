# 🚀 UltraClean - Quick Deployment to Hostinger

**Your Details:**
- Domain: https://ultraclean.ritajpos.com
- Database: u897563629_ultraclean
- Username: u897563629_ultraclean
- Password: Ultraclean@26
- GitHub Repo: Public ✅

---

## Method 1: Using the Automated Script (Recommended)

### Step 1: Upload the Script

1. **Download** `deploy-to-hostinger.sh` from your local project
2. **Upload** it to your Hostinger server using FileZilla or SFTP
3. **Place** it in your home directory: `/home/u897563629/`

### Step 2: Connect via SSH and Run

```bash
# Connect to Hostinger
ssh -p 65002 u897563629@91.108.101.158

# Make script executable
chmod +x deploy-to-hostinger.sh

# Run the script
./deploy-to-hostinger.sh
```

The script will automatically:
- ✅ Navigate to your domain directory
- ✅ Clone/update the repository
- ✅ Configure .env with your database credentials
- ✅ Generate application key
- ✅ Install composer dependencies
- ✅ Run all 52 migrations
- ✅ Seed the database
- ✅ Create storage link
- ✅ Cache configuration
- ✅ Set permissions

---

## Method 2: Manual Commands (Copy & Paste)

If you prefer to run commands manually, copy and paste these into your SSH terminal:

### Step 1: Connect to Hostinger
```bash
ssh -p 65002 u897563629@91.108.101.158
```

### Step 2: Navigate to Domain Directory
```bash
cd ~/domains/ultraclean.ritajpos.com/public_html
```

### Step 3: Clone the Repository
```bash
git clone https://github.com/badrlahmdi/ultraclean.git .
```

### Step 4: Configure Environment File
```bash
cp .env.production.example .env
```

### Step 5: Update .env with Your Settings
```bash
nano .env
```

**Update these values (press Ctrl+X, Y, Enter to save):**
```env
APP_URL=https://ultraclean.ritajpos.com
DB_DATABASE=u897563629_ultraclean
DB_USERNAME=u897563629_ultraclean
DB_PASSWORD=Ultraclean@26
MAIL_USERNAME=noreply@ultraclean.ritajpos.com
MAIL_FROM_ADDRESS="noreply@ultraclean.ritajpos.com"
PAYMENT_WEBHOOK_SECRET=5dff05f9783d94419f3d338e8ecacdf8e4fa3099c5ff6319ca88f574b65542a6
```

### Step 6: Generate Application Key
```bash
php artisan key:generate
```

### Step 7: Install Composer Dependencies
```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

### Step 8: Run Database Migrations
```bash
php artisan migrate --force
```

### Step 9: Seed Database
```bash
php artisan db:seed --force
```

### Step 10: Create Storage Link
```bash
php artisan storage:link
```

### Step 11: Cache Configuration
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### Step 12: Set Permissions
```bash
chmod -R 775 storage bootstrap/cache public/build
chmod -R 775 storage/logs
```

### Step 13: Verify Deployment
```bash
php -v
php artisan migrate:status
```

---

## 🔧 Hostinger hPanel Configuration

### 1. Document Root (CRITICAL!)

**Go to:** hPanel → Domains → ultraclean.ritajpos.com

**Change folder to:** `/public_html/public`

**This is CRITICAL - without this, your site won't work!**

### 2. Activate SSL Certificate

**Go to:** hPanel → SSL → Activate Let's Encrypt

### 3. Set PHP Version

**Go to:** hPanel → PHP → Select PHP 8.2 or 8.3

### 4. Set Up Cron Job

**Go to:** hPanel → Advanced → Scheduled Tasks (Cron Jobs)

**Add New Task:**
- Frequency: Every minute (`* * * * *`)
- Command:
```bash
/usr/local/bin/php /home/u897563629/domains/ultraclean.ritajpos.com/public_html/artisan schedule:run >> /dev/null 2>&1
```

---

## 🔐 Post-Deployment Security

### 1. Login to Your Application

**URL:** https://ultraclean.ritajpos.com

**Default Credentials:**
- Email: `admin@ritajpos.ma`
- Password: `Admin@2026!`
- PIN: `1234`

### 2. IMMEDIATELY Change Password

1. Login to the dashboard
2. Go to **Profile** or **Paramètres**
3. Change password to a strong, unique password
4. Create real user accounts (cashier, washer)
5. Disable or delete demo accounts

### 3. Configure Business Settings

**Go to:** Admin → Paramètres

Configure:
- ✅ Center name (Nom du centre)
- ✅ Address (Adresse)
- ✅ Phone number (Téléphone)
- ✅ Opening hours (Heures d'ouverture)
- ✅ Closing hours (Heures de fermeture)
- ✅ Tax rate (TVA) - typically 20%
- ✅ Invoice prefix (Préfixe facture)

### 4. Verify Services & Pricing

**Go to:** Admin → Services
- Review all service prices
- Adjust if necessary

**Go to:** Admin → Vehicle Types
- Verify vehicle categories
- Ensure prices are correct

---

## ✅ Deployment Checklist

- [ ] Connected to Hostinger via SSH
- [ ] Navigated to domain directory
- [ ] Repository cloned successfully
- [ ] .env file configured with correct values
- [ ] Application key generated
- [ ] Composer dependencies installed
- [ ] All 52 migrations run successfully
- [ ] Database seeded
- [ ] Storage link created
- [ ] Configuration cached
- [ ] Permissions set correctly
- [ ] **Document root changed to /public_html/public** (CRITICAL!)
- [ ] SSL certificate activated
- [ ] PHP version set to 8.2+
- [ ] Cron job created
- [ ] Can login to admin dashboard
- [ ] Admin password changed
- [ ] Business settings configured
- [ ] Services and pricing verified

---

## 🐛 Troubleshooting

### If you see "500 Internal Server Error"

```bash
# Check Laravel logs
tail -100 storage/logs/laravel.log

# Fix permissions
chmod -R 775 storage bootstrap/cache public/build

# Clear cache
php artisan cache:clear
php artisan config:clear
```

### If CSS/JS assets don't load

1. Check that document root is set to `/public_html/public` in hPanel
2. Verify `APP_URL` in `.env` matches your domain exactly
3. Clear cache: `php artisan cache:clear`

### If database connection fails

```bash
# Test database connection
php artisan tinker
>>> DB::connection()->getPdo();

# Verify database exists in hPanel → MySQL Databases
```

---

## 🎉 Success!

After completing all steps, your UltraClean application will be live at:

**https://ultraclean.ritajpos.com**

**Remember to:**
1. Change your admin password immediately
2. Configure your business settings
3. Test all features
4. Set up regular backups

---

**Need Help?**
- Full Guide: `docs/HOSTINGER-DEPLOYMENT-COMMANDS.md`
- GitHub: https://github.com/badrlahmdi/ultraclean.git