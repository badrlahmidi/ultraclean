# 🗓️ 04 — Plan de Déploiement par Sprints — UltraClean

> **Contraintes d'hébergement : Hostinger**
> - Plan recommandé : **Hostinger Business** (PHP 8.2+, MySQL 8.0, 100 GB SSD)
> - Alternative budget : **Hostinger Premium** (limitations : pas de cron job fiable → adapter les features)
> - **Pas de Docker, pas de Redis** en shared hosting → adapter les solutions (file-based cache, DB queue)
> - **Déploiement via Git + SSH** (Hostinger supporte SSH sur les plans Business+)

---

## Vue d'ensemble du planning

| Phase | Sprint | Durée | Objectif | Livrables |
|---|---|---|---|---|
| **Phase 0** | Setup | 2 jours | Infrastructure & Fondations | Repo, CI, DB, Auth |
| **Phase 1** | Sprint 1 | 1 semaine | Auth & Gestion du Personnel | Login, Rôles, CRUD Users |
| **Phase 2** | Sprint 2 | 1,5 semaine | Catalogue & Création Tickets | Services, VehicleTypes, Tickets |
| **Phase 3** | Sprint 3 | 1,5 semaine | File d'attente & Statuts | Kanban, Transitions, Laveur |
| **Phase 4** | Sprint 4 | 1 semaine | Encaissement & Paiements | Payment flow, Monnaie MAD |
| **Phase 5** | Sprint 5 | 1 semaine | Fidélité Clients | Loyalty, Points, Tiers |
| **Phase 6** | Sprint 6 | 1 semaine | Rapports & Dashboard | Stats, Exports PDF/CSV |
| **Phase 7** | Sprint 7 | 3 jours | Déploiement & Recette | Mise en prod Hostinger |
| **Phase 8** | Sprint 8+ | Continu | Améliorations post-MVP | Features avancées |

**Durée totale MVP : ~8 semaines**

---

## Phase 0 — Setup & Infrastructure (2 jours)

### Objectifs
Mettre en place les fondations techniques solides avant de coder la moindre feature.

### Tâches

#### 0.1 — Configuration du projet Laravel
- [ ] Configurer `.env` : DB MySQL, timezone `Africa/Casablanca`, locale `fr`
- [ ] Configurer `config/app.php` : name, timezone, locale, faker_locale
- [ ] Configurer `config/database.php` : MySQL (pas SQLite en production)
- [ ] Installer les packages requis (voir liste ci-dessous)
- [ ] Configurer Vite pour React + Inertia

#### 0.2 — Packages à installer

**PHP (Composer) :**
```
laravel/breeze (avec stack inertia-react)
spatie/laravel-permission  → Gestion des rôles/permissions
barryvdh/laravel-dompdf    → Export PDF
league/csv                 → Export CSV
```

**JavaScript (npm) :**
```
@inertiajs/react
recharts              → Graphiques dashboard
@radix-ui/react-*     → Composants headless (via shadcn/ui)
lucide-react          → Icônes
react-hot-toast       → Notifications toast
date-fns              → Manipulation dates (avec locale fr)
```

#### 0.3 — Structure des migrations (dans l'ordre)
Créer toutes les migrations dans l'ordre défini dans `01_database_schema.md`.

#### 0.4 — Seeders de base
- `SettingsSeeder` → valeurs par défaut
- `VehicleTypeSeeder` → 4 types (citadine, SUV, utilitaire, moto)
- `ServiceSeeder` → 5 services de base avec prix
- `ServiceVehiclePriceSeeder` → grille de prix complète
- `AdminUserSeeder` → compte admin initial (email/pass depuis `.env`)

#### 0.5 — Configuration Hostinger (préparer)
- [ ] Créer la base de données MySQL sur Hostinger
- [ ] Configurer le `.htaccess` pour pointer vers `/public`
- [ ] Préparer le script de déploiement `deploy.sh`
- [ ] Configurer les variables d'environnement Hostinger

