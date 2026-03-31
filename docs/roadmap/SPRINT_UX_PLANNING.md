# Planning Sprint UX — RitajPOS Lavage
**Date :** 2026-03-28  
**Statut :** 🟢 Vision validée — Prêt à implémenter

---

## ✅ Décisions validées

| Décision | Valeur retenue |
|----------|---------------|
| Champs véhicule sur ticket | **Marque/Modèle** (texte libre, ex: "Toyota Yaris") + **Immatriculation** uniquement |
| Suppression `vehicle_type_id` sur ticket | ✅ Oui — le type n'est plus sur le ticket |
| Tarification prestations | **Prix unique** OU **Prix variant** (par catégorie taille) |
| Catégories de taille (anciens types) | Restent en BDD comme labels de variants prix (Petite, Grande, 4×4, etc.) |
| Layout page caisse | **2 colonnes sur desktop** (≥ lg), **1 colonne sur mobile** |
| Marque véhicule | Texte libre (pas de liste fixe) |

---

## Vue d'ensemble des sprints (révisée)

| Sprint | Sujet | Priorité | Complexité | Fichiers touchés |
|--------|-------|----------|------------|-----------------|
| **A** | Sidebar sous-menus + nav caissier | 🔴 Haute | Faible | `AppLayout.jsx` |
| **B** | Refonte BDD — nouveau modèle de données | 🔴 Haute | Haute | 4 migrations, 3 modèles, 2 requests |
| **C** | Page caisse POS — layout 2 colonnes responsive | 🔴 Haute | Haute | `Create.jsx`, `TicketController.php` |
| **D** | Admin Services — gestion prix unique/variant | 🟠 Moyenne | Moyenne | `Services/Index.jsx`, `ServiceController.php` |
| **E** | Admin Variants prix — CRUD labels taille | 🟠 Moyenne | Faible | `VehicleTypeController.php` + page admin |
| **F** | Corrections & propagation (Show, Queue, Reports) | 🟡 Basse | Faible | `Show.jsx`, `Queue.jsx`, `Reports/Index.jsx` |

---

## Sprint A — Sidebar avec sous-menus, ordre pratique métier

### Problème actuel
- Menu plat, sans hiérarchie — tout au même niveau
- Caissier n'a pas "Clients" dans sa nav
- Admin mélange opérationnel et configuration
- Pas de feedback visuel des sous-sections ouvertes

### Solution proposée

#### Menu Admin (ordre métier)
```
📊  Tableau de bord
📈  Rapports & exports
─── divider ────────────
⚙️  Configuration  ▾   ← groupe collapsible (auto-ouvert si route active dedans)
    🔧 Services & tarifs
    🏷️ Catégories de prix   ← anciennement "Types véhicules"
    👥 Utilisateurs
    ⚙️ Paramètres
─── divider ────────────
🎫  Accès caisse          ← lien rapide vers vue caissier
🏁  File d'attente
```

#### Menu Caissier (ordre métier)
```
📊  Tableau de bord
─── divider ────────────
🆕  Nouveau ticket        ← lien accent bleu (action principale)
─── divider ────────────
📋  Tickets du jour
👥  Clients
💰  Shift / Caisse
─── divider ────────────
🏁  File d'attente
```

#### Menu Laveur
```
🏁  File d'attente        ← inchangé
```

### Comportement sous-menus Admin
- Groupe "Configuration" : collapsible, s'ouvre automatiquement si la route active est dedans
- État mémorisé dans `localStorage`
- Icône chevron animée (rotate 180°)
- Nouveau composant `NavGroup` dans `AppLayout.jsx`

### Fichier à modifier
- `resources/js/Layouts/AppLayout.jsx`

---

## Sprint B — Refonte BDD : nouveau modèle de données

### Résumé des changements de structure

#### Avant (actuel)
```
tickets
  └─ vehicle_type_id  FK→ vehicle_types   ← SUPPRIMÉ du ticket
  └─ vehicle_plate

ticket_services
  └─ (prix calculé via vehicle_type_id du ticket)

services
  └─ (pas de price_type)

service_vehicle_prices
  service_id × vehicle_type_id → price_cents
```

