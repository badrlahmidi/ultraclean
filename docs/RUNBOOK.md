# 📋 Runbook de Production — UltraClean

> **Version :** 1.0  
> **Application :** UltraClean — Gestion de station de lavage  
> **Stack :** Laravel 12 · React 18 · MySQL 8 · Reverb WebSocket  

---

## Table des matières

1. [Architecture de déploiement](#1-architecture)
2. [Monitoring & Alertes](#2-monitoring)
3. [Incidents courants](#3-incidents)
4. [Procédures opérationnelles](#4-procédures)
5. [Contacts & Escalation](#5-contacts)

---

## 1. Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│   Nginx     │────▶│  PHP-FPM     │────▶│  MySQL  │
│  (reverse   │     │  (Laravel)   │     │   8.x   │
│   proxy)    │     └──────────────┘     └─────────┘
│  + SSL/TLS  │     ┌──────────────┐
│             │────▶│  Reverb WS   │
└─────────────┘     │  (port 8080) │
                    └──────────────┘
                    ┌──────────────┐
                    │  Supervisor  │
                    │  - worker x2 │
                    │  - reverb x1 │
                    └──────────────┘
```

### Fichiers critiques
| Fichier | Emplacement | Description |
|---------|-------------|-------------|
| `.env` | `/var/www/ultraclean/.env` | Configuration applicative (JAMAIS en git) |
| `storage/logs/laravel.log` | Log applicatif | Rotates via config |
| `storage/logs/worker.log` | Log du queue worker | Via Supervisor |
| `storage/logs/reverb.log` | Log du WebSocket server | Via Supervisor |

---

## 2. Monitoring

### Sentry (Erreurs applicatives)
- **Dashboard :** `https://sentry.io/organizations/<org>/projects/ultraclean/`
- **Alertes configurées :**
  - Nouvelle erreur → Notification Slack/Email
  - Spike d'erreurs (>10 en 5 min) → Alerte critique
  - Erreur `[Webhook]` → Alerte haute priorité

### Métriques à surveiller

| Métrique | Seuil normal | Alerte |
|----------|-------------|--------|
| Temps de réponse P95 | < 500ms | > 1000ms |
| Erreurs 5xx / heure | 0 | > 5 |
| Queue jobs failed | 0 | > 0 |
| Espace disque `/var/www` | < 80% | > 90% |
| MySQL connections | < 50 | > 80 |
| MySQL slow queries | 0 | > 5/min |

### Commandes de vérification rapide

```bash
# Santé de l'application
curl -s https://votre-domaine.com/up | head -1

# Taille de la base
mysql -e "SELECT table_name, ROUND(data_length/1024/1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema='ultraclean' ORDER BY data_length DESC LIMIT 10;"

# Queue jobs en attente
php artisan queue:monitor redis:default --max=100

# Workers actifs
sudo supervisorctl status

# Logs récents (dernières 50 lignes)
tail -50 storage/logs/laravel.log

# Tickets du jour
php artisan tinker --execute="echo App\Models\Ticket::whereDate('created_at', today())->count().' tickets today';"
```

---

## 3. Incidents courants

### 3.1 🔴 Application inaccessible (502/503)

**Symptômes :** Page blanche, erreur 502 Bad Gateway  

**Diagnostic :**
```bash
# 1. Vérifier que PHP-FPM tourne
sudo systemctl status php8.3-fpm

# 2. Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# 3. Vérifier les logs
tail -20 /var/log/nginx/error.log
tail -20 storage/logs/laravel.log
```

**Résolution :**
```bash
sudo systemctl restart php8.3-fpm
sudo systemctl restart nginx
```

### 3.2 🟠 WebSocket déconnecté (queue laveur ne se met pas à jour)

**Symptômes :** L'écran laveur ne reçoit plus les mises à jour en temps réel  

**Diagnostic :**
```bash
# Vérifier Reverb
sudo supervisorctl status ultraclean-reverb

# Tester la connexion WS
wscat -c ws://localhost:8080/app/<APP_KEY>
```

**Résolution :**
```bash
sudo supervisorctl restart ultraclean-reverb
```

### 3.3 🟠 Queue bloquée (jobs en échec)

**Symptômes :** Emails non envoyés, notifications retardées  

**Diagnostic :**
```bash
php artisan queue:failed

# Voir les détails d'un job
php artisan queue:failed <job-id>
```

**Résolution :**
```bash
# Relancer tous les jobs en échec
php artisan queue:retry all

# Purger les jobs impossible à relancer
php artisan queue:flush

# Redémarrer les workers
sudo supervisorctl restart ultraclean-worker:*
```

### 3.4 🟡 Performance dégradée

**Diagnostic :**
```bash
# Vérifier les slow queries MySQL
mysql -e "SHOW PROCESSLIST;"

# Vérifier la taille de la table activity_logs
php artisan tinker --execute="echo App\Models\ActivityLog::count().' logs';"

# Vérifier le cache
php artisan cache:clear
php artisan config:cache
php artisan route:cache
```

**Résolution :**
```bash
# Archiver les anciennes données
php artisan app:archive --months=6

# Reconstruire les caches
php artisan optimize
```

### 3.5 🟡 Webhook paiement rejeté (401)

**Symptômes :** Logs `[Webhook] Signature invalide`  

**Diagnostic :**
```bash
grep "Webhook" storage/logs/laravel.log | tail -20
```

**Causes possibles :**
1. `PAYMENT_WEBHOOK_SECRET` a changé côté UltraClean mais pas côté passerelle
2. Le corps du webhook est modifié en transit (proxy qui re-encode le JSON)
3. Attaque — vérifier l'IP source

---

## 4. Procédures opérationnelles

### 4.1 Déploiement d'une nouvelle version

```bash
# 1. Activer la maintenance
php artisan down --secret="deploy-$(date +%s)"

# 2. Pull du code
git pull origin main

# 3. Dépendances
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 4. Migrations
php artisan migrate --force

# 5. Caches
php artisan optimize

# 6. Workers
sudo supervisorctl restart ultraclean-worker:*
sudo supervisorctl restart ultraclean-reverb

# 7. Vérification
curl -s https://votre-domaine.com/up

# 8. Désactiver la maintenance
php artisan up
```

### 4.2 Backup base de données

```bash
# Backup quotidien (à planifier via cron)
mysqldump -u ultraclean_user -p ultraclean_db \
  --single-transaction --routines --triggers \
  | gzip > /backups/ultraclean_$(date +%Y%m%d_%H%M%S).sql.gz

# Rétention : 30 jours
find /backups -name "ultraclean_*.sql.gz" -mtime +30 -delete
```

### 4.3 Restauration depuis un backup

```bash
# 1. Activer la maintenance
php artisan down

# 2. Restaurer
gunzip < /backups/ultraclean_YYYYMMDD_HHMMSS.sql.gz | mysql -u ultraclean_user -p ultraclean_db

# 3. Recacher
php artisan optimize

# 4. Désactiver la maintenance
php artisan up
```

### 4.4 Archivage mensuel

```bash
# Dry run d'abord
php artisan app:archive --months=6 --dry-run

# Exécution réelle
php artisan app:archive --months=6
```

---

## 5. Contacts & Escalation

| Niveau | Qui | Quand |
|--------|-----|-------|
| L1 — Opérations | Équipe dev | Incidents bas/moyen |
| L2 — Ingénierie | Lead dev | Incidents hauts, bugs code |
| L3 — Infrastructure | Admin sys | Incidents serveur, BDD |
| Escalation | Direction technique | Incidents critiques > 30min |

### Canaux
- **Sentry :** Alertes automatiques sur erreurs
- **Email :** alertes@ultraclean.ma
- **Téléphone :** +212-XXX-XXXXXX (astreinte)

---

*Dernière mise à jour : Avril 2026*
