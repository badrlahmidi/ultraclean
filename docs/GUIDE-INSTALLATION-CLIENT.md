# 🚀 UltraClean — Guide d'installation chez un client (Hostinger)

> **Version** : 1.0 — 10 avril 2026  
> **Stack** : Laravel 12 / React 18 / Inertia.js v2 / MySQL 8 / Tailwind CSS 3  
> **Hébergement cible** : Hostinger Business ou Premium (shared hosting avec SSH + cron)

---

## 📋 Prérequis côté Hostinger

| Élément | Minimum requis | Recommandé |
|---|---|---|
| **Plan** | Premium (SSH + 1 cron) | Business (SSH + cron illimités) |
| **PHP** | 8.2 | 8.3 |
| **MySQL** | 8.0 | 8.0+ |
| **Extensions PHP** | pdo_mysql, mbstring, openssl, tokenizer, bcmath, ctype, fileinfo, json | Toutes activées par défaut sur Hostinger |
| **Node.js** | Pas nécessaire sur le serveur (build local) | — |
| **Domaine** | Configuré et pointant vers Hostinger | + certificat SSL activé |

---

## 🔧 ÉTAPE 1 — Préparation locale (sur votre PC)

### 1.1 Cloner et configurer

```powershell
# Sur votre machine Windows
cd C:\DEVPROJECTS
git clone https://github.com/badrlahmidi/ultraclean.git ultraclean-client
cd ultraclean-client
```

### 1.2 Installer les dépendances et builder

```powershell
# Dépendances PHP (production uniquement)
composer install --no-dev --optimize-autoloader

# Dépendances JS et build Vite
npm ci
npm run build

# Vérifier que le build a réussi
Test-Path "public\build\manifest.json"   # Doit retourner True
```

### 1.3 Exécuter le check pré-déploiement

```powershell
.\pre-deploy-check.ps1
```

> ✅ Vous devez voir **"All checks passed — safe to deploy"**

### 1.4 Préparer le `.env` de production

```powershell
Copy-Item .env.production.example .env.production
notepad .env.production
```

**Remplir impérativement :**

```env
APP_NAME="NomDuClient"
APP_KEY=                              # Sera généré sur le serveur
APP_URL=https://domaine-client.ma     # URL exacte avec HTTPS

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=uXXXX_ultraclean         # Depuis hPanel → Bases de données
DB_USERNAME=uXXXX_ultraclean         # Utilisateur créé sur Hostinger
DB_PASSWORD=MotDePasseRobuste123!    # Mot de passe DB Hostinger

SESSION_LIFETIME=480                  # 8 heures (journée de travail)

MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
MAIL_USERNAME=contact@domaine-client.ma
MAIL_PASSWORD=MotDePasseMail
MAIL_FROM_ADDRESS="contact@domaine-client.ma"
MAIL_FROM_NAME="${APP_NAME}"

PAYMENT_WEBHOOK_SECRET=               # openssl rand -hex 32
```