#### Après (nouvelle architecture)
```
tickets
  └─ vehicle_brand    VARCHAR(80) NULL  ← NOUVEAU  "Toyota Yaris"
  └─ vehicle_plate    VARCHAR(20) NULL  ← existant
  └─ vehicle_type_id  NULL toujours     ← conservé nullable pour compatibilité

ticket_services
  └─ price_variant_id  FK→ vehicle_types NULL  ← NOUVEAU (variant choisi par le caissier)

services
  └─ price_type  ENUM('fixed','variant') DEFAULT 'fixed'  ← NOUVEAU
  └─ base_price_cents  UNSIGNED INT NULL  ← NOUVEAU (prix fixe unique)

service_vehicle_prices        ← conservée, rôle : stocker les prix variants
  service_id × vehicle_type_id → price_cents  (inchangé)

vehicle_types                 ← conservée, rôle : labels de catégories de prix
  Petite voiture / Grande voiture / 4×4 / Monospace / Utilitaire / Moto
  (renommage via UpdatedVehicleTypeSeeder)
```

### Migrations à créer

#### M1 — `2026_03_28_000011_add_vehicle_brand_to_tickets`
```php
// Ajouter vehicle_brand, rendre vehicle_type_id nullable
$table->string('vehicle_brand', 80)->nullable()->after('vehicle_plate');
$table->unsignedBigInteger('vehicle_type_id')->nullable()->change(); // déjà nullable ✅
```

#### M2 — `2026_03_28_000012_add_price_type_to_services`
```php
// price_type + base_price_cents sur services
$table->enum('price_type', ['fixed', 'variant'])->default('fixed')->after('sort_order');
$table->unsignedInteger('base_price_cents')->nullable()->after('price_type');
```

#### M3 — `2026_03_28_000013_add_price_variant_to_ticket_services`
```php
// Quelle catégorie de prix a été choisie pour cette ligne de service
$table->foreignId('price_variant_id')
      ->nullable()
      ->constrained('vehicle_types')
      ->nullOnDelete()
      ->after('ticket_id');
```

#### M4 — UpdatedVehicleTypeSeeder (pas une migration, un seeder)
```php
// Renommer les types existants + en ajouter
VehicleType::updateOrCreate(['slug'=>'petite'],   ['name'=>'Petite voiture',  'icon'=>'🚗', 'sort_order'=>1]);
VehicleType::updateOrCreate(['slug'=>'grande'],   ['name'=>'Grande voiture',  'icon'=>'🚙', 'sort_order'=>2]);
VehicleType::updateOrCreate(['slug'=>'suv'],      ['name'=>'4×4 / SUV',       'icon'=>'🚙', 'sort_order'=>3]);
VehicleType::updateOrCreate(['slug'=>'monospace'],['name'=>'Monospace / Van', 'icon'=>'🚐', 'sort_order'=>4]);
VehicleType::updateOrCreate(['slug'=>'utilitaire'],['name'=>'Utilitaire',     'icon'=>'🚚', 'sort_order'=>5]);
VehicleType::updateOrCreate(['slug'=>'moto'],     ['name'=>'Moto / Scooter',  'icon'=>'🏍', 'sort_order'=>6]);
```

### Modèles à mettre à jour
| Modèle | Changement |
|--------|-----------|
| `Ticket.php` | Ajouter `vehicle_brand` dans `$fillable` |
| `Service.php` | Ajouter `price_type`, `base_price_cents` dans `$fillable` et `$casts` |
| `TicketService.php` | Ajouter `price_variant_id` dans `$fillable`, relation `priceVariant()` |

### Requests à mettre à jour
| Request | Changement |
|---------|-----------|
| `StoreTicketRequest.php` | Supprimer `vehicle_type_id` required, ajouter `vehicle_brand` nullable, `services.*.price_variant_id` nullable |

---

## Sprint C — Page caisse POS (layout 2 colonnes responsive)

### Layout desktop (≥ lg) — 2 colonnes
```
┌──────────────────────────────────────┬─────────────────────┐
│  GAUCHE (flex-1)                     │  DROITE (w-72)       │
│                                      │  (sticky top-4)      │
│  ① VÉHICULE                          │                      │
│  ┌──────────────────────────────┐    │  ┌────────────────┐  │
│  │ Marque / Modèle              │    │  │  RÉCAP CAISSE  │  │
│  │ [Toyota Yaris______________] │    │  │                │  │
│  │ Immatriculation              │    │  │ Toyota Yaris   │  │
│  │ [A-12345-B_________________] │    │  │ A-12345-B      │  │
│  └──────────────────────────────┘    │  │                │  │
│                                      │  │ ─────────────  │  │
│  ② CLIENT                            │  │                │  │
│  ┌──────────────────────────────┐    │  │ Lavage ext.    │  │
│  │ 👤 Client de passage         │    │  │  Petite × 1    │  │
│  │ [🔍 Rechercher] [+ Nouveau]  │    │  │       30,00 MAD│  │
│  └──────────────────────────────┘    │  │                │  │
│                                      │  │ Aspiration     │  │
│  ③ PRESTATIONS                       │  │  fixe × 1      │  │
│  ┌──────────────────────────────┐    │  │       25,00 MAD│  │
│  │🟢 Lavage extérieur  VARIANT  │    │  │                │  │
│  │   [Petite▾] [Grande] [4×4]  │    │  │ ─────────────  │  │
│  │                              │    │  │ TOTAL 55,00 MAD│  │
│  │🔵 Aspiration        30 MAD  │    │  │                │  │
│  │   [+ Ajouter]               │    │  │ [Créer ticket] │  │
│  └──────────────────────────────┘    │  └────────────────┘  │
│                                      │                      │
│  📝 Notes                            │                      │
└──────────────────────────────────────┴─────────────────────┘
```

