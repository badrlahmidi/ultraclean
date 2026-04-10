# Workflow Complet — Parcours Client en Station de Lavage

> **Périmètre :** Ce document décrit le cycle de vie complet d'un véhicule dans la station, depuis l'arrivée physique jusqu'au départ, en faisant le pont entre les gestes terrain et les mécanismes logiciels de l'application **UltraClean**.
>
> **Acteurs :** Caissier (réceptionniste), Laveur (opérateur), Client, Admin (directeur de station).

---

## Vue d'ensemble — Le cycle de vie en un coup d'œil

```
CLIENT ARRIVE
     │
     ▼
┌─────────────────┐
│  1. ACCUEIL     │  Caissier ──► Ticket créé (status: pending)
│  & SAISIE       │
└────────┬────────┘
         │ [assigned_to + TicketAssigned broadcast]
         ▼
┌─────────────────┐
│  2. FILE        │  Laveur voit le ticket dans sa queue
│  D'ATTENTE      │
└────────┬────────┘
         │ [Laveur démarre le ticket]
         ▼
┌─────────────────┐
│  3. LAVAGE      │  status: in_progress / started_at = now()
│  EN COURS       │
└────────┬────────┘
         │ [Laveur finalise]
         ▼
┌─────────────────┐
│  4. CONTRÔLE    │  status: completed / completed_at = now()
│  QUALITÉ        │
└────────┬────────┘
         │ [Caissier encaisse]
         ▼
┌─────────────────┐
│  5. ENCAISSEMENT│  Payment créé, status: paid / paid_at = now()
│  & FIDÉLITÉ     │  Stock consommé, Points crédités
└────────┬────────┘
         │
         ▼
    CLIENT REPART
```

---

## Phase 1 — Accueil & Saisie du Ticket

### 🚗 Action Terrain
Un client arrive avec sa Renault Clio ou une berline inconnue. Le caissier l'accueille au comptoir ou à l'entrée, fait rapidement le tour du véhicule pour noter d'éventuelles rayures préexistantes, demande la plaque et propose le catalogue de services (lavage simple, complet, intérieur/extérieur, polish…). Si c'est un client habituel, il le reconnaît ou cherche son numéro de téléphone.

### 💻 Action Système & UI
Le caissier ouvre **Caissier › Nouveau Ticket** (`/caissier/tickets/create`).

L'écran se découpe en trois zones simultanées :
1. **ServiceGrid** (gauche) — tuiles colorées par catégorie (Extérieur / Intérieur / Options), avec prix dynamiques selon le type de véhicule sélectionné. Un `PricePicker` modal s'ouvre si le service a un prix variable par gabarit (citadine ≠ SUV ≠ utilitaire).
2. **TicketRecap** (droite) — récapitulatif en temps réel avec sous-total, remise éventuelle et total TTC.
3. **Drawers latéraux** (slide-in HeadlessUI) :
   - **VehicleOverlay** — recherche de marque/modèle par texte libre (Peugeot 208, Dacia Duster…) ou saisie de plaque libre.
   - **ClientDrawer** — recherche par nom, téléphone ou plaque → si client fidèle trouvé, ses points disponibles apparaissent et peuvent être convertis en remise.
   - **WasherDrawer** — sélection du laveur avec file d'attente temps réel (`queue_count`, `queue_minutes`, `available_at`).

### ⚙️ Traduction Laravel (sous le capot)

**`POST /caissier/tickets` → `TicketController@store`**

Tables/modèles impactés :
| Modèle | Action |
|---|---|
| `Ticket` | Création avec `status = pending`, `ulid`, `ticket_number` (ex: `TK-20260401-0042`) auto-générés via `booted()` |
| `TicketService` | Une ligne par service sélectionné ; `booted()` calcule `line_total_cents` ; `static::saved()` déclenche `ticket->recalculateTotals()` |
| `Shift` | `shift_id` rattaché au shift ouvert du caissier (`Shift::whereNull('closed_at')->where('user_id', auth()->id())`) |
| `ActivityLog` | Entrée `ticket.created` avec snapshot véhicule et total |

**Calcul `due_at` (heure estimée de fin) :**
```
due_at = now()
       + washerAvailability(assigned_to).queue_minutes   // attente dans la file
       + estimated_duration                              // durée du service
```

**Event broadcast :** Si `assigned_to` renseigné → `TicketAssigned::dispatch($ticket)` vers les canaux `private-admin`, `private-user.{laveur_id}`.