**Pour le broadcast temps réel (optionnel) :**
- Créer un compte gratuit sur [pusher.com](https://pusher.com)
- Channels → Create App → cluster `eu`
- Copier les clés dans `.env.production`

**Sans Pusher :** laisser `BROADCAST_CONNECTION=log` — l'app fonctionne parfaitement, juste sans les notifications temps réel.

---

## 🌐 ÉTAPE 2 — Préparation Hostinger (hPanel)

### 2.1 Créer la base de données MySQL

1. **hPanel → Bases de données → MySQL**
2. Créer la base : `uXXXX_ultraclean`
3. Créer un utilisateur avec un mot de passe fort
4. **Associer l'utilisateur à la base** (accès complet)

### 2.2 Configurer le domaine

1. **hPanel → Domaines** → vérifier que le domaine pointe vers Hostinger
2. **SSL** → Activer le certificat SSL gratuit (Let's Encrypt)
3. **PHP → Version** → Sélectionner **PHP 8.2** ou **8.3**
4. **PHP → Options** → vérifier que `pdo_mysql`, `mbstring`, `openssl` sont activés

### 2.3 Configurer le document root

**⚠️ CRITIQUE** : Hostinger pointe par défaut vers `public_html/`.  
Laravel nécessite que le document root soit `public_html/public/`.

**Option A** (recommandée) — Modifier le document root dans hPanel :
1. **hPanel → Hébergement → Domaines** → cliquer sur le domaine
2. Changer le dossier racine en : `/public_html/public`

**Option B** — Créer un `.htaccess` à la racine `public_html/` :

```apache
# public_html/.htaccess (redirige tout vers /public)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

---

## 📤 ÉTAPE 3 — Upload des fichiers

### Option A — Via Git + SSH (recommandé)

```bash
# Se connecter en SSH à Hostinger
ssh uXXXX@srv123.hostinger.com -p 65002

# Aller dans le dossier du site
cd ~/domains/domaine-client.ma/public_html

# Cloner le repo
git clone https://github.com/badrlahmidi/ultraclean.git .
```

### Option B — Via SFTP (FileZilla / WinSCP)

1. Connecter FileZilla à Hostinger (SFTP, port 65002)
2. Uploader **TOUT le projet** dans `public_html/` **SAUF** :
   - `node_modules/` ❌
   - `.env` ❌ (sera créé sur le serveur)
   - `database/database.sqlite` ❌
   - `.git/` ❌ (optionnel, pas nécessaire si pas de git sur le serveur)
3. **S'assurer que `public/build/` EST uploadé** (contient les assets compilés)

---

## ⚙️ ÉTAPE 4 — Configuration serveur (SSH)

```bash
# Connexion SSH
ssh uXXXX@srv123.hostinger.com -p 65002
cd ~/domains/domaine-client.ma/public_html

# ── 1. Copier le .env de production ──────────────────────────────────
# Option A : uploader votre .env.production local puis le renommer
mv .env.production .env

# Option B : copier le template et éditer
cp .env.production.example .env
nano .env    # Remplir TOUTES les valeurs

# ── 2. Trouver le bon binaire PHP ────────────────────────────────────
# Hostinger peut avoir plusieurs versions. Tester :
php -v          # Souvent PHP 8.1 (trop vieux)
php8.2 -v       # PHP 8.2 si dispo
php8.3 -v       # PHP 8.3 si dispo
# Utiliser la bonne version dans toutes les commandes ci-dessous
# Exemple : PHP=php8.2

# ── 3. Générer la clé d'application ──────────────────────────────────
php artisan key:generate

# ── 4. Installer les dépendances PHP ─────────────────────────────────
# Si composer est disponible :
composer install --no-dev --optimize-autoloader --no-interaction

# Si composer n'est PAS disponible (Hostinger Starter) :
# → Uploader le dossier vendor/ entier via SFTP (depuis votre PC après
#   avoir fait composer install --no-dev localement)

# ── 5. Migrer la base de données ─────────────────────────────────────
php artisan migrate --force

# ── 6. Seeder les données de base ────────────────────────────────────
php artisan db:seed --force
# Cela crée : paramètres, types de véhicules, marques/modèles,
#              services, et le compte admin initial

# ── 7. Créer le lien symbolique storage ──────────────────────────────
php artisan storage:link

# ── 8. Cacher la configuration ───────────────────────────────────────
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# ── 9. Vérifier les permissions ──────────────────────────────────────
chmod -R 775 storage bootstrap/cache
chmod -R 775 public/build

# ── 10. Tester ───────────────────────────────────────────────────────
php artisan migrate:status    # Toutes les migrations doivent être "Ran"
php artisan about             # Affiche la config de l'app
curl -I https://domaine-client.ma    # Doit retourner 200 OK
```

---

## ⏰ ÉTAPE 5 — Configurer le Cron Job

1. **hPanel → Avancé → Tâches planifiées (Cron Jobs)**
2. Ajouter :

| Fréquence | Commande |
|---|---|
| **Toutes les minutes** (`* * * * *`) | `/usr/local/bin/php /home/uXXXX/domains/domaine-client.ma/public_html/artisan schedule:run >> /dev/null 2>&1` |

> **Trouver le chemin PHP** : exécuter `which php8.2` en SSH  
> **Plans sans cron** : mettre `QUEUE_CONNECTION=sync` dans `.env` — le traitement sera synchrone (légèrement plus lent mais fonctionnel)

---

## 🔐 ÉTAPE 6 — Sécurité post-installation

### 6.1 Changer le mot de passe admin

1. Se connecter sur `https://domaine-client.ma` avec :
   - Email : `admin@ritajpos.ma`
   - Mot de passe : `Admin@2026!`
   - PIN : `1234`
2. **Profil → Changer le mot de passe IMMÉDIATEMENT**
3. **Admin → Utilisateurs** → Créer les vrais comptes (caissier, laveur)
4. **Désactiver** les comptes de démo

### 6.2 Configurer les paramètres métier

**Admin → Paramètres → Centre :**
| Paramètre | Valeur |
|---|---|
| Nom du centre | `NomDuClient` |
| Adresse | Adresse complète |
| Téléphone | `+212 6XX XXX XXX` |
| Préfixe ticket | `TK` |

**Admin → Paramètres → Horaires :**
| Paramètre | Valeur |
|---|---|
| Heure ouverture | `8` |
| Heure fermeture | `21` |

**Admin → Paramètres → Fiscal :**
| Paramètre | Valeur |
|---|---|
| Taux TVA | `20` |
| Préfixe facture | `FAC` |

### 6.3 Configurer les services et tarifs

1. **Admin → Services** → Vérifier/modifier les services et prix
2. **Admin → Types de véhicules** → Vérifier les catégories
3. **Admin → Marques/Modèles** → Ajouter si nécessaire

---

## 🔄 ÉTAPE 7 — Mises à jour futures

### Méthode Git (si configuré)

```bash
ssh uXXXX@srv123.hostinger.com -p 65002
cd ~/domains/domaine-client.ma/public_html
bash deploy.sh
```

### Méthode SFTP (si pas de Git)

1. Sur votre PC : `npm run build`
2. Uploader les fichiers modifiés via SFTP
3. **Toujours uploader** `public/build/` après un changement frontend
4. En SSH :

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up
```

---

## 🐛 Dépannage

### Erreur 500

```bash
# Voir les logs
tail -100 storage/logs/laravel.log

# Vérifier les permissions
chmod -R 775 storage bootstrap/cache

# Vider le cache
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

### Page blanche

```bash
# Vérifier que le build frontend existe
ls -la public/build/manifest.json

# Si absent → rebuilder en local et ré-uploader public/build/
```

### "419 Page Expired"

```bash
# Vérifier la table sessions
php artisan migrate:status | grep sessions

# Vérifier SESSION_DOMAIN dans .env
# Doit être null ou .domaine-client.ma
```

### Erreur de connexion DB

```bash
# Tester la connexion
php artisan tinker
>>> DB::connection()->getPdo();
# Doit afficher un objet PDO sans erreur
```

### Les assets CSS/JS ne chargent pas

1. Vérifier que `APP_URL` dans `.env` est correct (avec `https://`)
2. Vérifier que `public/build/manifest.json` existe
3. Vérifier les permissions : `chmod -R 755 public/build/`

### Signed URL "Invalid signature"

1. Vérifier que `APP_URL` dans `.env` correspond **exactement** à l'URL du navigateur
2. Vérifier que `APP_KEY` n'a pas changé
3. `php artisan config:cache` après toute modification du `.env`

---

## 📁 Structure des fichiers sur Hostinger

```
~/domains/domaine-client.ma/
└── public_html/          ← Le projet Laravel
    ├── app/
    ├── bootstrap/
    ├── config/
    ├── database/
    ├── public/           ← Document Root (pointé par le domaine)
    │   ├── build/        ← Assets Vite compilés (JS/CSS)
    │   ├── .htaccess     ← Rewrite rules + force HTTPS
    │   └── index.php     ← Point d'entrée Laravel
    ├── resources/
    ├── routes/
    ├── storage/
    │   ├── app/
    │   ├── framework/
    │   └── logs/         ← Logs Laravel (vérifier si erreurs)
    ├── vendor/           ← Dépendances PHP
    ├── .env              ← Configuration (NE JAMAIS committer)
    ├── artisan
    ├── composer.json
    └── deploy.sh         ← Script de mise à jour
```

---

## ✅ Checklist finale

- [ ] SSL activé sur le domaine
- [ ] Document root pointe vers `public_html/public/`
- [ ] `.env` rempli avec toutes les valeurs de production
- [ ] `APP_DEBUG=false`
- [ ] `APP_URL` = URL exacte avec `https://`
- [ ] `php artisan key:generate` exécuté
- [ ] `php artisan migrate --force` exécuté sans erreur
- [ ] `php artisan db:seed --force` exécuté
- [ ] `php artisan storage:link` exécuté
- [ ] `php artisan config:cache` exécuté
- [ ] `public/build/manifest.json` présent
- [ ] Permissions `775` sur `storage/` et `bootstrap/cache/`
- [ ] Cron job configuré (`schedule:run` chaque minute)
- [ ] Connexion admin testée et mot de passe changé
- [ ] Paramètres métier configurés (nom, adresse, TVA, horaires)
- [ ] Services et tarifs vérifiés
- [ ] Comptes utilisateurs réels créés (caissier, laveur)
- [ ] `PAYMENT_WEBHOOK_SECRET` généré si intégration paiement

---

## 🏷️ Accès par défaut (à changer immédiatement)

| Rôle | Email | Mot de passe | PIN |
|---|---|---|---|
| Admin | `admin@ritajpos.ma` | `Admin@2026!` | `1234` |
| Caissier | `caissier@ritajpos.ma` | `Caissier@2026` | `2222` |
| Laveur | `laveur@ritajpos.ma` | `Laveur@2026` | `3333` |
