# 🖥️ 03 — Architecture UI/UX — Routes & Composants React/Inertia — UltraClean

> **Stack :** Laravel 11 + Inertia.js + React 18 + Tailwind CSS + shadcn/ui
> **Philosophie :** Interface "tablette-first" — boutons larges, feedback immédiat, minimum de clics.
> **Responsive :** Tablette (1024px) prioritaire, desktop (1280px+) supporté, mobile (375px) lecture seule.

---

## Table des matières

1. [Arborescence des routes](#routes)
2. [Layout & Composants globaux](#layouts)
3. [Pages par section](#pages)
4. [Composants réutilisables clés](#composants)
5. [Formulaires détaillés](#formulaires)
6. [Palette & Design Tokens](#design)

---

## 1. Arborescence des routes Laravel/Inertia

```
/                           → Redirect → /dashboard (si auth) ou /login
/login                      → Page: Auth/Login
/dashboard                  → Page: Dashboard (branching par rôle)

# ── TICKETS ──────────────────────────────────────────────
/tickets                    → Page: Tickets/Index (vue file d'attente)
/tickets/create             → Page: Tickets/Create (wizard création)
/tickets/{ulid}             → Page: Tickets/Show (détail ticket)
/tickets/{ulid}/pay         → Page: Tickets/Pay (encaissement)

# ── CLIENTS & FIDÉLITÉ ───────────────────────────────────
/clients                    → Page: Clients/Index
/clients/create             → Page: Clients/Create
/clients/{id}               → Page: Clients/Show (fiche + historique + points)
/clients/{id}/edit          → Page: Clients/Edit

# ── RAPPORTS ─────────────────────────────────────────────
/reports                    → Page: Reports/Index (sélecteur de période)
/reports/daily              → Page: Reports/Daily
/reports/monthly            → Page: Reports/Monthly
/reports/shifts             → Page: Reports/Shifts

# ── ADMINISTRATION (admin only) ───────────────────────────
/admin/users                → Page: Admin/Users/Index
/admin/users/create         → Page: Admin/Users/Create
/admin/users/{id}/edit      → Page: Admin/Users/Edit

/admin/services             → Page: Admin/Services/Index
/admin/services/create      → Page: Admin/Services/Create
/admin/services/{id}/edit   → Page: Admin/Services/Edit

/admin/vehicle-types        → Page: Admin/VehicleTypes/Index

/admin/settings             → Page: Admin/Settings/Index

# ── CAISSE ───────────────────────────────────────────────
/caisse/tickets                    → Tickets/Index
/caisse/tickets/create             → Tickets/Create
/caisse/tickets/{ulid}             → Tickets/Show
/caisse/clients/search             → JSON endpoint (GET ?q=) — recherche async clients
/caisse/clients/quick              → POST — création rapide client (JSON response)
/shifts/open                → Page: Shifts/Open (ouverture session)
/shifts/close               → Page: Shifts/Close (fermeture session)

# ── PROFIL ───────────────────────────────────────────────
/profile                    → Page: Profile/Show
```

---

## 2. Layouts & Composants Globaux

### 2.1 `Layouts/AppLayout.jsx` — Layout principal (authentifié)

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (collapsible sur tablette)                     │
│  Logo UltraClean                                        │
│  ── Navigation principale (liens selon rôle) ──        │
│  ── Utilisateur connecté + bouton déconnexion ──        │
├────────────────────────────────────────────────────────┤
│  TOPBAR                                                 │
│  Breadcrumb | Date & Heure MAR | Indicateur shift      │
├────────────────────────────────────────────────────────┤
│                                                         │
│              SLOT: contenu de la page                   │
│                                                         │
│                                                         │
├────────────────────────────────────────────────────────┤
│  NOTIFICATIONS TOAST (coin bas-droite)                  │
└─────────────────────────────────────────────────────────┘
```

**Navigation sidebar selon rôle :**

| Icône | Lien | Rôle |
|---|---|---|
| LayoutDashboard | Tableau de bord | Tous |
| Ticket | Tickets | Admin, Caissier |
| Users | Clients | Admin, Caissier |
| BarChart | Rapports | Admin, Caissier |
| ShoppingBag | Services | Admin |
| Users2 | Personnel | Admin |
| Settings | Paramètres | Admin |

### 2.2 `Layouts/GuestLayout.jsx` — Layout authentification

```
┌─────────────────────────────────────────────────────────┐
│                    [Logo + Nom App]                      │
│                                                         │
│              [ Formulaire centré ]                      │
│                                                         │
│              Fond : gradient bleu marine                 │
└─────────────────────────────────────────────────────────┘
```

### 2.3 `Layouts/WasherLayout.jsx` — Layout simplifié laveur

Identique à AppLayout mais :
- Sidebar réduite (Dashboard + Mes Tickets uniquement)
- Boutons 20% plus grands (`text-xl`, `py-4`)
- Pas de données financières

---

## 3. Pages Détaillées

---

### 3.1 Page : `Auth/Login`

**Objectif :** Connexion rapide, accessible aux non-techniciens.

```
┌─────────────────────────────────┐
│         🚗 UltraClean           │
│   Gestion Centre de Lavage      │
│                                 │
│  [ Email ]                      │
│  [ Mot de passe ]  [👁]         │
│                                 │
│  [ Se connecter ]               │
│                                 │
│  ────────────────────           │
│  Connexion rapide par PIN :     │
│  [ ● ] [ ● ] [ ● ] [ ● ]       │
└─────────────────────────────────┘
```

**Composants :**
- `InputField` (email, password avec toggle visibilité)
- `PinInput` (4 cases numériques — connexion rapide caissier/laveur)
- `Button` (primary, loading state)
- `AlertMessage` (erreur de connexion)

**Logique :**
- Formulaire email/password → route `POST /login` (standard Laravel)
- PIN → route `POST /login/pin` → recherche le user par `pin_code` haché

---

### 3.2 Page : `Dashboard` (branching par rôle)

**Rendu conditionnel selon `auth.user.role` :**

```jsx
// Dans Dashboard.jsx
{role === 'admin' && <AdminDashboard stats={stats} />}
{role === 'caissier' && <CaissierDashboard stats={stats} tickets={activeTickets} />}
{role === 'laveur' && <LaveurDashboard myTickets={myTickets} stats={myStats} />}
```

**`AdminDashboard` — composants :**
- `StatCard` ×4 (CA jour, Tickets jour, Tickets en cours, Laveurs actifs)
- `RevenueChart` (graphique 7 jours — Recharts)
- `TopServicesWidget`
- `ActiveTicketsTable` (10 derniers tickets)
- `AlertsBanner` (alertes actives)

**`CaissierDashboard` — composants :**
- `StatCard` ×3 (Tickets actifs, En attente paiement, CA shift)
- `PendingPaymentsList` (tickets `completed` — call-to-action fort)
- `QuickCreateTicketButton` (FAB flottant)

**`LaveurDashboard` — composants :**
- `StatCard` ×2 (Voitures lavées aujourd'hui, Tickets en cours)
- `MyTicketsList` (tickets assignés)

---

### 3.3 Page : `Tickets/Index` — File d'attente

**Variante Kanban (défaut) :**
```
┌──────────────┬────────────────┬──────────────┐
│  EN ATTENTE  │   EN COURS     │   TERMINÉ    │
│   (3)        │   (2)          │   (1) 🔴     │
├──────────────┼────────────────┼──────────────┤
│ [TicketCard] │ [TicketCard]   │ [TicketCard] │
│ [TicketCard] │ [TicketCard]   │              │
│ [TicketCard] │                │              │
└──────────────┴────────────────┴──────────────┘
[ + Nouveau Ticket ]                   [ Vue liste ]
```

**`TicketCard` composant :**
```
┌─────────────────────────────────┐
│  TK-20260327-0042  🚗 SUV       │
│  Lavage complet • Aspiration    │
│  👤 Ali Hassan | 10h34          │
│  ⏱ il y a 12 min               │
│                                 │
│  [Assigner] [Démarrer]          │  ← pending
│  [Terminer]                     │  ← in_progress
│  [💳 ENCAISSER — 115 MAD]       │  ← completed
└─────────────────────────────────┘
```

**Filtres :**
- Tous | Pending | In Progress | Completed | Cancelled | Paid (aujourd'hui)
- Recherche par numéro de ticket ou plaque

**Actualisation :** polling toutes les 30 secondes via `router.reload()` Inertia.

---

### 3.4 Page : `Tickets/Create` — Réception rapide (page unique deux colonnes)

**Design :** Mise en page deux colonnes (colonne gauche scrollable + panneau récap fixe à droite). Sur mobile : colonne unique + barre d'action sticky en bas.

**Inertia props reçues :**
| Prop | Type | Description |
|---|---|---|
| `services` | `Object<category, Service[]>` | Services groupés par catégorie (Laravel `groupBy('category')`) |
| `priceGrid` | `Object<serviceId, Object<vehicleTypeId, cents>>` | Grille de prix variant |
| `vehicleTypes` | `VehicleType[]` | Types de véhicules (Citadine, SUV…) — aussi utilisés comme `priceVariants` |
| `brands` | `VehicleBrand[]` (avec `models[]` imbriqués) | Marques avec leurs modèles et `logo_url` |
| `washers` | `User[]` | Laveurs actifs (role=laveur, is_active=true) |

```
┌──────────────────────────────────────────────────────┬──────────────────┐
│  COLONNE GAUCHE (flex-1)                             │  RÉCAP (w-72)    │
│                                                      │  sticky top-4    │
│  ┌────────────────────────────────────────────────┐  │                  │
│  │ 1. VÉHICULE                                    │  │  🚗 Dacia Sandero│
│  │  [Dacia][Peu][Ren][Toy][Hyun]… (scroll horiz) │  │  12345-A-1       │
│  │  ▼ Modèle (select filtré par marque)           │  │                  │
│  │  ● Catégorie: [Citadine]●[SUV][Utilitaire]     │  │  Lavage ext. ×1  │
│  │  [ Immatriculation _____________ ]             │  │  45,00 MAD       │
│  └────────────────────────────────────────────────┘  │  ─────────────── │
│                                                      │  TOTAL 45,00 MAD │
│  ┌────────────────────────────────────────────────┐  │                  │
│  │ 2. CLIENT                                      │  │  [Créer ticket]  │
│  │  🔍 Recherche async (debounce 280ms → API)     │  │                  │
│  │  Résultats JSON : nom, téléphone, ICE badge    │  └──────────────────┘
│  │  [+ Nouveau] → Modal Particulier / Entreprise  │
│  └────────────────────────────────────────────────┘
│                                                      
│  ┌────────────────────────────────────────────────┐
│  │ 3. PRESTATIONS (groupées par catégorie)        │
│  │  ── LAVAGE (3) ─────────────────────────────   │
│  │  [ServiceCardFixed] [ServiceCardFixed] …       │
│  │  ── DÉTAILING (2) ──────────────────────────   │
│  │  [ServiceCardVariant] …                        │
│  └────────────────────────────────────────────────┘
│                                                      
│  ┌────────────────────────────────────────────────┐
│  │ 4. LAVEUR ASSIGNÉ (optionnel)                  │
│  │  [Auto][Ahmed][Karim][Youssef] (cartes avatar) │
│  └────────────────────────────────────────────────┘
│                                                      
│  ┌────────────────────────────────────────────────┐
│  │ Notes (textarea optionnel)                     │
│  └────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────
```

**Section 1 — Véhicule (`VehicleSection`) :**
- Grille de marques scrollable horizontalement avec logos (`brand.logo_url`)
- Clic sur marque → sélection/désélection — filtre les modèles côté client
- Select des modèles (filtré depuis `brands[].models[]` — pas d'appel API supplémentaire)
- Sélection du modèle → pré-remplit la catégorie tarifaire via `suggested_vehicle_type_id`
- Pills de catégorie véhicule (Citadine, SUV…)
- Champ immatriculation déverrouillé uniquement après sélection marque + modèle

**Section 2 — Client (`ClientSection`) :**
- Pas de liste pré-chargée — recherche asynchrone `GET /caisse/clients/search?q=`
- Debounce 280ms, seuil de 2 caractères minimum
- Spinner `Loader2` pendant la recherche
- Dropdown résultats : icône Particulier/Entreprise + badge ICE si is_company
- Bouton « Créer » → `QuickClientModal`

**`QuickClientModal` — Création rapide client :**
- Toggle Particulier / Entreprise
- Champs : Nom*, Téléphone, ICE (affiché + requis uniquement si Entreprise)
- ICE : saisie numérique uniquement, max 15 chiffres
- Erreurs Laravel affichées par champ
- `POST /caisse/clients/quick` → retourne l'objet client créé

**Section 3 — Prestations (`ServicesSection`) :**
- `Object.entries(servicesByCategory)` → itération sur les groupes
- Chaque groupe : header avec nom de catégorie (uppercase), badge count, badge "X actifs" si sélection
- `ServiceCardFixed` : prix fixe, compteur +/−
- `ServiceCardVariant` : tarification par type véhicule — pills cliquables, compteur conditionnel

**Section 4 — Opérateur (`OperatorSection`) :**
- Masqué si `washers.length === 0`
- Cartes avatar : option "Auto" (pas d'assignation) + une carte par laveur actif
- Avatar : photo si `washer.avatar` disponible, sinon initiale stylisée
- Sélection radio visuelle (ring bleu)

**Payload soumis (`POST /caisse/tickets`) :**
```js
{
  vehicle_brand_id,  vehicle_model_id,  vehicle_type_id,  vehicle_plate,
  client_id,  assigned_to,  notes,
  services: [{ service_id, unit_price_cents, quantity, price_variant_id, discount_cents }]
}
```

**Mobile :** Colonne unique + barre sticky bas avec total + bouton "Créer".

---

### 3.5 Page : `Tickets/Pay` — Encaissement

```
┌─────────────────────────────────────────────────────┐
│  Ticket TK-20260327-0042 — SUV                      │
│  ────────────────────────────────────────────────── │
│  Lavage extérieur           45,00 MAD               │
│  Aspiration                 30,00 MAD               │
│  Remise Silver (5%)         -3,75 MAD               │
│  ════════════════════════════════════               │
│  TOTAL À PAYER :            71,25 MAD               │
│                                                     │
│  ── Méthode de paiement ──────────────────────────  │
│  [💵 Espèces] [💳 Carte] [📱 Mobile] [↔ Mixte]     │
│                                                     │
│  Montant remis : [ 100,00      ] MAD                │
│                                                     │
│  ════════════════════════════════════               │
│  💚 Monnaie à rendre : 28,75 MAD                   │
│                                                     │
│  Points fidélité à créditer : +71 pts              │
│                                                     │
│           [ ✅ VALIDER LE PAIEMENT ]                │
└─────────────────────────────────────────────────────┘
```

---

### 3.6 Page : `Clients/Show` — Fiche client

**Sections :**
- En-tête : nom, téléphone, tier badge (Standard/Silver/Gold)
- Informations : email, plaque, notes
- Compte fidélité : solde points, total dépensé, nombre de visites
- Historique des visites (tableau paginé des tickets payés)
- Historique des transactions de points

---

### 3.7 Page : `Reports/Daily` — Rapport journalier

**Composants :**
- `DatePicker` (sélection du jour)
- `StatCard` ×4 (CA total, Nb tickets, Ticket moyen, Nb clients fidèles)
- `PaymentMethodBreakdown` (camembert méthodes de paiement)
- `ServicesSalesTable` (services vendus avec CA)
- `WasherPerformanceTable` (tickets/laveur)
- `ExportButton` (PDF + CSV)

---

### 3.8 Pages Admin (gestion)

**`Admin/Services/Index` :**
- Tableau avec colonne prix par type véhicule
- Toggle actif/inactif inline
- Drag & drop pour réordonner

**`Admin/Services/Create` & `Edit` :**
- Formulaire avec grille de prix (1 input par type véhicule actif)
- Color picker pour la couleur du badge
- Preview en temps réel du badge ticket

**`Admin/Users/Index` :**
- Tableau : Nom, Rôle (badge coloré), Statut, Dernière connexion
- Bouton "Ajouter un employé"

**`Admin/Settings/Index` :**
- Formulaire organisé par sections accordéon :
  - Général (nom app, logo)
  - Programme de fidélité
  - Caisse & Shifts
  - Notifications

---

## 4. Composants Réutilisables Clés

| Composant | Props clés | Usage |
|---|---|---|
| `StatCard` | `title, value, icon, trend, color` | Tous les dashboards |
| `TicketCard` | `ticket, onAction` | File d'attente |
| `TicketStatusBadge` | `status` | Partout |
| `MoneyDisplay` | `cents, currency='MAD'` | Affichage montants |
| `MoneyInput` | `value, onChange, label` | Saisie montants (MAD, convertit en centimes) |
| `ServiceSelector` | `services, vehicleTypeId, onSelect` | Création ticket |
| `ClientSearchInput` | `onClientSelected` | Recherche client |
| `PinInput` | `length, onComplete` | Connexion PIN |
| `ConfirmDialog` | `title, message, onConfirm` | Confirmations sensibles |
| `StatusTransitionButton` | `currentStatus, allowedRoles` | Actions sur tickets |
| `LoyaltyTierBadge` | `tier` | Fiche client |
| `DateRangePicker` | `value, onChange` | Rapports |
| `ExportButton` | `type, filters` | PDF/CSV |
| `EmptyState` | `title, description, action` | Tables vides |
| `LoadingOverlay` | `isLoading` | États de chargement |

---

## 5. Formulaires Détaillés

### 5.1 Formulaire Création Ticket

| Champ | Type | Validation |
|---|---|---|
| `vehicle_brand_id` | hidden (sélection UI) | nullable, exists:vehicle_brands |
| `vehicle_model_id` | hidden (sélection UI) | required_if:vehicle_brand_id≠null, exists:vehicle_models |
| `vehicle_type_id`  | radio/pills | nullable, exists:vehicle_types |
| `vehicle_plate`    | text | nullable, max:20 |
| `client_id`        | hidden (sélection) | nullable, exists:clients |
| `assigned_to`      | hidden (sélection) | nullable, exists:users(role=laveur,is_active=true) |
| `services[]`       | multi-select | required, min:1 service |
| `notes`            | textarea | nullable, max:500 |

### 5.2 Formulaire Paiement

| Champ | Type | Validation |
|---|---|---|
| `method` | radio | required, in:cash,card,mobile,mixed |
| `amount_cash_cents` | number (MAD) | required_if:method,cash |
| `amount_card_cents` | number (MAD) | required_if:method,card |
| `amount_mobile_cents` | number (MAD) | required_if:method,mobile |
| `amount_loyalty_points` | number | nullable, max:loyalty_balance |
| `reference` | text | nullable, required_if:method,card|mobile |

### 5.3 Formulaire Créer/Modifier Service

| Champ | Type | Validation |
|---|---|---|
| `name` | text | required, max:100 |
| `description` | textarea | nullable |
| `color` | color picker | required, regex:#[A-Fa-f0-9]{6} |
| `duration_minutes` | number | required, min:1, max:240 |
| `prices[vehicle_type_id]` | number | required pour chaque type actif, min:1 |

### 5.4 Formulaire Créer Employé

| Champ | Type | Validation |
|---|---|---|
| `name` | text | required, max:100 |
| `email` | email | required, unique:users |
| `phone` | text | nullable, max:20 |
| `role` | select | required, in:admin,caissier,laveur |
| `password` | password | required, min:8, confirmed |
| `pin_code` | number | nullable, digits:6, unique:users |

---

## 6. Palette & Design Tokens

```css
/* Couleurs principales */
--color-primary:    #1D4ED8;   /* Bleu UltraClean */
--color-primary-light: #3B82F6;
--color-success:    #16A34A;   /* Vert — payé, terminé */
--color-warning:    #D97706;   /* Orange — en cours */
--color-danger:     #DC2626;   /* Rouge — annulé, alerte */
--color-info:       #0891B2;   /* Cyan — en attente */
--color-neutral:    #6B7280;   /* Gris — texte secondaire */

/* Statuts tickets */
--status-pending:     #0891B2;  /* Cyan */
--status-in-progress: #D97706;  /* Orange */
--status-completed:   #7C3AED;  /* Violet */
--status-paid:        #16A34A;  /* Vert */
--status-cancelled:   #DC2626;  /* Rouge */

/* Tiers fidélité */
--tier-standard: #6B7280;  /* Gris */
--tier-silver:   #9CA3AF;  /* Argent */
--tier-gold:     #F59E0B;  /* Or */

/* Typographie */
--font-sans: 'Inter', system-ui, sans-serif;
--text-base: 1rem;        /* 16px */
--text-lg:   1.125rem;    /* 18px — texte laveur */
--text-xl:   1.25rem;     /* 20px — montants importants */
--text-3xl:  1.875rem;    /* 30px — montants caisse */
```

**Convention Tailwind config (`tailwind.config.js`) :**
- Toutes ces valeurs sont mappées dans le thème Tailwind
- Classes utilitaires : `text-status-pending`, `bg-tier-gold`, etc.
