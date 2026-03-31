# 📊 01 — Schéma de Base de Données — UltraClean

> **Contexte :** Application de gestion pour centre de lavage automobile.
> **SGBD :** MySQL (compatible Hostinger Shared/VPS)
> **Timezone serveur :** `Africa/Casablanca` (UTC+1, fixe depuis 2018)
> **Monnaie :** MAD — les montants sont stockés en **centimes** (entiers) pour éviter tout problème de virgule flottante. Ex: 50,00 MAD = `5000`.

---

## Table des matières

1. [Conventions](#conventions)
2. [Diagramme des relations (ERD textuel)](#erd)
3. [Tables détaillées](#tables)
4. [Index & Performance](#index)
5. [Notes de migration](#notes)

---

## 1. Conventions

| Règle | Détail |
|---|---|
| Nommage | `snake_case`, pluriel pour les tables |
| Clés primaires | `id` BIGINT UNSIGNED AUTO_INCREMENT |
| Timestamps | `created_at` / `updated_at` (TIMESTAMP, nullable) |
| Soft delete | `deleted_at` TIMESTAMP NULL sur les entités critiques |
| Montants | UNSIGNED INT (centimes MAD) — jamais de DECIMAL pour les prix |
| Booléens | TINYINT(1) — 0/1 |
| Statuts | ENUM ou VARCHAR(30) avec contrainte applicative |
| UUID public | `ulid` CHAR(26) sur les tickets (lisible, non séquentiel en URL) |

---

## 2. Diagramme des relations (ERD textuel)

```
users (staff)
  │
  ├──< shifts (une session de travail par utilisateur)
  │
  ├──< tickets (créés par un caissier, assignés à un laveur)
  │       │
  │       ├──< ticket_services (lignes de détail — N services par ticket)
  │       │       └──> services (catalogue)
  │       │               └──> vehicle_type_prices (prix selon type véhicule)
  │       │
  │       ├──> vehicle_types (citadine, SUV, utilitaire...)
  │       ├──> clients (optionnel — pour la fidélité)
  │       └──< payments (1 paiement principal, remboursements éventuels)
  │
clients
  └──< loyalty_accounts (1 compte fidélité par client)
          └──< loyalty_transactions (historique des points)

settings (clé/valeur globale)
activity_logs (audit trail)
```

---

## 3. Tables détaillées

---

### 3.1 `users` — Personnel du centre

```
users
├── id                  BIGINT UNSIGNED PK
├── name                VARCHAR(100) NOT NULL
├── email               VARCHAR(150) UNIQUE NOT NULL
├── phone               VARCHAR(20) NULL          -- WhatsApp/contact
├── password            VARCHAR(255) NOT NULL
├── role                ENUM('admin','caissier','laveur') NOT NULL
├── pin_code            VARCHAR(6) NULL            -- PIN rapide pour tablette caisse
├── is_active           TINYINT(1) DEFAULT 1       -- désactiver sans supprimer
├── avatar_path         VARCHAR(255) NULL
├── remember_token      VARCHAR(100) NULL
├── created_at          TIMESTAMP NULL
├── updated_at          TIMESTAMP NULL
└── deleted_at          TIMESTAMP NULL             -- soft delete
```

**Règles métier :**
- Un `admin` peut tout faire.
- Un `caissier` crée les tickets et encaisse.
- Un `laveur` ne peut que voir et mettre à jour le statut de ses tickets assignés.
- Le `pin_code` est un raccourci pour se (re)connecter sur la tablette caisse sans taper son email — haché avec `bcrypt`.

---

### 3.2 `vehicle_types` — Types de véhicules

```
vehicle_types
├── id                  BIGINT UNSIGNED PK
├── name                VARCHAR(50) NOT NULL       -- ex: "Citadine", "SUV", "Utilitaire"
├── slug                VARCHAR(50) UNIQUE NOT NULL
├── icon                VARCHAR(50) NULL           -- nom d'icône (ex: 'car', 'truck')
├── sort_order          TINYINT UNSIGNED DEFAULT 0
├── is_active           TINYINT(1) DEFAULT 1
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

**Données initiales (seed) :**
| Slug | Nom | Icône |
|---|---|---|
| `citadine` | Citadine / Berline | car |
| `suv` | SUV / 4x4 | suv |
| `utilitaire` | Utilitaire / Van | truck |
| `moto` | Moto / Scooter | motorcycle |

---

### 3.3 `services` — Catalogue des prestations

```
services
├── id                  BIGINT UNSIGNED PK
├── name                VARCHAR(100) NOT NULL      -- ex: "Lavage Extérieur"
├── description         TEXT NULL
├── color               VARCHAR(7) NULL            -- code HEX pour le badge UI (#3B82F6)
├── category            VARCHAR(60) NOT NULL DEFAULT 'Lavage'  -- regroupement UI (migration 20)
├── duration_minutes    TINYINT UNSIGNED DEFAULT 15 -- durée estimée
├── is_active           TINYINT(1) DEFAULT 1
├── sort_order          TINYINT UNSIGNED DEFAULT 0
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL

INDEX idx_services_category ON services(category)
```

**Catégories suggérées :** `Lavage`, `Détailing`, `Intérieur`, `Options`

---

### 3.4 `service_vehicle_prices` — Prix par service × type de véhicule

> Séparation prix/service pour gérer la tarification différenciée (SUV plus cher que citadine).

```
service_vehicle_prices
├── id                  BIGINT UNSIGNED PK
├── service_id          FK → services.id (CASCADE DELETE)
├── vehicle_type_id     FK → vehicle_types.id (CASCADE DELETE)
├── price_cents         UNSIGNED INT NOT NULL      -- en centimes MAD
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL

UNIQUE KEY (service_id, vehicle_type_id)
```

**Exemple :**
| Service | Citadine | SUV | Utilitaire |
|---|---|---|---|
| Lavage extérieur | 3000 (30 MAD) | 4500 (45 MAD) | 6000 (60 MAD) |
| Lavage complet | 7000 (70 MAD) | 10000 (100 MAD) | 13000 (130 MAD) |
| Aspiration intérieure | 2000 (20 MAD) | 3000 (30 MAD) | 3500 (35 MAD) |

---

### 3.5 `clients` — Clients enregistrés (pour la fidélité)

> L'enregistrement est **optionnel**. Un ticket peut exister sans client.

```
clients
├── id                  BIGINT UNSIGNED PK
├── name                VARCHAR(100) NOT NULL
├── phone               VARCHAR(20) UNIQUE NOT NULL -- identifiant principal
├── email               VARCHAR(150) NULL
├── is_company          TINYINT(1) DEFAULT 0       -- true = entreprise (migration 18)
├── ice                 VARCHAR(15) UNIQUE NULL     -- Identifiant Commun de l'Entreprise (migration 18)
├── vehicle_plate       VARCHAR(20) NULL           -- plaque d'immatriculation mémorisée
├── preferred_vehicle_type_id FK → vehicle_types.id NULL
├── notes               TEXT NULL                  -- notes caissier (ex: "allergique aux produits X")
├── created_at          TIMESTAMP NULL
├── updated_at          TIMESTAMP NULL
└── deleted_at          TIMESTAMP NULL
```

**Règles :** `ice` est requis et doit faire exactement 15 chiffres si `is_company = true`.

---

### 3.5b `vehicle_brands` — Marques de véhicules (migration 16)

```
vehicle_brands
├── id                  BIGINT UNSIGNED PK
├── name                VARCHAR(80) NOT NULL       -- ex: "Dacia"
├── slug                VARCHAR(80) UNIQUE NOT NULL -- ex: "dacia"
├── logo_path           VARCHAR(255) NULL          -- chemin relatif storage/ (public disk)
├── country             VARCHAR(60) NULL           -- ex: "France"
├── sort_order          TINYINT UNSIGNED DEFAULT 0
├── is_active           TINYINT(1) DEFAULT 1
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

**Accesseur `logo_url` :** retourne `asset('storage/' . logo_path)` si défini, sinon `null`.

**Données initiales (VehicleBrandModelSeeder) :** Dacia, Peugeot, Renault, Toyota, Hyundai, Kia, Volkswagen, Mercedes-Benz, BMW, Ford, Citroën, Fiat, Nissan, Seat, Opel.

---

### 3.5c `vehicle_models` — Modèles de véhicules (migration 17)

```
vehicle_models
├── id                  BIGINT UNSIGNED PK
├── brand_id            FK → vehicle_brands.id (CASCADE DELETE)
├── name                VARCHAR(80) NOT NULL       -- ex: "Sandero"
├── slug                VARCHAR(80) NOT NULL       -- ex: "sandero"
├── suggested_vehicle_type_id FK → vehicle_types.id NULL -- pré-remplit la catégorie tarifaire
├── sort_order          TINYINT UNSIGNED DEFAULT 0
├── is_active           TINYINT(1) DEFAULT 1
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL

UNIQUE KEY (brand_id, slug)
```

**Utilisation UI :** Quand un modèle est sélectionné, `suggested_vehicle_type_id` pré-remplit automatiquement la sélection de catégorie tarifaire (Citadine, SUV…) dans le formulaire de création de ticket.

---

### 3.6 `loyalty_accounts` — Comptes fidélité

```
loyalty_accounts
├── id                  BIGINT UNSIGNED PK
├── client_id           FK → clients.id (CASCADE DELETE) UNIQUE
├── card_number         VARCHAR(20) UNIQUE NOT NULL -- ex: "ULC-00001"
├── points_balance      INT UNSIGNED DEFAULT 0
├── total_visits        INT UNSIGNED DEFAULT 0
├── total_spent_cents   BIGINT UNSIGNED DEFAULT 0
├── tier                ENUM('standard','silver','gold') DEFAULT 'standard'
├── is_active           TINYINT(1) DEFAULT 1
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

**Règle de tier (configurable dans `settings`) :**
- `standard` : 0–999 points
- `silver` : 1000–4999 points → 5% de réduction automatique
- `gold` : 5000+ points → 10% de réduction automatique

---

### 3.7 `loyalty_transactions` — Historique des points

```
loyalty_transactions
├── id                  BIGINT UNSIGNED PK
├── loyalty_account_id  FK → loyalty_accounts.id
├── ticket_id           FK → tickets.id NULL
├── type                ENUM('earn','redeem','adjust','expire') NOT NULL
├── points              INT NOT NULL               -- positif ou négatif
├── balance_after       INT UNSIGNED NOT NULL
├── note                VARCHAR(255) NULL
├── created_by          FK → users.id NULL
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

---

### 3.8 `tickets` — Entité centrale (ordre de travail)

```
tickets
├── id                  BIGINT UNSIGNED PK
├── ulid                CHAR(26) UNIQUE NOT NULL   -- identifiant public URL-safe
├── ticket_number       VARCHAR(20) UNIQUE NOT NULL -- ex: "TK-20260327-0042" (lisible)
├── status              ENUM('pending','in_progress','completed','paid','cancelled') DEFAULT 'pending'
├── vehicle_brand       VARCHAR(100) NULL          -- snapshot texte "Dacia Sandero"
├── vehicle_brand_id    FK → vehicle_brands.id NULL ON DELETE SET NULL  (migration 19)
├── vehicle_model_id    FK → vehicle_models.id NULL ON DELETE SET NULL  (migration 19)
├── vehicle_type_id     FK → vehicle_types.id NOT NULL
├── vehicle_plate       VARCHAR(20) NULL
├── client_id           FK → clients.id NULL       -- optionnel
├── created_by          FK → users.id NOT NULL     -- caissier qui crée
├── assigned_to         FK → users.id NULL         -- laveur assigné
├── paid_by             FK → users.id NULL         -- caissier qui encaisse
├── shift_id            FK → shifts.id NULL        -- session de travail associée
├── subtotal_cents      UNSIGNED INT DEFAULT 0     -- somme des lignes
├── discount_cents      UNSIGNED INT DEFAULT 0     -- remise globale
├── total_cents         UNSIGNED INT DEFAULT 0     -- subtotal - discount
├── loyalty_points_earned INT UNSIGNED DEFAULT 0
├── loyalty_points_used   INT UNSIGNED DEFAULT 0
├── notes               TEXT NULL
├── cancelled_reason    VARCHAR(255) NULL
├── started_at          TIMESTAMP NULL
├── completed_at        TIMESTAMP NULL
├── paid_at             TIMESTAMP NULL
├── created_at          TIMESTAMP NULL
├── updated_at          TIMESTAMP NULL
└── deleted_at          TIMESTAMP NULL
```

**Machine à états du statut :**
```
[pending] ──(laveur démarre)──> [in_progress]
                                      │
                              (laveur termine)
                                      │
                                [completed] ──(caissier encaisse)──> [paid]
                                      │
                            (admin/caissier annule)
                                      │
                               [cancelled]

[pending] ──(admin/caissier annule)──> [cancelled]
```

**Règles de transition :**
| Transition | Acteur autorisé | Action requise |
|---|---|---|
| `pending` → `in_progress` | laveur, caissier, admin | Assignation obligatoire (`assigned_to`) |
| `in_progress` → `completed` | laveur assigné, admin | Remplissage de `completed_at` |
| `completed` → `paid` | caissier, admin | Création d'un enregistrement `payments` |
| `any` → `cancelled` | caissier, admin | Remplissage de `cancelled_reason` |
| `paid` → `paid` | ❌ Impossible | — |

---

### 3.9 `ticket_services` — Lignes de détail du ticket

```
ticket_services
├── id                  BIGINT UNSIGNED PK
├── ticket_id           FK → tickets.id (CASCADE DELETE)
├── service_id          FK → services.id
├── vehicle_type_id     FK → vehicle_types.id       -- snapshot au moment de la création
├── service_name        VARCHAR(100) NOT NULL        -- snapshot (si service renommé plus tard)
├── unit_price_cents    UNSIGNED INT NOT NULL        -- prix unitaire au moment de la vente
├── quantity            TINYINT UNSIGNED DEFAULT 1
├── discount_cents      UNSIGNED INT DEFAULT 0
├── line_total_cents    UNSIGNED INT NOT NULL        -- (unit_price * qty) - discount
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

> **Principe du snapshot :** On copie `service_name` et `unit_price_cents` au moment de la création pour que l'historique reste correct même si les prix changent.

---

### 3.10 `payments` — Enregistrements de paiement

```
payments
├── id                  BIGINT UNSIGNED PK
├── ticket_id           FK → tickets.id
├── amount_cents        UNSIGNED INT NOT NULL
├── method              ENUM('cash','card','mobile','loyalty_points','mixed') NOT NULL
├── amount_cash_cents   UNSIGNED INT DEFAULT 0      -- si méthode mixte
├── amount_card_cents   UNSIGNED INT DEFAULT 0
├── amount_mobile_cents UNSIGNED INT DEFAULT 0
├── amount_loyalty_cents UNSIGNED INT DEFAULT 0     -- valeur monétaire des points utilisés
├── change_given_cents  UNSIGNED INT DEFAULT 0      -- monnaie rendue (cash)
├── reference           VARCHAR(100) NULL           -- ref TPE ou reçu mobile
├── processed_by        FK → users.id NOT NULL
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

---

### 3.11 `shifts` — Sessions de caisse (ouverture/fermeture)

```
shifts
├── id                  BIGINT UNSIGNED PK
├── user_id             FK → users.id
├── opened_at           TIMESTAMP NOT NULL
├── closed_at           TIMESTAMP NULL              -- NULL si shift en cours
├── opening_cash_cents  UNSIGNED INT DEFAULT 0      -- fond de caisse d'ouverture
├── closing_cash_cents  UNSIGNED INT DEFAULT 0      -- fond de caisse à la fermeture
├── expected_cash_cents UNSIGNED INT DEFAULT 0      -- calculé automatiquement
├── difference_cents    INT DEFAULT 0               -- positif=surplus, négatif=manque
├── notes               TEXT NULL
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

---

### 3.12 `settings` — Configuration globale de l'application

```
settings
├── id                  BIGINT UNSIGNED PK
├── key                 VARCHAR(100) UNIQUE NOT NULL
├── value               TEXT NULL
├── type                ENUM('string','integer','boolean','json') DEFAULT 'string'
├── group               VARCHAR(50) DEFAULT 'general'
├── label               VARCHAR(150) NULL           -- libellé lisible pour l'UI admin
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

**Clés de configuration initiales :**
| Clé | Valeur par défaut | Description |
|---|---|---|
| `app.name` | `UltraClean` | Nom affiché |
| `app.timezone` | `Africa/Casablanca` | Fuseau horaire |
| `app.currency` | `MAD` | Code devise |
| `loyalty.points_per_mad` | `1` | Points gagnés par MAD dépensé |
| `loyalty.redemption_rate` | `100` | Centimes MAD pour 100 points |
| `loyalty.silver_threshold` | `1000` | Points pour niveau Silver |
| `loyalty.gold_threshold` | `5000` | Points pour niveau Gold |
| `shift.require_opening_cash` | `true` | Obliger le fond de caisse |
| `ticket.auto_assign_laveur` | `false` | Assigner le laveur auto |

---

### 3.13 `activity_logs` — Journal d'audit

```
activity_logs
├── id                  BIGINT UNSIGNED PK
├── user_id             FK → users.id NULL
├── action              VARCHAR(100) NOT NULL       -- ex: 'ticket.status_changed'
├── subject_type        VARCHAR(100) NULL           -- ex: 'App\Models\Ticket'
├── subject_id          BIGINT UNSIGNED NULL
├── properties          JSON NULL                   -- données before/after
├── ip_address          VARCHAR(45) NULL
├── created_at          TIMESTAMP NULL
└── updated_at          TIMESTAMP NULL
```

---

## 4. Index & Performance

```sql
-- Recherche tickets par statut (tableau de bord temps réel)
INDEX idx_tickets_status ON tickets(status, created_at DESC);

-- Recherche tickets par caissier/session
INDEX idx_tickets_shift ON tickets(shift_id, status);

-- Recherche tickets par laveur assigné
INDEX idx_tickets_assigned ON tickets(assigned_to, status);

-- Recherche client par téléphone (recherche rapide caisse)
INDEX idx_clients_phone ON clients(phone);

-- Recherche plaque véhicule
INDEX idx_clients_plate ON clients(vehicle_plate);
INDEX idx_tickets_plate ON tickets(vehicle_plate);

-- Rapport journalier (filtrage par date)
INDEX idx_tickets_paid_at ON tickets(paid_at);
INDEX idx_payments_created ON payments(created_at);

-- Audit log par entité
INDEX idx_activity_subject ON activity_logs(subject_type, subject_id);
```

---

## 5. Notes de migration

- **Ordre de création des migrations :** `settings` → `users` → `vehicle_types` → `vehicle_brands` → `vehicle_models` → `services` → `service_vehicle_prices` → `clients` → `loyalty_accounts` → `loyalty_transactions` → `shifts` → `tickets` → `ticket_services` → `payments` → `activity_logs`
- **Migrations additionnelles (revamp réception) :**
  - `000016` — `create_vehicle_brands_table` — Table des marques avec logo_path
  - `000017` — `create_vehicle_models_table` — Table des modèles avec FK brand + suggested_vehicle_type
  - `000018` — `add_ice_company_to_clients` — Colonnes `is_company` + `ice` sur `clients`
  - `000019` — `add_vehicle_brand_model_ids_to_tickets` — FK `vehicle_brand_id` + `vehicle_model_id` sur `tickets`
  - `000020` — `add_category_to_services` — Colonne `category` VARCHAR(60) sur `services`
- **Seeders à prévoir :** `VehicleTypeSeeder`, `VehicleBrandModelSeeder`, `ServiceSeeder`, `ServiceVehiclePriceSeeder`, `SettingsSeeder`, `AdminUserSeeder`
- **Compatibilité Hostinger :** MySQL 8.0 minimum requis (ENUM, JSON, FULLTEXT disponibles)
- **Collation :** `utf8mb4_unicode_ci` pour supporter l'arabe et les caractères spéciaux
