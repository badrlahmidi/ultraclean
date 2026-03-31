# Déploiement Hostinger — Guide complet

## Prérequis

| Élément | Requis |
|---|---|
| Plan Hostinger | Business ou VPS (pour cron + SSH) |
| PHP | 8.2+ |
| MySQL | 8.0+ |
| Node.js | 20+ (build local ou Hostinger Node) |
| Compte Pusher | Gratuit — [pusher.com](https://pusher.com) |

---

## 1. Créer le projet sur Hostinger

1. **hPanel → Hébergement → Gérer**
2. **Domaines → ultraclean.ma** (pointer vers `public_html/public/`)  
   OU créer un sous-domaine `app.ultraclean.ma`
3. **Bases de données MySQL** → Créer `uXXXX_ultraclean` + utilisateur

---

## 2. Configurer Pusher (WebSocket gratuit)

Reverb nécessite un processus persistant (non dispo en shared hosting).  
Pusher Free offre 100 connexions simultanées + 200k messages/jour.

1. Créer un compte sur [pusher.com](https://pusher.com/signup)
2. **Channels → Create App** → nom: `ultraclean-prod`, cluster: `eu`
3. Copier **App ID / Key / Secret** dans `.env`

```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=123456
PUSHER_APP_KEY=abc123def456
PUSHER_APP_SECRET=secret789
PUSHER_APP_CLUSTER=eu
VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

---

## 3. Premier déploiement via SSH

```bash
# Se connecter en SSH (Hostinger → Hébergement → SSH)
ssh uXXXX@srv123.hostinger.com

cd ~/domains/ultraclean.ma/public_html

# Cloner le repo
git clone https://github.com/votre-org/ultraclean.git .

# Copier et éditer le .env
cp .env.production .env
nano .env   # remplir APP_KEY, DB_*, PUSHER_*

# Générer la clé
php artisan key:generate

# Installer les dépendances PHP
composer install --no-dev --optimize-autoloader

# Migrer la base de données
php artisan migrate --force

# Créer le symlink storage
php artisan storage:link

# Pré-builder les assets (ou uploader le dossier public/build/ depuis local)
# Option A — Build sur le serveur (si Node.js dispo) :
npm ci && npm run build
# Option B — Build en local et uploader public/build/ via SFTP

# Cacher config/routes/views
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Déploiement terminé"
```

---

## 4. Déploiements suivants

```bash
cd ~/domains/ultraclean.ma/public_html
bash deploy.sh
```

---

## 5. Cron Job (Hostinger → Avancé → Cron Jobs)

Ajouter la tâche suivante (**toutes les minutes**) :

```
* * * * * /usr/local/bin/php /home/uXXXX/domains/ultraclean.ma/public_html/artisan schedule:run >> /dev/null 2>&1
```

> ⚠ Remplacer `uXXXX` par votre nom d'utilisateur Hostinger et le chemin PHP correct.  
> Pour trouver le bon chemin PHP : `which php` ou `php8.2` selon le plan.

---

## 6. Queue Worker (VPS uniquement)

Sur un **VPS Hostinger** avec Supervisor :

```bash
# Installer supervisor
apt-get install supervisor

# Créer /etc/supervisor/conf.d/ultraclean-worker.conf
```

```ini
[program:ultraclean-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /home/uXXXX/domains/ultraclean.ma/public_html/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=uXXXX
numprocs=1
redirect_stderr=true
stdout_logfile=/home/uXXXX/domains/ultraclean.ma/logs/worker.log
stopwaitsecs=3600
```

```bash
supervisorctl reread && supervisorctl update && supervisorctl start ultraclean-worker:*
```

> Si VPS non disponible, utiliser `QUEUE_CONNECTION=sync` dans `.env` (traitement synchrone, légèrement plus lent).

---

## 7. .htaccess — Vérification

Le fichier `public/.htaccess` Laravel standard est inclus.  
Si Hostinger utilise **LiteSpeed**, ajouter dans `.env` :

```env
# Optionnel pour LiteSpeed
FILESYSTEM_DISK=local
```

---

## 8. Variables d'environnement — Checklist

| Variable | Description | Obligatoire |
|---|---|---|
| `APP_KEY` | Généré par `php artisan key:generate` | ✅ |
| `APP_URL` | `https://ultraclean.ma` | ✅ |
| `DB_DATABASE` | Nom de la base Hostinger | ✅ |
| `DB_USERNAME` | Utilisateur MySQL | ✅ |
| `DB_PASSWORD` | Mot de passe MySQL | ✅ |
| `PUSHER_APP_KEY` | Clé Pusher | ✅ (si broadcast) |
| `PUSHER_APP_SECRET` | Secret Pusher | ✅ (si broadcast) |
| `PUSHER_APP_CLUSTER` | Cluster Pusher (ex: `eu`) | ✅ (si broadcast) |
| `MAIL_*` | Config SMTP Hostinger | ⚡ optionnel |
| `VITE_PUSHER_APP_KEY` | Idem Pusher (côté JS) — rebuild requis | ✅ |

---

## 9. Post-déploiement — Vérifications

```bash
# Vérifier les logs
tail -f storage/logs/laravel.log

# Vérifier les routes
php artisan route:list | grep admin

# Tester la connexion DB
php artisan migrate:status

# Vérifier le statut
php artisan about
```
