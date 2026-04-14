# 🚀 Instructions de Déploiement - UltraClean

> ⚠️ **SECURITY NOTICE:** Never commit real credentials, passwords, IP addresses, or secrets
> to any file tracked by Git. All values below use placeholder tokens. Replace them with
> your actual values **only** on the server itself, or via a secrets manager.

## 📋 Instructions Rapides

### Étape 1 : Connexion SSH
Ouvrez PowerShell ou Command Prompt et exécutez :

```bash
ssh -p <YOUR_SSH_PORT> <YOUR_SSH_USER>@<YOUR_SERVER_IP>
```

Récupérez vos identifiants SSH dans **hPanel → Accès SSH**.

### Étape 2 : Commandes de Déploiement Rapides

Une fois connecté, copiez et collez ce bloc de commandes complet :

```bash
cd ~/domains/<YOUR_DOMAIN>/public_html && \
git clone https://github.com/badrlahmidi/ultraclean.git . && \
cp .env.production.example .env && \
nano .env   # Edit ALL placeholder values before proceeding
```

Remplissez ensuite manuellement dans le fichier `.env` :

| Variable | Valeur |
|---|---|
| `APP_URL` | `https://<YOUR_DOMAIN>` |
| `DB_DATABASE` | Votre nom de BDD (hPanel → MySQL) |
| `DB_USERNAME` | Votre utilisateur BDD |
| `DB_PASSWORD` | Votre mot de passe BDD |
| `MAIL_USERNAME` | Votre adresse e-mail SMTP |
| `PAYMENT_WEBHOOK_SECRET` | Généré avec `openssl rand -hex 32` |

```bash
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
```

⏱️ **Note :** Cela peut prendre plusieurs minutes (surtout `composer install`).

---

## 📝 Instructions Détaillées

### Étape 1 : Navigation
```bash
cd ~/domains/<YOUR_DOMAIN>/public_html
```

### Étape 2 : Clone du Repository
```bash
git clone https://github.com/badrlahmdi/ultraclean.git .
```

Si le répertoire existe déjà :
```bash
git pull origin main
```

### Étape 3 : Configuration .env
```bash
cp .env.production.example .env
nano .env   # Replace ALL placeholder values with your actual production values
```

Valeurs à définir (ne jamais utiliser `sed` avec des mots de passe en clair) :
- `APP_URL` — URL complète de votre domaine
- `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` — depuis hPanel → MySQL
- `MAIL_USERNAME`, `MAIL_PASSWORD` — depuis hPanel → Email Accounts
- `PAYMENT_WEBHOOK_SECRET` — générez avec `openssl rand -hex 32`

### Étape 4 : Génération de la Clé
```bash
php artisan key:generate
```

### Étape 5 : Installation des Dépendances
```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

⏱️ **Note :** Cette étape peut prendre 2-5 minutes.

### Étape 6 : Migrations de la Base de Données
```bash
php artisan migrate --force
```

### Étape 7 : Seed de la Base de Données
```bash
php artisan db:seed --force
```

### Étape 8 : Lien de Stockage
```bash
php artisan storage:link
```

### Étape 9 : Cache de Configuration
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### Étape 10 : Permissions
```bash
chmod -R 775 storage bootstrap/cache public/build
chmod -R 775 storage/logs
```

---

## 🔧 Configuration Post-Déploiement

### 1️⃣ Document Root (CRITIQUE !)

Dans **hPanel** → **Domains** → **ultraclean.ritajpos.com** :

⚠️ **Important :** Changez le dossier racine vers :
```
/public_html/public
```

Si vous ne le faites pas, l'application ne fonctionnera pas !

### 2️⃣ Cron Job

Dans **hPanel** → **Advanced** → **Scheduled Tasks** :

**Commande** (remplacez `uXXXX` et `your-domain` par vos valeurs réelles) :
```bash
* * * * * /usr/local/bin/php /home/uXXXX/domains/your-domain/public_html/artisan schedule:run >> /dev/null 2>&1
```

### 3️⃣ Connexion Admin

🌐 **URL :** `https://<YOUR_DOMAIN>`

Le compte administrateur par défaut est créé par le seeder (`AdminUserSeeder`).
**Changez le mot de passe immédiatement après la première connexion.**

### 4️⃣ Sécurité

🚨 **IMMÉDIATEMENT :**
1. Changez votre mot de passe admin
2. Configurez les paramètres de votre entreprise (nom, horaires, TVA)
3. Vérifiez les services et les prix

---

## ✅ Vérification

Une fois le déploiement terminé, vérifiez :

```bash
# Vérifier la version PHP
php -v

# Vérifier les migrations
php artisan migrate:status

# Vérifier les permissions
ls -la storage
```

---

## 🆘 Dépannage

### Erreur : "Database connection failed"
- Vérifiez les identifiants dans hPanel → Databases
- Assurez-vous que la base de données existe

### Erreur : "Permission denied"
```bash
chmod -R 775 storage bootstrap/cache public/build
```

### Erreur : "Storage link failed"
```bash
rm -rf public/storage
php artisan storage:link
```

### Erreur : "Cache issues"
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

---

## 📚 Documentation Additionnelle

- **docs/DEPLOYMENT-READINESS.md** - Guide de préparation au déploiement
- **docs/GUIDE-INSTALLATION-CLIENT.md** - Guide d'installation détaillé
- **docs/HOSTINGER-DEPLOYMENT-COMMANDS.md** - Commandes de déploiement Hostinger

---

## 🎯 Résumé

1. ✅ Connectez-vous en SSH
2. ✅ Exécutez les commandes de déploiement
3. ✅ Configurez le document root dans hPanel vers `/public_html/public`
4. ✅ Configurez le cron job
5. ✅ Connectez-vous et changez votre mot de passe
6. ✅ Configurez votre entreprise

**Votre application sera live sur :** https://ultraclean.ritajpos.com 🚀