#### 0.6 — Structure des dossiers React
```
resources/js/
├── Components/
│   ├── UI/              → Composants shadcn/ui customisés
│   ├── Tickets/         → Composants spécifiques tickets
│   ├── Clients/         → Composants clients/fidélité
│   └── Reports/         → Composants rapports
├── Layouts/
│   ├── AppLayout.jsx
│   ├── GuestLayout.jsx
│   └── WasherLayout.jsx
└── Pages/
    ├── Auth/
    ├── Dashboard/
    ├── Tickets/
    ├── Clients/
    ├── Reports/
    └── Admin/
```

### Critères de validation
- [ ] `php artisan migrate:fresh --seed` s'exécute sans erreur
- [ ] Login avec le compte admin fonctionne
- [ ] Build Vite sans erreur
- [ ] `.env` configuré avec timezone et locale corrects

---

## Phase 1 — Sprint 1 : Auth & Gestion du Personnel (1 semaine)

### Objectifs
L'admin peut se connecter, gérer son équipe et les rôles.

### Backend (Laravel)
- [ ] **Middleware `CheckRole`** → restreindre les routes par rôle
- [ ] **Route `/login/pin`** → authentification par PIN
- [ ] **Resource Controller `UserController`** :
  - `index` → liste des employés
  - `create/store` → création avec validation
  - `edit/update` → modification
  - `destroy` → soft delete (désactivation)
- [ ] **Règle de validation `UniquePin`** → PIN unique dans la table
- [ ] **Policy `UserPolicy`** → autoriser uniquement les admins
- [ ] **FormRequest `StoreUserRequest` & `UpdateUserRequest`**

### Frontend (React/Inertia)
- [ ] `Pages/Auth/Login.jsx` → formulaire email + mode PIN
- [ ] `Pages/Admin/Users/Index.jsx` → tableau avec filtres
- [ ] `Pages/Admin/Users/Create.jsx` → formulaire création
- [ ] `Pages/Admin/Users/Edit.jsx` → formulaire modification
- [ ] `Layouts/AppLayout.jsx` → navigation adaptée au rôle
- [ ] `Components/UI/RoleBadge.jsx` → badge coloré par rôle

### Tests à écrire
- [ ] `LoginTest` → connexion email/pass et PIN
- [ ] `UserManagementTest` → CRUD complet admin
- [ ] `RoleAccessTest` → vérifier qu'un caissier ne peut pas accéder à `/admin/users`

### Critères de validation Sprint 1
- [ ] Admin peut se connecter par email et par PIN
- [ ] Admin peut créer/modifier/désactiver un employé
- [ ] Caissier et Laveur voient uniquement les pages autorisées
- [ ] Redirection automatique après login selon le rôle

---

## Phase 2 — Sprint 2 : Catalogue & Création de Tickets (1,5 semaine)

### Objectifs
L'admin gère les services, le caissier crée un ticket complet.

### Backend (Laravel)
- [ ] **`VehicleTypeController`** → CRUD (admin)
- [ ] **`ServiceController`** → CRUD avec gestion des prix par type véhicule
- [ ] **`TicketController`** :
  - `index` → liste avec filtres et pagination
  - `create` → données pour le wizard (services, vehicle_types, clients)
  - `store` → création ticket + ticket_services + calcul totaux
- [ ] **`TicketNumberGenerator`** → service générant `TK-YYYYMMDD-XXXX`
- [ ] **`TicketService` (service class)** → logique de calcul des totaux, remises fidélité
- [ ] **FormRequest `StoreTicketRequest`** → validation complète
- [ ] **Observers `TicketObserver`** → log dans `activity_logs` à chaque changement