### ⚠️ Friction / Edge Cases

| Situation | Gestion |
|---|---|
| **Caissier n'a pas de shift ouvert** | `shift_id = null`, le ticket est créé mais n'apparaît dans aucun rapport de caisse. Alerte à prévoir. |
| **Service à prix variable sans type de véhicule sélectionné** | Le `PricePicker` est forcé à l'ouverture (le ticket ne peut pas être validé sans `vehicle_type_id`). |
| **Client avec points fidélité** | `ClientDrawer` affiche les points convertibles ; si l'opérateur valide, `LoyaltyService::redeemPoints()` est appelé avant la création, `discount_cents` est pré-rempli sur les `TicketService` ou comme remise globale. |
| **Laveur absent / surcharge** | `WasherDrawer` affiche la file en temps réel (polling axios 30s). L'opérateur peut laisser `assigned_to = null` et assigner plus tard. |
| **Panne réseau** | Inertia fonctionne en SPA ; la page `create` a déjà toutes ses données (services, types, laveurs) chargées au montage → la saisie peut continuer, la soumission échouera proprement avec message d'erreur. |

---

## Phase 2 — Mise en File d'Attente (pending)

### 🚗 Action Terrain
Le client gare son véhicule dans la zone d'attente désignée. Le laveur assigné voit apparaître le nouveau ticket sur son téléphone/tablette. Il finit le véhicule précédent.

### 💻 Action Système & UI
**Laveur → `Laveur › Ma Queue`** (`/laveur/queue`)

Interface minimaliste optimisée pour les mains mouillées :
- Liste des tickets `pending` assignés, triés par `due_at` croissant.
- Chaque carte affiche : numéro de ticket, plaque, marque, liste des services, heure estimée.
- **Bouton "Démarrer"** (unique, grand, vert) → passe en `in_progress`.
- Polling auto toutes les **30 secondes** + écoute WebSocket (Reverb) sur `private-user.{id}` pour les nouvelles affectations.

### ⚙️ Traduction Laravel (sous le capot)

```php
// Laveur/QueueController@index
Ticket::where('assigned_to', auth()->id())
      ->whereIn('status', ['pending', 'in_progress'])
      ->with(['vehicleType', 'services.service'])
      ->orderBy('due_at')
      ->get();
```

Aucune écriture en base à cette étape. L'écoute Reverb met à jour le tableau en temps réel sans rechargement.

### ⚠️ Friction / Edge Cases

| Situation | Gestion |
|---|---|
| **Ticket non assigné** | Reste dans la liste Admin/Caissier (filtre `assigned_to IS NULL`). Le caissier peut l'assigner depuis `Tickets/Show`. |
| **Laveur absent** | Le caissier peut réassigner depuis `Show.jsx` → bouton "Changer le laveur" (même `WasherDrawer`). |
| **Double affectation par erreur** | `queue_count` et `queue_minutes` dans `WasherDrawer` signalent la surcharge visuellement (badge rouge). |

---

## Phase 3 — Lavage en Cours (in_progress)

### 🚗 Action Terrain
Le laveur commence le lavage. La voiture est en piste. Le temps tourne — produits consommés, eau, shampooing, cire selon les services. Le compteur `estimated_duration` est maintenant une promesse faite au client.

### 💻 Action Système & UI
Le laveur tape **"Démarrer"** sur sa queue.

**`PATCH /caissier/tickets/{ulid}/status`** avec `{ status: 'in_progress' }` depuis `Show.jsx`.

Immédiatement après :
- Le ticket passe de la section "En attente" à "En cours" dans toutes les vues.
- Le caissier voit la mise à jour en temps réel sur son dashboard (broadcast WebSocket).
- Le `Client/Portal.jsx` (si le client a scanné un QR code) voit le statut passer à 🔵 "En cours" avec le polling 8s.

### ⚙️ Traduction Laravel (sous le capot)

**`TicketController@updateStatus`** appelle `$ticket->transitionTo('in_progress')` :

```php
// Ticket::transitionTo()
match ($newStatus) {
    'in_progress' => $updates['started_at'] = now(),
    // ...
};
$this->update($updates);
```

| Modèle | Action |
|---|---|
| `Ticket` | `status = in_progress`, `started_at = now()` |
| `ActivityLog` | Entrée `ticket.status_changed` (from: pending → in_progress) |

