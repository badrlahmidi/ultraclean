# Déploiement RitajPOS Lavage → Hostinger (Shared Hosting)

## Prérequis Hostinger
- Plan Business ou supérieur (PHP 8.2+, MySQL 5.7+)
- Accès SSH activé (Paramètres → SSH Access)
- Domaine configuré pointant vers le serveur

---

## Étape 1 — Build local avant envoi

```bash
# Sur votre machine Windows
cd c:\DEVPROJECTS\ultraclean

# Copier .env.production → .env pour le build
copy .env.production .env.production.bak

# Build des assets React/Vite
npm run build

# Optimiser les autoloaders PHP
composer install --no-dev --optimize-autoloader
```

---

## Étape 2 — Configurer .env.production

Éditer `.env.production` :
1. Remplacer `CHANGE_ME_RUN_php_artisan_key_generate` par une vraie clé
2. Renseigner `APP_URL`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
3. Configurer les identifiants SMTP mail Hostinger

---

## Étape 3 — Upload des fichiers

### Option A — Git (recommandé)
```bash
# Sur le serveur Hostinger via SSH
cd ~/domains/votre-domaine.com/public_html

git clone https://github.com/votre-user/ultraclean.git .
# OU si déjà cloné :
git pull origin main
```

### Option B — FTP/SFTP
Uploader TOUS les fichiers sauf :
- `node_modules/`
- `.env` (local)
- `storage/logs/*.log`
- `storage/framework/cache/*`

---

## Étape 4 — Configuration serveur (SSH)

```bash
# 1. Se connecter en SSH
ssh u123456789@votre-domaine.com -p 65002

# 2. Aller dans le répertoire
cd ~/domains/votre-domaine.com/public_html

# 3. Copier le .env de production
cp .env.production .env

# 4. Générer une clé d'application
php artisan key:generate

# 5. Installer les dépendances PHP (sans dev)
composer install --no-dev --optimize-autoloader

# 6. Créer le lien symbolique storage
php artisan storage:link

# 7. Lancer les migrations
php artisan migrate --force

# 8. Lancer les seeders (première fois uniquement)
php artisan db:seed --force

# 9. Vider et reconstruire les caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 10. Permissions des dossiers
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## Étape 5 — Pointer le DocumentRoot vers /public

Dans le Panel Hostinger → Hébergement → Gestionnaire de fichiers ou hPanel :

**Si sous-domaine ou domaine principal :**
- DocumentRoot = `/home/u123456789/domains/votre-domaine.com/public_html/public`

OU créer un `.htaccess` à la racine `public_html/` :
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

OU déplacer le contenu de `public/` vers `public_html/` et mettre à jour `public/index.php` :
```php
// Changer les chemins dans index.php
require __DIR__.'/../vendor/autoload.php';
// → require __DIR__.'/vendor/autoload.php';
```

---

## Étape 6 — Queue Worker (optionnel, nécessite un plan avec Cron)

Dans hPanel → Tâches planifiées (Cron Jobs) :
```
* * * * * cd /home/u123456789/domains/votre-domaine.com/public_html && php artisan schedule:run >> /dev/null 2>&1
```

---

## Étape 7 — Vérification post-déploiement

1. ✅ Accéder à `https://votre-domaine.com` → doit afficher la page de login
2. ✅ Se connecter avec `admin@ritajpos.ma` / `Admin@2026!`
3. ✅ Créer un ticket test
4. ✅ Vérifier l'impression (Ctrl+P sur la page ticket)
5. ✅ Vérifier les rapports admin

---

## Commandes utiles (maintenance)

```bash
# Passer en mode maintenance
php artisan down --message="Mise à jour en cours..." --retry=60

# Revenir en ligne
php artisan up

# Vider tous les caches
php artisan optimize:clear

# Voir les logs
tail -f storage/logs/laravel.log

# Après un git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
```

---

## Identifiants démo

| Rôle | Email | Mot de passe | PIN |
|------|-------|--------------|-----|
| Admin | admin@ritajpos.ma | Admin@2026! | 1234 |
| Caissier | caissier@ritajpos.ma | Caissier@2026 | 2222 |
| Laveur | laveur@ritajpos.ma | Laveur@2026 | 3333 |

> ⚠️ Changer ces mots de passe en production !