### Frontend (React/Inertia)
- [ ] `Pages/Admin/Services/Index.jsx` → tableau avec prix inline
- [ ] `Pages/Admin/Services/Create.jsx` → formulaire multi-prix
- [ ] `Pages/Admin/Services/Edit.jsx`
- [ ] `Pages/Admin/VehicleTypes/Index.jsx`
- [ ] `Pages/Tickets/Create.jsx` → wizard 4 étapes
- [ ] `Components/Tickets/VehicleTypeSelector.jsx`
- [ ] `Components/Tickets/ServiceSelector.jsx`
- [ ] `Components/Tickets/TicketSummary.jsx`
- [ ] `Components/Clients/ClientSearchInput.jsx`
- [ ] `Components/UI/MoneyInput.jsx` (MAD → centimes)
- [ ] `Components/UI/MoneyDisplay.jsx` (centimes → MAD formaté)

### Logique métier critique
- Calcul temps réel du total dans le wizard (côté client)
- Calcul final et validation des totaux côté serveur (jamais faire confiance au client)
- Génération du numéro de ticket atomique (éviter les doublons)

### Tests à écrire
- [ ] `ServiceManagementTest`
- [ ] `TicketCreationTest` → avec/sans client, avec/sans fidélité
- [ ] `TicketTotalsCalculationTest` → unitaire sur le TicketService

### Critères de validation Sprint 2
- [ ] Admin peut créer/modifier/désactiver un service avec ses prix
- [ ] Caissier peut créer un ticket complet en moins de 2 minutes
- [ ] Les totaux sont corrects (centimes MAD, arrondis)
- [ ] Numéros de tickets uniques et formatés correctement

---

## Phase 3 — Sprint 3 : File d'Attente & Transitions de Statut (1,5 semaine)

### Objectifs
La file d'attente est visible en temps réel, les laveurs peuvent mettre à jour leurs tickets.

### Backend (Laravel)
- [ ] **`TicketController@updateStatus`** → transition de statut avec validation des règles
- [ ] **`TicketStatusTransitionService`** → encapsuler la machine à états
- [ ] **`ShiftController`** → open/close shift
- [ ] **`AssignWasherAction`** → assigner un laveur à un ticket
- [ ] **Polling endpoint `GET /tickets/active`** → retourne uniquement les tickets actifs (léger)
- [ ] **Gates & Policies** → qui peut faire quelle transition

### Frontend (React/Inertia)
- [ ] `Pages/Tickets/Index.jsx` → vue Kanban + vue liste
- [ ] `Components/Tickets/TicketCard.jsx` → carte avec actions contextuelles
- [ ] `Components/Tickets/TicketStatusBadge.jsx`
- [ ] `Components/Tickets/AssignWasherModal.jsx`
- [ ] `Components/Tickets/StatusTransitionButton.jsx`
- [ ] `Pages/Shifts/Open.jsx` et `Close.jsx`
- [ ] Hook `usePolling(url, interval)` → actualisation auto des tickets
- [ ] `Pages/Tickets/Show.jsx` → détail complet du ticket

### Gestion des laveurs (WasherLayout)
- [ ] `Pages/Dashboard/LaveurDashboard.jsx`
- [ ] Vue mes tickets avec gros boutons (UX tablette)
- [ ] Confirmation modale avant transition

### Tests à écrire
- [ ] `TicketStatusTransitionTest` → toutes les transitions valides/invalides
- [ ] `ShiftManagementTest`
- [ ] `WasherAccessTest` → laveur ne voit que ses tickets

### Critères de validation Sprint 3
- [ ] File d'attente s'actualise toutes les 30s sans rechargement complet
- [ ] Transitions de statut respectent les règles métier (rejeter les transitions invalides)
- [ ] Laveur peut démarrer/terminer ses tickets depuis la tablette
- [ ] Shift obligatoire pour créer un ticket (si paramètre activé)

---

## Phase 4 — Sprint 4 : Encaissement & Paiements (1 semaine)

### Objectifs
Flux de paiement complet avec gestion des espèces (rendu monnaie) en MAD.