**Event :** `TicketStatusUpdated::dispatch($ticket, 'pending')` → canaux `private-admin`, `private-caissier`, `private-user.{laveur_id}`.

**Recalcul `queue_minutes` des autres laveurs :** Pour les tickets suivants dans la file, `washerAvailability()` recalcule dynamiquement `remaining = max(0, estimated_duration - elapsed)` à chaque appel.

### ⚠️ Friction / Edge Cases

| Situation | Gestion |
|---|---|
| **Transition invalide** | `Ticket::canTransitionTo()` retourne `false` → `LogicException` → HTTP 422. Le frontend affiche un toast d'erreur. |
| **Client demande un service supplémentaire PENDANT le lavage** | Le caissier peut ajouter un `TicketService` depuis `Show.jsx` (bouton "+"). `TicketService@saved` recalcule automatiquement `total_cents`. Le laveur est notifié par WebSocket. |
| **Dépassement du temps estimé** | `due_at` est dépassé → badge "En retard" côté caissier (calculé client-side : `now > due_at`). Pas de pénalité automatique, juste signal visuel. |

---

## Phase 4 — Contrôle Qualité & Notification (completed)

### 🚗 Action Terrain
Le laveur finit sa dernière passe, essuie les vitres, vérifie les joints. Il gare le véhicule dans la zone "Prêt". Le client, qui attendait dans l'espace café ou sur le parking, est informé que sa voiture est prête.

### 💻 Action Système & UI
Le laveur tape **"Terminer"** sur sa queue ou l'interface `Show.jsx`.

`{ status: 'completed' }`