### Layout mobile (< lg) — 1 colonne + barre sticky bas
```
┌──────────────────────────┐
│  ① VÉHICULE              │
│  ② CLIENT                │
│  ③ PRESTATIONS           │
│  📝 NOTES                │
│                          │
│ ─────────────────────── │
│ sticky bottom bar:       │
│  TOTAL 55 MAD [Créer →]  │
└──────────────────────────┘
```

### Section ① Véhicule
```jsx
// Deux champs côte à côte (sm:flex-row)
<input placeholder="Marque / Modèle  ex: Toyota Yaris" />
<input placeholder="Immatriculation  ex: A-12345-B"   className="uppercase" />
```
- Marque : texte libre, max 80 caractères
- Immatriculation : auto-uppercase, texte libre

### Section ② Client (3 états)

**État A — Passage (défaut)**
```
👤 Client de passage
   [🔍 Rechercher un client]   [+ Nouveau]
```

**État B — Recherche active** (dropdown en dessous)
```
🔍 [____________]
  ┌─────────────────────────────────┐
  │ Ahmed Benali · 0661234567       │
  │ Ahmed Bensaid · 0670987654      │
  │ ─────────────────────────────── │
  │ ➕ Créer "Ahmed Ben..."          │
  └─────────────────────────────────┘
```

**État C — Client sélectionné**
```
✅ Ahmed Benali          [✕ retirer]
   📞 0661234567  🚗 A-12345-B
   3 visites
```