### Backend (Laravel)
- [ ] **`PaymentController@store`** → valider et enregistrer le paiement
- [ ] **`PaymentService`** → logique de paiement mixte, calcul rendu monnaie
- [ ] **Règles de validation paiement :** montant total cohérent, montant espèces ≥ total si cash
- [ ] **Transition `completed → paid`** déclenchée par le paiement (atomique avec DB transaction)
- [ ] **`ReceiptController`** → génération reçu PDF (dompdf)

### Frontend (React/Inertia)
- [ ] `Pages/Tickets/Pay.jsx` → écran d'encaissement complet
- [ ] `Components/Payment/PaymentMethodSelector.jsx`
- [ ] `Components/Payment/CashPaymentForm.jsx` → calcul rendu monnaie temps réel
- [ ] `Components/Payment/MixedPaymentForm.jsx`
- [ ] `Components/Payment/ChangeDisplay.jsx` → affichage grand format monnaie rendue
- [ ] `Components/Payment/ReceiptPreview.jsx`

### Contrainte MAD critique
- Input caissier en MAD (ex: "100")
- Conversion en centimes côté JS avant envoi (×100)
- Validation côté serveur (centimes)
- Affichage toujours en MAD avec 2 décimales

### Tests à écrire
- [ ] `PaymentProcessingTest` → cash, card, mobile, mixed
- [ ] `ChangeCalculationTest` → rendu monnaie exact
- [ ] `DoublePaymentPreventionTest` → verrou optimiste
- [ ] `ReceiptGenerationTest`

### Critères de validation Sprint 4
- [ ] Paiement cash calcule et affiche le rendu monnaie instantanément
- [ ] Paiement mixte distribue le montant correctement
- [ ] Impossible de payer deux fois le même ticket
- [ ] Reçu PDF générable

---

## Phase 5 — Sprint 5 : Fidélité Clients (1 semaine)

### Objectifs
Programme de fidélité complet : inscription, accumulation de points, remises automatiques.

### Backend (Laravel)
- [ ] **`ClientController`** → CRUD complet
- [ ] **`LoyaltyService`** :
  - `calculateEarnedPoints(ticket)` → points à créditer
  - `applyTierDiscount(subtotal, tier)` → remise selon palier
  - `redeemPoints(account, points)` → utiliser des points
  - `recalculateTier(account)` → réévaluer le tier après chaque transaction
- [ ] **`LoyaltyAccountController`** → consulter/ajuster un compte
- [ ] **Intégration avec `PaymentService`** → créditer les points lors du paiement
- [ ] **`CardNumberGenerator`** → génération `ULC-XXXXX` unique

### Frontend (React/Inertia)
- [ ] `Pages/Clients/Index.jsx` → tableau clients avec tier badge
- [ ] `Pages/Clients/Create.jsx`
- [ ] `Pages/Clients/Show.jsx` → fiche complète + historique
- [ ] `Pages/Clients/Edit.jsx`
- [ ] `Components/Loyalty/LoyaltyTierBadge.jsx`
- [ ] `Components/Loyalty/PointsBalance.jsx`
- [ ] `Components/Loyalty/LoyaltyRedemptionForm.jsx` → dans le flux paiement
- [ ] `Components/Clients/ClientSearchInput.jsx` → avec résultats en overlay

### Tests à écrire
- [ ] `LoyaltyPointsEarnTest`
- [ ] `LoyaltyTierCalculationTest`
- [ ] `LoyaltyRedemptionTest`
- [ ] `ClientManagementTest`

### Critères de validation Sprint 5
- [ ] Points crédités automatiquement après chaque paiement
- [ ] Tier recalculé après chaque transaction (standard → silver → gold)
- [ ] Remise fidélité appliquée automatiquement à la création du ticket
- [ ] Caissier peut retrouver un client par téléphone en < 3 secondes

---

## Phase 6 — Sprint 6 : Rapports & Dashboard (1 semaine)