- Le ticket disparaît de la queue laveur et passe dans la section "À encaisser" du caissier.
- Le `Client/Portal.jsx` affiche ✅ "Votre véhicule est prêt — Merci de vous présenter à la caisse."
- Optionnel : SMS automatique via Job/Observer (point d'extension prévu).

### ⚙️ Traduction Laravel (sous le capot)

**`TicketController@updateStatus`** → `transitionTo('completed')` :

| Modèle | Action |
|---|---|
| `Ticket` | `status = completed`, `completed_at = now()` |
| `ActivityLog` | Entrée `ticket.status_changed` (in_progress → completed) |

**Event :** `TicketStatusUpdated::dispatch($ticket, 'in_progress')` → les 3 canaux.

**Point d'extension SMS :**
```php
// À ajouter dans un TicketObserver ou dans le Listener
if ($ticket->client?->phone && $ticket->wasJustCompleted()) {
    SendTicketReadySms::dispatch($ticket)->onQueue('notifications');
}
```

### ⚠️ Friction / Edge Cases

| Situation | Gestion |
|---|---|
| **Contrôle qualité échoue** | Le chef d'équipe peut repasser en `in_progress` depuis la page Admin. La transition inverse n'est pas prévue dans `TRANSITIONS` → à ajouter si besoin métier (`completed → in_progress`). |
| **Client absent à la restitution** | Le ticket reste en `completed` indéfiniment. Aucune expiration automatique — prévoir un scope `stale()` (`completed` depuis > X heures) pour alertes admin. |
| **Véhicule endommagé détecté au retrait** | Hors périmètre applicatif actuel — le champ `notes` sert de palliatif ; un module "sinistres" est un point d'évolution. |

---

## Phase 5 — Encaissement & Fidélité (paid)

### 🚗 Action Terrain
Le client arrive à la caisse. Le caissier retrouve le ticket, annonce le montant total (120 MAD pour un lavage complet SUV, 65 MAD pour une citadine), accepte espèces, carte ou paiement mobile (Wave, Orange Money). Il rend la monnaie si nécessaire, remet un reçu, et informe le client des points accumulés sur sa carte fidélité.

### 💻 Action Système & UI
Depuis `Tickets/Show.jsx`, le caissier clique **"Encaisser"** → le `PaymentModal` (HeadlessUI Dialog) s'ouvre.

Le modal affiche :
- Montant dû bien en évidence.
- Onglets de mode de paiement : Espèces / Carte / Mobile / Virement / Mixte / Crédit.
- En mode **Mixte** : 4 champs numériques (cash + card + mobile + wire), validation en temps réel que la somme = total dû.
- En mode **Espèces** : champ "Reçu" → calcul automatique de la monnaie à rendre.
- Si client fidèle : badge "+ X points" estimé affiché avant confirmation.

**`POST /caissier/tickets/{ulid}/payment` → `PaymentController@store`**

### ⚙️ Traduction Laravel (sous le capot)

Séquence atomique dans `PaymentController@store` :

```
1. Validation statut (canTransitionTo('paid'))
2. Validation montants
3. Payment::create(...)          → table payments
4. $ticket->transitionTo('paid') → status=paid, paid_at=now(), paid_by=user_id
5. Stock consumption             → StockProduct::consumeStock() par service
6. LoyaltyService::awardPoints() → LoyaltyTransaction::create() + Client stats
7. ActivityLog::log('ticket.paid')
8. Redirect → Show avec flash success
```

**Détail consommation stock :**
```php
foreach ($ticket->services as $ticketService) {
    foreach ($ticketService->service->stockProducts as $product) {
        $qty = $product->pivot->quantity_per_use * $ticketService->quantity;
        $product->consumeStock($qty, $ticket->ticket_number, $ticket->id, auth()->id());
        // → StockMovement::create(type='out') + $product->decrement('stock_quantity', $qty)
    }
}
```

**Détail fidélité :**
```php
// 1 point par tranche de 10 MAD (CENTS_PER_POINT_EARNED = 1000)
$points = floor($ticket->total_cents / 1000);
// Mise à jour Client : total_visits++, total_spent_cents+=, last_visit_date, loyalty_tier
// LoyaltyTransaction::create(type='earned', points=N, balance_after=...)
// Tier upgrade automatique : standard→silver@10v, silver→gold@25v, gold→platinum@50v
```

| Modèle | Action |
|---|---|
| `Payment` | Création avec détail par mode |
| `Ticket` | `status=paid`, `paid_at`, `paid_by`, `loyalty_points_earned` |
| `StockMovement` | Une ligne `out` par produit consommé |
| `LoyaltyTransaction` | Une ligne `earned` si client fidèle et paiement non-crédit |
| `Client` | `total_visits++`, `total_spent_cents`, `last_visit_date`, `loyalty_tier` éventuellement upgradé |
| `ActivityLog` | Entrée `ticket.paid` avec méthode, montant, rendu, points |

### ⚠️ Friction / Edge Cases

| Situation | Gestion |
|---|---|
| **Montant insuffisant (espèces)** | `PaymentController` vérifie `totalPaid < ticket->total_cents` → `422` avec message "X MAD encaissé pour Y MAD dû". |
| **Paiement mixte incohérent** | `Payment::validateAmounts()` vérifie que `cash+card+mobile = amount_cents` (pour `method=mixed`). |
| **Paiement différé (crédit)** | `method=credit` → `amount_cents=0`, `change=0`. Ticket passé `paid` quand même (état comptable "en crédit"). `total_visits` non incrémenté, points non attribués. |
| **Avance partielle** | `method=advance` → enregistré avec montant partiel, ticket marqué `paid`. La créance résiduelle est un point d'évolution (module "Clients débiteurs"). |
| **Stock sous le seuil minimum** | `consumeStock()` décrémente même si `stock_quantity < 0` (pas de blocage), mais le produit passe `is_below_minimum = true` → alerte dans Admin/Stock. |
| **Caissier sans shift** | `PaymentController` ne bloque pas le paiement mais `shift_id = null` → le paiement n'est pas tracé dans la clôture de caisse. Vigilance lors de l'audit. |
| **Client Portal en attente** | Le polling 8s de `Client/Portal.jsx` détecte `status=paid` → arrêt du polling (`TERMINAL.includes('paid')`), affichage du reçu et du message de fidélité. |

---

## Phase 6 — Clôture de Shift & Réconciliation (Admin/Caissier)

> Bien que non directement visible par le client, cette phase clôt le cycle économique de la journée.

### 🚗 Action Terrain
En fin de service (ou de journée), le caissier compte sa caisse physique, rapproche avec l'écran, et remet le fond de caisse.

### 💻 Action Système & UI
**Caissier › Clôture de Shift** (`/caissier/shifts`) — formulaire de clôture avec saisie du cash physique compté.

L'interface calcule en temps réel :
- **Encaissé attendu** = somme des paiements cash du shift.
- **Écart** = `closing_cash_cents - expected_cash_cents`.
- Un badge vert (équilibré), orange (écart < 50 MAD), rouge (écart significatif).

### ⚙️ Traduction Laravel (sous le capot)

```php
// ShiftController@close
$shift->update([
    'closed_at'            => now(),
    'closing_cash_cents'   => $request->closing_cash_cents,
    'expected_cash_cents'  => $shift->totalCashCollected(),
    'difference_cents'     => $closing - $expected,
    'notes'                => $request->notes,
]);
```

| Modèle | Action |
|---|---|
| `Shift` | `closed_at`, `closing_cash_cents`, `expected_cash_cents`, `difference_cents` |
| `ActivityLog` | Entrée `shift.closed` |

---

## Annexe — Machine à États du Modèle `Ticket`

### Diagramme de transitions

```
                     ┌─────────────┐
             ┌──────►│  CANCELLED  │◄──────────┐
             │        └─────────────┘           │
             │                                  │
        [caissier]                         [caissier]
             │                                  │
    ┌────────┴────────┐    [laveur]    ┌────────┴────────┐    [caissier/laveur]    ┌─────────────┐    [caissier]    ┌──────────┐
    │     PENDING     │───────────────►│   IN_PROGRESS   │────────────────────────►│  COMPLETED  │────────────────►│   PAID   │
    └─────────────────┘                └─────────────────┘                         └─────────────┘                  └──────────┘
         (initial)                        started_at=now()                           completed_at=now()               paid_at=now()
```

### Tableau des statuts

| Statut | Libellé UI | Couleur | Signification métier | `started_at` | `completed_at` | `paid_at` |
|---|---|---|---|---|---|---|
| `pending` | En attente | 🟡 Jaune | Ticket créé, véhicule en file | — | — | — |
| `in_progress` | En cours | 🔵 Bleu | Lavage démarré par le laveur | ✅ | — | — |
| `completed` | Terminé | 🟢 Vert | Lavage fini, prêt pour encaissement | ✅ | ✅ | — |
| `paid` | Payé | ✅ Vert foncé | Paiement encaissé, cycle terminé | ✅ | ✅ | ✅ |
| `cancelled` | Annulé | 🔴 Rouge | Annulé à n'importe quelle étape non-payée | — | — | — |

### Matrice des transitions autorisées

```php
// app/Models/Ticket.php
const TRANSITIONS = [
    'pending'     => ['in_progress', 'cancelled'],
    'in_progress' => ['completed',   'cancelled'],
    'completed'   => ['paid',        'cancelled'],
    'paid'        => [],          // état terminal
    'cancelled'   => [],          // état terminal
];
```

### Droits par rôle

| Transition | Rôle autorisé | Endpoint |
|---|---|---|
| `pending → in_progress` | Laveur, Caissier | `PATCH /caissier/tickets/{ulid}/status` |
| `in_progress → completed` | Laveur, Caissier | idem |
| `completed → paid` | Caissier uniquement | `POST /caissier/tickets/{ulid}/payment` |
| `* → cancelled` | Caissier uniquement | `PATCH /caissier/tickets/{ulid}/status` |

> **Règle de garde :** `Ticket::canTransitionTo(string $newStatus): bool` est appelée **avant toute écriture** dans `transitionTo()` et dans `PaymentController`. Une transition invalide lève une `LogicException` et retourne un HTTP 422 au frontend.

### Transitions manquantes à envisager (évolutions)

| Transition | Justification métier |
|---|---|
| `completed → in_progress` | Retouche qualité demandée par le chef |
| `cancelled → pending` | Remise en file après annulation par erreur (dans les 5 min) |
| `paid → refunded` | Remboursement partiel ou total (nouveau statut à créer) |

---

## Récapitulatif des Événements & Jobs

| Moment | Event / Job | Canaux broadcast | Déclencheur |
|---|---|---|---|
| Ticket créé + assigné | `TicketAssigned` | `private-admin`, `private-user.{laveur_id}` | `TicketController@store` |
| Changement de statut | `TicketStatusUpdated` | `private-admin`, `private-caissier`, `private-user.{laveur_id}` | `TicketController@updateStatus` |
| Ticket terminé → SMS | `SendTicketReadySms` *(à créer)* | Queue `notifications` | Observer ou Listener |
| Ticket payé | *(pas de broadcast)* | — | `PaymentController@store` |
| Stock sous seuil | *(alerte admin)* | `private-admin` *(à créer)* | `StockProduct::consumeStock()` |

---

*Document généré le 01/04/2026 — basé sur l'état du code source UltraClean v1.x*
