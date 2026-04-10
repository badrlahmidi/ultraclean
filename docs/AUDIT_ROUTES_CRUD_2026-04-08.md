# Audit Routes & CRUD — RitajPOS
**Date :** 2026-04-08  
**Source :** `php artisan route:list` (188 routes) + lecture complète de `routes/web.php` + inspection des contrôleurs et pages React  
**Périmètre :** Routes, redirections, complétude CRUD, sécurité middleware, cohérence frontend ↔ backend  

---

## 1. Résumé exécutif

| Dimension | Statut | Détail |
|---|---|---|
| Total routes enregistrées | ✅ 188 | Vérifiées avec `route:list` |
| Sécurité middleware | ✅ Sain | Tous les groupes correctement gardés |
| Redirections | ✅ Sain | `/` → login, `/dashboard` → rôle-dépendant |
| CRUD Admin complet | ⚠️ 3 gaps | `Purchases` (pas d'update), `Stock` (pas de show), `Suppliers` (pas de show) |
| Pages React orphelines | ⚠️ 1 | `Admin/Stock/Show.jsx` sans route `GET /admin/stock/{stock}` |
| Tests risky (sans assertions) | ⚠️ 5 | Stubs `AppointmentTest` — à compléter |
| Résultats tests post-fix | ✅ 362 passed / 0 failed | Fix `Setting::set()` arrays |

---

## 2. Inventaire des routes par groupe

### 2.1 Routes publiques (non authentifiées)

| Méthode | URI | Nom | Contrôleur | Notes sécurité |
|---|---|---|---|---|
| GET | `/` | — | `routes/web.php` closure | Redirige vers `login` |
| GET | `/ticket/{ulid}` | `ticket.public` | `PublicTicketController@show` | ⚠️ Requires `signed` middleware — prévient l'énumération |
| POST | `/webhooks/payment/{ulid}` | `webhooks.payment` | `WebhookController@paymentConfirmed` | CSRF exclu explicitement, protégé par HMAC |
| GET | `/client/checkin/{ulid}` | `client.checkin` | `Caissier\ClientController@checkin` | ⚠️ Public sans rate-limiting — voir §5 |
| POST | `/api/promotions/validate` | `promotions.validate` | `Admin\PromotionController@validate` | Requiert `auth` (tout rôle) ✅ |
| POST | `/login/pin` | `login.pin` | `Auth\PinLoginController@store` | `guest` + `throttle:10,1` ✅ |

### 2.2 Routes authentifiées communes (tous rôles)

| Méthode | URI | Nom | Contrôleur |
|---|---|---|---|
| GET | `/dashboard` | `dashboard` | closure — redirect rôle-dépendant |
| GET/PATCH/DELETE | `/profile` | `profile.*` | `ProfileController` |
| GET/POST/DELETE | `/notifications` | `notifications.*` | `NotificationController` |

### 2.3 Groupe Admin (`role:admin`, préfixe `/admin`)

#### Dashboard
| GET | `/admin` | `admin.dashboard` | `Admin\DashboardController@index` |

#### Utilisateurs (5 routes)
| Méthode | URI | Nom | Action |
|---|---|---|---|
| GET | `/admin/users` | `admin.users.index` | `index` |
| GET | `/admin/users/{user}` | `admin.users.show` | `show` |
| POST | `/admin/users` | `admin.users.store` | `store` |
| PUT | `/admin/users/{user}` | `admin.users.update` | `update` |
| DELETE | `/admin/users/{user}` | `admin.users.destroy` | `destroy` |
> ℹ️ Pas de route `create` (GET) — création via modal inline ✅

#### Rendez-vous / Calendrier (12 routes)
| Méthode | URI | Nom | Action |
|---|---|---|---|
| GET | `/admin/appointments` | `admin.appointments.index` | `index` |
| GET | `/admin/appointments/calendar` | `admin.appointments.calendar` | `calendar` |
| GET | `/admin/appointments/check-conflicts` | `admin.appointments.check-conflicts` | `checkConflicts` |
| GET | `/admin/appointments/vehicle-brands` | `admin.appointments.vehicle-brands` | `vehicleBrandSearch` |
| GET | `/admin/appointments/{appointment}` | `admin.appointments.show` | `show` |
| POST | `/admin/appointments` | `admin.appointments.store` | `store` |
| PUT | `/admin/appointments/{appointment}` | `admin.appointments.update` | `update` |
| DELETE | `/admin/appointments/{appointment}` | `admin.appointments.destroy` | `destroy` |
| POST | `/admin/appointments/{appointment}/confirm` | `admin.appointments.confirm` | `confirm` |
| POST | `/admin/appointments/{appointment}/convert-ticket` | `admin.appointments.convert` | `convertToTicket` |
| POST | `/admin/appointments/{appointment}/no-show` | `admin.appointments.no-show` | `markNoShow` |
| GET | `/admin/appointments/{appointment}/feasibility` | `admin.appointments.feasibility` | `feasibility` |

#### Clients Admin (11 routes)
| Méthode | URI | Nom |
|---|---|---|
| GET | `/admin/clients` | `admin.clients.index` |
| GET | `/admin/clients/create` | `admin.clients.create` |
| POST | `/admin/clients` | `admin.clients.store` |
| GET | `/admin/clients/{client}` | `admin.clients.show` |
| PUT | `/admin/clients/{client}` | `admin.clients.update` |
| DELETE | `/admin/clients/{client}` | `admin.clients.destroy` |
| POST | `/admin/clients/{id}/restore` | `admin.clients.restore` |
| GET | `/admin/clients/{client}/export-pdf` | `admin.clients.export-pdf` |
| POST | `/admin/clients/{client}/vehicles` | `admin.clients.vehicles.store` |
| PUT | `/admin/clients/{client}/vehicles/{vehicle}` | `admin.clients.vehicles.update` |
| DELETE | `/admin/clients/{client}/vehicles/{vehicle}` | `admin.clients.vehicles.destroy` |

#### Services (5 routes)
`index, store, update, destroy, show` — création/édition via modal ✅

#### Catégories de prix / VehicleTypes (4 routes)
`index, store, update, destroy` — pas de `show` (gestion inline) ✅

#### Rapports (7 routes)
`index, tickets, caisse, vehicles, shifts, export/pdf, export/csv`

#### Employés (1 route)
`index` uniquement — vue read-only des stats laveurs ✅ (intentionnel)

#### Promotions (5 routes)
`index, store, update, destroy, show`

#### Stock (7 routes)
`index, create, store, update, destroy, addMovement, movements`  
> ⚠️ **GAP** : pas de route `GET /admin/stock/{stock}` (`admin.stock.show`) — voir §4

#### Fidélité (3 routes)
`index, show, adjust`

#### Marques & Modèles véhicules (9 routes)
`index, store, import(CSV), export(CSV), update, destroy` + nested models: `storeModel, updateModel, destroyModel`

#### Paramètres (2 routes)
`index, update`

#### Devis (14 routes)
CRUD complet + lignes + actions métier : `send, accept, refuse, convert-invoice, downloadPdf`

#### Factures (15 routes)
CRUD complet + lignes + tickets + `tax, issue, markPaid, downloadPdf`

#### Templates récurrents (7 routes)
`index, store, update, destroy, show, toggleActive, runNow`

#### Journal d'audit (2 routes)
`index, export`

#### Paiements (2 routes)
`index, export` — lecture seule ✅

#### Fournisseurs (4 routes)
`index, store, update, destroy`  
> ⚠️ **GAP** : pas de route `show` ni page `Suppliers/Show.jsx` — voir §4

#### Achats (5 routes)
`index, create, store, show, destroy`  
> ⚠️ **GAP** : pas de route `update` (PUT) — voir §4

---

### 2.4 Groupe Caissier (`role:admin,caissier`, préfixe `/caisse`, 29 routes)

| Module | Routes disponibles | Notes |
|---|---|---|
| Dashboard | `GET /caisse` → `caissier.dashboard` | ✅ Confirmé dans `route:list` |
| Planning | `GET /caisse/planning` | Kanban laveurs |
| Rendez-vous | `index, calendar, convert-ticket` | Lecture + conversion uniquement — création/modification réservée admin |
| Tickets | `index, create, search, washer-queue, store, show, edit, update, destroy, status, pay` | CRUD complet ✅ |
| Shift | `index, history, store, close` | ✅ |
| Clients | `index, search, show, store, quickStore, update, destroy` | CRUD complet ✅ |
| Promotions | `index` uniquement | Lecture seule — écriture admin ✅ |

### 2.5 Groupe Laveur (`role:admin,caissier,laveur`, préfixe `/laveur`, 4 routes)

| Méthode | URI | Nom | Action |
|---|---|---|---|
| GET | `/laveur` | `laveur.queue` | `QueueController@index` |
| GET | `/laveur/stats` | `laveur.stats` | `StatsController@index` |
| PATCH | `/laveur/tickets/{ticket}/start` | `laveur.tickets.start` | `QueueController@start` |
| PATCH | `/laveur/tickets/{ticket}/complete` | `laveur.tickets.complete` | `QueueController@complete` |

---

## 3. Chaînes de redirection

```
GET /
  └─→ redirect('login')                                    [public, non authentifié]

GET /dashboard  (auth requis)
  ├─→ role=admin    → redirect('admin.dashboard')    GET /admin
  ├─→ role=caissier → redirect('caissier.dashboard') GET /caisse
  ├─→ role=laveur   → redirect('laveur.queue')       GET /laveur
  └─→ default       → redirect('login')

GET /admin   (role:admin)
  └─→ Admin\DashboardController@index → Inertia 'Admin/Dashboard'

GET /caisse  (role:admin,caissier)
  └─→ Caissier\DashboardController@index → Inertia 'Caissier/Dashboard'

GET /laveur  (role:admin,caissier,laveur)
  └─→ Laveur\QueueController@index → Inertia 'Laveur/Queue'
```

Toutes les redirections pointent vers des routes existantes ✅.  
La route `caissier.dashboard` (`GET /caisse`) est bien enregistrée — confirmé dans `php artisan route:list --path=caisse`.

---

## 4. Matrice de complétude CRUD

### Légende
- ✅ Présent et fonctionnel
- ⚠️ Absent mais probablement intentionnel
- ❌ Absent et potentiellement problématique

| Module | Create | Store | Show | Edit/Update | Destroy | Actions métier | Page React |
|---|---|---|---|---|---|---|---|
| **Admin** | | | | | | | |
| Appointments | ⚠️ modal | ✅ | ✅ | ✅ | ✅ | confirm, convert, no-show, feasibility | Index, Calendar, Show ✅ |
| Clients | ✅ | ✅ | ✅ | ✅ | ✅ | restore, export-pdf, vehicles CRUD | Create, Index, Show ✅ |
| Users | ⚠️ modal | ✅ | ✅ | ✅ | ✅ | — | Index, Show ✅ |
| Services | ⚠️ modal | ✅ | ✅ | ✅ | ✅ | stock-sync | Index, Show ✅ |
| VehicleTypes | ⚠️ modal | ✅ | ⚠️ inline | ✅ | ✅ | — | Index ✅ |
| Vehicles/Brands | ⚠️ modal | ✅ | ⚠️ inline | ✅ | ✅ | import, export, models CRUD | Index ✅ |
| Promotions | ⚠️ modal | ✅ | ✅ | ✅ | ✅ | — | Index, Show ✅ |
| **Stock** | ✅ | ✅ | ❌ route manquante | ✅ | ✅ | addMovement, movements | Index, Create, **Show.jsx orpheline** |
| Loyalty | — | — | ✅ | — | — | adjust | Index, Show ✅ |
| Quotes | ✅ | ✅ | ✅ | ✅ | ✅ | lines, send, accept, refuse, convert, pdf | Create, Index, Show ✅ |
| Invoices | ✅ | ✅ | ✅ | ✅ | ✅ | lines, tickets, tax, issue, pay, pdf | Create, Index, Show ✅ |
| TicketTemplates | ⚠️ modal | ✅ | ✅ | ✅ | ✅ | toggle, run-now | Index, Show ✅ |
| Employees | — | — | ⚠️ stats only | — | — | — | Index ✅ |
| Reports | — | — | ✅ multi-vues | — | — | export pdf/csv | Index ✅ |
| **Suppliers** | ⚠️ modal | ✅ | ❌ pas de show | ✅ | ✅ | — | Index uniquement |
| **Purchases** | ✅ | ✅ | ✅ | ❌ pas d'update | ✅ | — | Create, Index, Show ✅ |
| Payments | — | — | ⚠️ liste only | — | — | export | Index ✅ |
| ActivityLog | — | — | ⚠️ liste only | — | — | export | Index ✅ |
| Settings | — | — | ✅ | ✅ (POST) | — | — | Index ✅ |
| **Caissier** | | | | | | | |
| Tickets | ✅ | ✅ | ✅ | ✅ | ✅ | status, pay | Create, Edit, Index, Search, Show ✅ |
| Clients | ⚠️ inline | ✅ | ✅ | ✅ | ✅ | quickStore, search | Index, Show ✅ |
| Shift | — | ✅ | ✅ | ✅ (close) | — | — | Index, History ✅ |
| Appointments | — | — | ✅ (calendar) | — | — | convert-ticket | Index, Calendar ✅ |
| **Laveur** | | | | | | | |
| Queue | — | — | ✅ | — | — | start, complete | Queue ✅ |
| Stats | — | — | ✅ | — | — | — | Stats ✅ |

---

## 5. Analyse de sécurité

### 5.1 Stack middleware — état confirmé ✅

```
Requête
 │
 ├─ [Routes publiques]
 │   /ticket/{ulid}         → middleware: signed ✅
 │   /client/checkin/{ulid} → aucune auth ⚠️ (voir 5.3)
 │   /webhooks/payment      → CSRF exclu + HMAC ✅
 │   /login/pin             → guest + throttle:10,1 ✅
 │
 └─ [Routes protégées]
     auth → CheckRole → HandleInertiaRequests → Controller
     ├─ role:admin            → /admin/*
     ├─ role:admin,caissier   → /caisse/*
     └─ role:admin,caissier,laveur → /laveur/*
```

### 5.2 Chevauchement de routes admin ↔ caissier — intentionnel ✅

`POST /admin/appointments/{appointment}/convert-ticket` (role:admin)  
`POST /caisse/appointments/{appointment}/convert-ticket` (role:admin,caissier)  

Les deux routes utilisent `Admin\AppointmentController@convertToTicket`. Aucun contournement possible : le middleware valide le rôle avant d'entrer dans le contrôleur. ✅

### 5.3 ⚠️ Findings de sécurité mineurs

| # | Sévérité | Route | Problème | Recommandation |
|---|---|---|---|---|
| S-01 | 🟡 Faible | `GET /client/checkin/{ulid}` | Route publique sans rate-limiting. Les ULID sont opaques mais énumérables avec suffisamment de requêtes | Ajouter `->middleware('throttle:30,1')` |
| S-02 | 🔵 Info | `GET /register` | Route de création de compte ouverte. En production, désactiver si l'enregistrement public est non souhaité | Conditionner à `config('app.registration_enabled')` ou supprimer |

### 5.4 Formulaires sans `FormRequest` dédié (à auditer)

Les contrôleurs suivants utilisent `$request->validate()` inline plutôt que des `FormRequest` dédiées :
- `Admin\VehicleBrandController` — `store`, `storeModel`
- `Admin\SupplierController` — `store`, `update`
- `Admin\PurchaseController` — `store`

➜ ARCH-ITEM-1.2g : migrer vers des `FormRequest` avec `authorize()` délégant à une `Policy`.

---

## 6. Cohérence frontend ↔ backend

### 6.1 Pages React sans route correspondante (orphelines)

| Fichier | Route attendue | Statut |
|---|---|---|
| `Admin/Stock/Show.jsx` | `GET /admin/stock/{stock}` (`admin.stock.show`) | ❌ Route inexistante |

**Analyse :** `StockController::movements()` répond à `GET /admin/stock/{stock}/movements` et rend vraisemblablement `Admin/Stock/Show.jsx` avec les mouvements. Si c'est bien le cas, la page n'est pas orpheline mais la route s'appelle `admin.stock.movements`, pas `admin.stock.show`. À confirmer / documenter dans le contrôleur.

### 6.2 Routes sans page React correspondante

| Route | Action | Observation |
|---|---|---|
| `GET /caisse/tickets/washer-queue` | `TicketController@washerQueue` | Pas de `Caissier/Tickets/WasherQueue.jsx` — renvoie probablement du JSON (API interne) ou utilise une page existante |
| `GET /admin/invoices/create` | `InvoiceController@create` | `Admin/Invoices/Create.jsx` existe ✅ |
| `GET /admin/quotes/create` | `QuoteController@create` | `Admin/Quotes/Create.jsx` existe ✅ |

### 6.3 Pages React existantes — couverture complète

```
resources/js/Pages/
├── Admin/
│   ├── ActivityLog/Index.jsx          ✅ admin.activity-log.index
│   ├── Appointments/
│   │   ├── Calendar.jsx               ✅ admin.appointments.calendar
│   │   ├── Index.jsx                  ✅ admin.appointments.index
│   │   └── Show.jsx                   ✅ admin.appointments.show
│   ├── Clients/
│   │   ├── Create.jsx                 ✅ admin.clients.create
│   │   ├── Index.jsx                  ✅ admin.clients.index
│   │   └── Show.jsx                   ✅ admin.clients.show
│   ├── Dashboard.jsx                  ✅ admin.dashboard
│   ├── Employees/Index.jsx            ✅ admin.employees.index
│   ├── Invoices/
│   │   ├── Create.jsx                 ✅ admin.invoices.create
│   │   ├── Index.jsx                  ✅ admin.invoices.index
│   │   └── Show.jsx                   ✅ admin.invoices.show
│   ├── Loyalty/
│   │   ├── Index.jsx                  ✅ admin.loyalty.index
│   │   └── Show.jsx                   ✅ admin.loyalty.show
│   ├── Payments/Index.jsx             ✅ admin.payments.index
│   ├── PriceCategories/Index.jsx      ✅ admin.price-categories.index
│   ├── Promotions/
│   │   ├── Index.jsx                  ✅ admin.promotions.index
│   │   └── Show.jsx                   ✅ admin.promotions.show
│   ├── Purchases/
│   │   ├── Create.jsx                 ✅ admin.purchases.create
│   │   ├── Index.jsx                  ✅ admin.purchases.index
│   │   └── Show.jsx                   ✅ admin.purchases.show
│   ├── Quotes/
│   │   ├── Create.jsx                 ✅ admin.quotes.create
│   │   ├── Index.jsx                  ✅ admin.quotes.index
│   │   └── Show.jsx                   ✅ admin.quotes.show
│   ├── Reports/Index.jsx              ✅ admin.reports.index
│   ├── Services/
│   │   ├── Index.jsx                  ✅ admin.services.index
│   │   └── Show.jsx                   ✅ admin.services.show
│   ├── Settings/Index.jsx             ✅ admin.settings.index
│   ├── Stock/
│   │   ├── Create.jsx                 ✅ admin.stock.create
│   │   ├── Index.jsx                  ✅ admin.stock.index
│   │   └── Show.jsx                   ❌ admin.stock.show (route manquante)
│   ├── Suppliers/Index.jsx            ✅ admin.suppliers.index
│   │                                  ❌ pas de Show.jsx
│   ├── TicketTemplates/
│   │   ├── Index.jsx                  ✅ admin.ticket-templates.index
│   │   └── Show.jsx                   ✅ admin.ticket-templates.show
│   ├── Users/
│   │   ├── Index.jsx                  ✅ admin.users.index
│   │   └── Show.jsx                   ✅ admin.users.show
│   └── Vehicles/Index.jsx             ✅ admin.vehicles.index
├── Caissier/
│   ├── Clients/
│   │   ├── Index.jsx                  ✅ caissier.clients.index
│   │   └── Show.jsx                   ✅ caissier.clients.show
│   ├── Dashboard.jsx                  ✅ caissier.dashboard
│   ├── Planning.jsx                   ✅ caissier.planning
│   ├── Shift/
│   │   ├── History.jsx                ✅ caissier.shift.history
│   │   └── Index.jsx                  ✅ caissier.shift.index
│   └── Tickets/
│       ├── Create.jsx                 ✅ caissier.tickets.create
│       ├── Edit.jsx                   ✅ caissier.tickets.edit
│       ├── Index.jsx                  ✅ caissier.tickets.index
│       ├── Search.jsx                 ✅ caissier.tickets.search
│       └── Show.jsx                   ✅ caissier.tickets.show
└── Laveur/
    ├── Queue.jsx                      ✅ laveur.queue
    └── Stats.jsx                      ✅ laveur.stats
```

---

## 7. Gaps identifiés et recommandations

### 7.1 GAP-01 — `Admin/Stock/Show.jsx` orpheline ❌

**Problème :** La page `Admin/Stock/Show.jsx` existe mais aucune route `GET /admin/stock/{stock}` n'est enregistrée.  
**Impact :** La page est inaccessible ou est rendue par `admin.stock.movements` (`GET /admin/stock/{stock}/movements`) — ce qui est ambigu.  
**Recommandation :**  
```php
// routes/web.php — dans le groupe admin, section stock
Route::get('/stock/{stock}', [StockController::class, 'show'])->name('stock.show');
```
Et ajouter `StockController::show()` qui rend `Admin/Stock/Show` avec les données du produit + ses mouvements récents.

### 7.2 GAP-02 — `Admin\PurchaseController` sans `update` ❌

**Problème :** Aucune route `PUT /admin/purchases/{purchase}` (`admin.purchases.update`).  
**Impact :** Les bons de commande ne peuvent pas être modifiés après création.  
**Décision :** Si intentionnel (commandes immuables), documenter explicitement dans le contrôleur avec un commentaire. Sinon ajouter :
```php
Route::put('/purchases/{purchase}', [PurchaseController::class, 'update'])->name('purchases.update');
```

### 7.3 GAP-03 — `Admin\SupplierController` sans route `show` ni page ⚠️

**Problème :** Aucune route `GET /admin/suppliers/{supplier}` ni page `Admin/Suppliers/Show.jsx`.  
**Impact :** Les fournisseurs ne peuvent être qu'édités inline (modal). Acceptable pour un référentiel simple.  
**Recommandation :** Documenter comme choix de design (CRUD partiel intentionnel) ou ajouter show si la fiche fournisseur est nécessaire.

### 7.4 GAP-04 — Tests `AppointmentTest` sans assertions (5 tests risky) ⚠️

**Problème :** Les 5 méthodes de `Tests\Feature\AppointmentTest` utilisent `@test` doc-comment (déprécié PHPUnit 12) et ne contiennent aucune assertion.  
**Impact :** Dégradation du score de couverture, warnings PHPUnit.  
**Recommandation :** Compléter les 5 stubs avec des assertions réelles (ou les marquer `#[Test]` + `$this->markTestIncomplete()`).

### 7.5 GAP-05 — `client.checkin` sans rate-limiting ⚠️ (S-01)

**Problème :** `GET /client/checkin/{ulid}` est une route publique sans `throttle`.  
**Recommandation :**
```php
Route::get('/client/checkin/{ulid}', [ClientController::class, 'checkin'])
    ->name('client.checkin')
    ->middleware('throttle:30,1');
```

---

## 8. État post-corrections (session 2026-04-08)

### Fixes appliqués dans cette session

| Fichier | Fix | Résultat |
|---|---|---|
| `app/Models/Setting.php` | `Setting::set()` : encode automatiquement les arrays/bool/int/float avant `updateOrCreate` — évite "Array to string conversion" | ✅ 15 tests WasherScheduler + AppointmentScheduling débloqués |
| `app/Services/WasherScheduler.php` | `getMany` fix, timeline walker, closed-day branch | ✅ |
| `app/Services/LoyaltyService.php` | ParseError ligne 58 | ✅ |
| `app/Http/Controllers/Admin/AppointmentController.php` | `lockForUpdate`, transitions `confirmed→arrived→in_progress`, relation fix | ✅ |
| `app/Http/Controllers/Admin/ClientController.php` | `payment` singulier, `label`→`name` VehicleType | ✅ |
| `app/Http/Resources/ClientResource.php` | `array_key_exists` strict-mode safe | ✅ |
| `app/Http/Resources/TicketResource.php` | `array_key_exists` strict-mode safe | ✅ |
| `app/Models/Appointment.php` | `booted()` snapshot `vehicle_brand` | ✅ |
| `app/Models/Client.php` | ParseError ligne 65 | ✅ |
| `resources/js/Pages/Admin/Clients/Show.jsx` | `t.label` → `t.name` | ✅ |

### Score tests final

```
Tests: 362 passed, 0 failed, 5 risky (assertions manquantes dans AppointmentTest stubs)
Assertions: 775
Duration: ~75s
```

---

## 9. Actions prioritaires restantes

| # | Priorité | Description | Fichier(s) cible(s) |
|---|---|---|---|
| A-01 | 🟡 Medium | Ajouter route + méthode `StockController::show()` | `routes/web.php`, `Admin/StockController.php` |
| A-02 | 🟡 Medium | Compléter 5 stubs `AppointmentTest` avec assertions | `tests/Feature/AppointmentTest.php` |
| A-03 | 🟡 Medium | Décider/documenter immuabilité des `Purchases` | `Admin/PurchaseController.php` |
| A-04 | 🔵 Low | Rate-limiting sur `client.checkin` | `routes/web.php` |
| A-05 | 🔵 Low | Documenter `washer-queue` : JSON API ou page Inertia | `Caissier/TicketController.php` |
| A-06 | 🔵 Low | Migrer `@test` doc-comment → attribut `#[Test]` PHPUnit 11+ | `tests/Feature/AppointmentTest.php` |