### Objectifs
Tableaux de bord riches et rapports exportables pour l'admin.

### Backend (Laravel)
- [ ] **`ReportController`** → endpoints pour rapports jour/mois/shift
- [ ] **`DashboardController`** → stats temps réel agrégées
- [ ] **`ReportService`** → requêtes optimisées avec groupBy, entre dates en timezone MAR
- [ ] **`PdfExportService`** → templates dompdf pour rapports
- [ ] **`CsvExportService`** → export via `league/csv`
- [ ] **Optimisation requêtes :** utiliser les index définis, limiter les N+1 avec eager loading

### Frontend (React/Inertia)
- [ ] `Pages/Dashboard/AdminDashboard.jsx` → composants finaux
- [ ] `Pages/Reports/Index.jsx` → sélecteur période
- [ ] `Pages/Reports/Daily.jsx` → rapport journalier
- [ ] `Pages/Reports/Monthly.jsx` → rapport mensuel
- [ ] `Pages/Reports/Shifts.jsx` → rapport de caisse
- [ ] `Components/Reports/RevenueChart.jsx` (Recharts)
- [ ] `Components/Reports/PaymentMethodPieChart.jsx`
- [ ] `Components/Reports/ServicesSalesTable.jsx`
- [ ] `Components/Reports/WasherPerformanceTable.jsx`
- [ ] `Components/UI/DateRangePicker.jsx`
- [ ] `Components/UI/ExportButton.jsx`

### Critères de validation Sprint 6
- [ ] Rapport journalier exact (CA, tickets, méthodes de paiement)
- [ ] Export PDF lisible et professionnel
- [ ] Export CSV importable dans Excel
- [ ] Dashboard admin se charge en < 2 secondes
- [ ] Dates correctes en timezone `Africa/Casablanca`

---

## Phase 7 — Sprint 7 : Déploiement Hostinger & Recette (3 jours)

### Objectifs
Mise en production sécurisée sur Hostinger.

### 7.1 — Préparation

**Configuration `.env` production :**
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://votre-domaine.ma
APP_TIMEZONE=Africa/Casablanca
APP_LOCALE=fr

DB_CONNECTION=mysql
DB_HOST=<hostinger-mysql-host>
DB_DATABASE=<db_name>
DB_USERNAME=<db_user>
DB_PASSWORD=<db_password>

CACHE_DRIVER=file       # Pas de Redis sur shared hosting
QUEUE_CONNECTION=database
SESSION_DRIVER=file