**Modal création rapide** (s'ouvre sans quitter la page)
- Champs : Nom*, Téléphone, Plaque
- `POST /caisse/clients/quick` → retourne JSON `{ id, name, phone, vehicle_plate }`
- Auto-sélection du nouveau client sur le ticket

### Section ③ Prestations — 2 modes d'affichage

**Prestation à prix FIXE**
```
┌────────────────────────────────────────────┐
│ 🔵 Aspiration intérieure          25,00 MAD│
│                              [−] [1] [+]   │
└────────────────────────────────────────────┘
```

**Prestation à prix VARIANT** (catégorie obligatoire avant ajout)
```
┌────────────────────────────────────────────┐
│ 🟢 Lavage extérieur              VARIANT   │
│    Catégorie :                             │
│    [Petite 30] [Grande 35] [4×4 40]        │
│    [Mono 38] [Util 45] [Moto 20]           │
│    ← sélectionner une catégorie            │
└────────────────────────────────────────────┘

↓ Après sélection "Petite 30 MAD" :

┌────────────────────────────────────────────┐
│ 🟢 Lavage extérieur  Petite  30,00 MAD     │
│                              [−] [1] [+]   │
└────────────────────────────────────────────┘
```

### Logique technique Create.jsx

```js
// Structure d'une ligne de service dans le formulaire
{
  service_id: 1,
  quantity: 1,
  price_variant_id: 3,       // null si prix fixe
  unit_price_cents: 3000,    // calculé depuis base_price_cents OU variant
  discount_cents: 0
}
```

### Changements TicketController@create
```php
// Passer aux props :
'services'    => Service::active()->with('prices.vehicleType')->get(),
'priceVariants' => VehicleType::active()->get(['id','name','icon']),
// Supprimer : 'vehicleTypes' => VehicleType::active()->get(),
// Garder :    'priceGrid' (service_id → variant_id → price_cents)
// Supprimer : 'clients' complet (maintenant chargé via /caisse/clients/quick?search=...)
```

### Changements TicketController@store
```php
// Supprimer vehicle_type_id
// Ajouter vehicle_brand
// Sur chaque ligne service : stocker price_variant_id
```

---

## Sprint D — Admin Services : gestion prix unique / variant

### Interface admin — modal de gestion des prix

**Champ `price_type` sur le service :**
```
Mode de tarification :
○ Prix unique (même prix quel que soit le véhicule)
● Prix variant (tarif différent par catégorie de véhicule)
```

**Si Prix unique :**
```
Prix :  [______] MAD    ← enregistré dans services.base_price_cents
```

**Si Prix variant :**
```
Catégorie           Prix (MAD)
Petite voiture      [30,00]
Grande voiture      [35,00]
4×4 / SUV           [40,00]
Monospace / Van     [38,00]
Utilitaire          [45,00]
Moto / Scooter      [20,00]
                    → cases vides = non disponible
```

**Raccourci "Tout copier"** : saisir un prix dans "Petite" + bouton [Copier partout] remplit toutes les cases

### Fichiers à modifier
- `app/Http/Controllers/Admin/ServiceController.php` — `store()`, `update()` : gérer `price_type` + `base_price_cents`
- `resources/js/Pages/Admin/Services/Index.jsx` — modal prix avec toggle fixe/variant

---

## Sprint E — Admin Catégories de prix (anciens types véhicules)

### Renommer dans le seeder
Exécuter `UpdatedVehicleTypeSeeder` (défini dans Sprint B / M4)

### Interface admin CRUD
**Nouvelle page :** `resources/js/Pages/Admin/PriceCategories/Index.jsx`
**Nouveau contrôleur :** `app/Http/Controllers/Admin/VehicleTypeController.php`

- Tableau : Nom, Icône, Ordre, Nb services utilisant cette catégorie, Actif
- Modifier (modal inline), activer/désactiver
- Suppression : **interdite** si des `service_vehicle_prices` ou `ticket_services` y sont liés

**Routes :**
```php
Route::resource('admin/price-categories', VehicleTypeController::class)
    ->names('admin.price-categories')
    ->except(['create','edit','show']);
```

---

## Sprint F — Corrections & propagation

### F1 — Caissier nav : ajouter "Clients" (5 min) 🔴 URGENT
`AppLayout.jsx` → ajouter entrée Clients dans ROLE_NAV caissier

### F2 — Show.jsx : afficher vehicle_brand
Section Véhicule :
```
Marque   Toyota Yaris
Plaque   A-12345-B
```
(Supprimer l'affichage du type de véhicule)

### F3 — Queue.jsx (laveur) : afficher marque
Sur chaque carte ticket : `Toyota Yaris · A-12345-B` à la place du type

### F4 — Reports : ajouter "marque" (optionnel, après Sprint C)
`ReportsController.php` → `brandBreakdown` (COUNT par vehicle_brand)
`Admin/Reports/Index.jsx` → mini-tableau top marques

### F5 — Route JSON quick-store client
`ClientController@quickStore` → retourne JSON (pas Inertia)
Route : `POST /caisse/clients/quick`

### F6 — Page Paramètres admin (placeholder → formulaire réel)
Lire/écrire la table `settings` :
- Nom du centre, adresse, téléphone (pour impression reçu)
- Message de bienvenue sur le ticket

---

## Ordre d'implémentation (validé)

```
① Sprint F1        (5 min)   Ajouter Clients dans nav caissier
② Sprint A         (45 min)  Sidebar sous-menus
③ Sprint B/M1-M4   (45 min)  Migrations BDD + mise à jour modèles/requests
④ Sprint E         (1h)      CRUD catégories de prix admin + seeder renommage
⑤ Sprint D         (1h)      Admin services : UI prix unique/variant
⑥ Sprint C         (3h)      Page caisse POS 2 colonnes
⑦ Sprint F2-F6     (1h)      Propagation + corrections
```

**Durée totale estimée : ~8h**

---

## Récapitulatif impacts BDD

| Table | Changement |
|-------|-----------|
| `tickets` | + colonne `vehicle_brand VARCHAR(80) NULL` |
| `tickets` | `vehicle_type_id` reste nullable, plus utilisé en caisse |
| `services` | + colonne `price_type ENUM('fixed','variant') DEFAULT 'fixed'` |
| `services` | + colonne `base_price_cents UNSIGNED INT NULL` |
| `ticket_services` | + colonne `price_variant_id FK→vehicle_types NULL` |
| `vehicle_types` | Données renommées via seeder (Petite, Grande, 4×4, Mono, Util, Moto) |
| `service_vehicle_prices` | Structure inchangée, sert maintenant de grille de prix variants |

---

*Mis à jour le 2026-03-28 — Vision validée, prêt à implémenter.*
