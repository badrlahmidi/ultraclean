# 🚀 Checklist de Déploiement Production — UltraClean

> **Version :** 1.0  
> **Date :** Avril 2026  
> **Stack :** Laravel 12 · React 18 · Inertia.js · MySQL 8 · Tailwind CSS  

---

## Pré-déploiement

### Environnement
- [ ] Copier `.env.production.example` → `.env`
- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_KEY` généré : `php artisan key:generate`
- [ ] `APP_URL` configuré avec le domaine production
- [ ] `SESSION_ENCRYPT=true`
- [ ] `SESSION_SECURE_COOKIE=true`
- [ ] `SESSION_SAME_SITE=lax`
- [ ] `SENTRY_LARAVEL_DSN` configuré
- [ ] `PAYMENT_WEBHOOK_SECRET` défini (min 32 caractères)

### Base de données
- [ ] MySQL 8+ avec `utf8mb4_unicode_ci`
- [ ] Utilisateur BDD dédié (pas root)
- [ ] `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` configurés
- [ ] Migrations exécutées : `php artisan migrate --force`
- [ ] Seeders de données de base exécutés si nécessaire

### Dépendances
- [ ] `composer install --no-dev --optimize-autoloader`
- [ ] `npm ci && npm run build`
- [ ] `composer audit` — aucune vulnérabilité critique
- [ ] `npm audit --audit-level=high` — aucune vulnérabilité critique

---

## Déploiement

### Commandes Laravel
```bash
# Cache de configuration
php artisan config:cache

# Cache des routes
php artisan route:cache

# Cache des vues
php artisan view:cache

# Cache des événements
php artisan event:cache

# Lien symbolique storage
php artisan storage:link

# Optimisation autoloader
composer dump-autoload --optimize
```

### Crontab
```crontab
* * * * * cd /path/to/ultraclean && php artisan schedule:run >> /dev/null 2>&1
```

### Queue Worker (Supervisor)
```ini
[program:ultraclean-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/ultraclean/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/ultraclean/storage/logs/worker.log
stopwaitsecs=3600
```

### Reverb WebSocket (Supervisor)
```ini
[program:ultraclean-reverb]
command=php /path/to/ultraclean/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/path/to/ultraclean/storage/logs/reverb.log
```

---

## Post-déploiement

### Vérifications
- [ ] Page d'accueil charge correctement
- [ ] Login PIN fonctionne
- [ ] Création d'un ticket de test
- [ ] Paiement d'un ticket
- [ ] WebSocket fonctionne (mise à jour queue laveur en temps réel)
- [ ] Headers de sécurité présents : `curl -I https://votre-domaine.com`
- [ ] Sentry reçoit les erreurs de test
- [ ] Cron job exécute le scheduler

### Performance
- [ ] `php artisan config:cache` — pas d'erreur
- [ ] `php artisan route:cache` — pas d'erreur
- [ ] Temps de réponse < 500ms sur les pages principales
- [ ] `npm run build` — taille du bundle < 500KB gzippé

### Sécurité
- [ ] HTTPS actif avec certificat valide
- [ ] HSTS header présent
- [ ] CSP header présent
- [ ] `X-Frame-Options: DENY` présent
- [ ] Rate limiting actif sur `/login/pin`
- [ ] `.env` n'est PAS accessible publiquement
- [ ] `/storage/logs` n'est PAS accessible publiquement

---

## Rollback

```bash
# Si le déploiement échoue :
# 1. Restaurer le code précédent
git checkout <previous-tag>

# 2. Rollback la dernière migration si nécessaire
php artisan migrate:rollback --step=1

# 3. Recacher
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Redémarrer les workers
sudo supervisorctl restart ultraclean-worker:*
sudo supervisorctl restart ultraclean-reverb
```

---

## Maintenance

```bash
# Activer le mode maintenance
php artisan down --secret="<token-secret>"

# Accéder au site en maintenance via :
# https://votre-domaine.com/<token-secret>

# Désactiver le mode maintenance
php artisan up
```