MAIL_MAILER=smtp
MAIL_HOST=<hostinger-smtp>
```

**`.htaccess` à la racine du domaine :**
```apache
RewriteEngine On
RewriteRule ^(.*)$ public/$1 [L]
```

### 7.2 — Script de déploiement `deploy.sh`

```bash
# Exécuté via SSH sur Hostinger
php artisan down --render="errors::503"
git pull origin main
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link
php artisan up
```

### 7.3 — Checklist de sécurité pré-production

- [ ] `APP_DEBUG=false` en production
- [ ] `APP_KEY` généré et sauvegardé
- [ ] HTTPS forcé (certificat SSL Hostinger Let's Encrypt)
- [ ] Headers de sécurité dans `.htaccess` (X-Frame-Options, CSP)
- [ ] Aucun mot de passe dans le code (tout en `.env`)
- [ ] Compte admin initial changé après premier déploiement
- [ ] Sauvegardes automatiques activées (Hostinger backup)
- [ ] Logs Laravel configurés (canal `daily`, rétention 14 jours)

### 7.4 — Recette fonctionnelle

**Scénario 1 : Création ticket complet**
1. Connexion caissier → ouvrir shift → créer ticket SUV → 2 services → client fidèle → remise silver → encaissement espèces → rendu monnaie correct ✓

**Scénario 2 : Flux laveur**
1. Connexion laveur → voir tickets assignés → démarrer → terminer ✓

**Scénario 3 : Fidélité**
1. Nouveau client → 3 achats → vérifier accumulation points → passer silver → remise appliquée ✓

**Scénario 4 : Rapport journalier**
1. Connexion admin → rapport du jour → totaux corrects → export PDF ✓

### Critères de validation Phase 7
- [ ] Application accessible sur domaine HTTPS
- [ ] Tous les scénarios de recette validés
- [ ] Temps de réponse moyen < 500ms (pages clés)
- [ ] 0 erreur dans `storage/logs/laravel.log`
- [ ] Formation de 30 min suffisante pour un caissier

---

## Phase 8 — Post-MVP : Améliorations Futures

> Ces fonctionnalités sont hors scope MVP mais architecturalement prévues.

### 8.1 — Améliorations techniques
- [ ] **WebSockets (Reverb)** → remplacer le polling par du temps réel natif
- [ ] **Redis** → si migration vers VPS Hostinger (meilleure performance cache/session)
- [ ] **Queue workers** → emails, exports async (VPS requis)
- [ ] **PWA (Progressive Web App)** → installer l'app sur tablette sans app store
- [ ] **Mode hors ligne** → créer des tickets sans connexion (sync au retour)

### 8.2 — Fonctionnalités métier
- [ ] **Abonnements mensuels** → forfait "10 lavages/mois" pour clients réguliers
- [ ] **Notifications WhatsApp** → via Twilio ou InfoBip API (très populaire au Maroc)
- [ ] **Impression reçu thermique** → intégration imprimante ESC/POS (Star, Epson)
- [ ] **QR Code ticket** → client peut suivre l'avancement de son véhicule sur son téléphone
- [ ] **Multi-centres** → gestion d'une chaîne de laveries (multitenancy)
- [ ] **Application mobile laveur** → Flutter/React Native pour les laveurs en déplacement
- [ ] **Gestion des stocks** → consommables (shampooing, cire, etc.)
- [ ] **Rendez-vous en ligne** → les clients réservent leur créneau

### 8.3 — Analytics avancés
- [ ] **Heure de pointe** → quand l'affluence est maximale (aide à planifier les effectifs)
- [ ] **Taux de rétention client** → clients qui reviennent vs nouveaux
- [ ] **Comparaison périodes** → ce mois vs mois dernier
- [ ] **Objectifs journaliers** → définir un CA cible et visualiser la progression

---

## Récapitulatif des contraintes Hostinger

| Contrainte | Solution MVP | Solution Future (VPS) |
|---|---|---|
| Pas de Redis | Cache `file` | Redis via VPS |
| Pas de worker permanent | Queue `database` + cron Hostinger | Redis Queue + Supervisor |
| Temps réel | Polling 30s (Inertia reload) | Laravel Reverb (WebSocket) |
| Emails | SMTP Hostinger (limites: 500/jour) | Mailgun ou Brevo |
| Cron jobs | Hostinger Cron (1 req/min minimum) | Laravel Scheduler normal |
| SSL | Let's Encrypt intégré Hostinger | Pareil |
| PHP | 8.2 disponible sur Business+ | Pareil |
| Stockage assets | Hostinger `public/build/` | CDN Cloudflare (gratuit) |

---

## Définition of Done (DoD) — standard pour chaque Sprint

Une tâche est considérée **terminée** si et seulement si :
1. ✅ Le code est commité sur la branche `main` (ou PR mergée)
2. ✅ Les tests associés passent (`php artisan test`)
3. ✅ La feature est testée manuellement dans le navigateur
4. ✅ Aucune régression sur les features des sprints précédents
5. ✅ Les erreurs de lint (Pint pour PHP, ESLint pour JS) sont corrigées
6. ✅ La migration (si applicable) s'exécute proprement sur une DB vide

---

*Document généré le 27/03/2026 — Version 1.0 — UltraClean MVP*
