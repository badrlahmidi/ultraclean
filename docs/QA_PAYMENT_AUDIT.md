# QA Payment Audit — RitajPOS / UltraClean
**Sprint 5 · Date : 2026-04-07 · Auteur : Copilot**

---

## 1. Périmètre & architecture de référence

### 1.1 Méthodes de paiement (7)

| Code | Label FR | Canal monétaire | Flux attendu |
|------|----------|-----------------|--------------|
| `cash` | Espèces | Cash uniquement | full payment → `paid` |
| `card` | Carte | CB uniquement | full payment → `paid` |
| `mobile` | Mobile | Mobile Pay | full payment → `paid` |
| `wire` | Virement | Virement bancaire | full payment → `paid` |
| `mixed` | Mixte | ≥ 2 canaux | full payment → `paid` |
| `advance` | Avance | Cash/Card/Mobile/Wire | avance ≥ total → `paid` (is_prepaid) / avance < total → `partial` |
| `credit` | Crédit | Aucun (différé) | 0 collecté → `partial` (balance_due = total) |

### 1.2 États de ticket (state machine)

```
pending ──────────────────────────────────────────────────────────────┐
  │  │                                                                  │
  │  └→ partial ──→ paid                                               │
  ↓          └→ cancelled                                              │
in_progress ─────────────────────────────────────────────────────────→ cancelled
  │  └→ partial ──→ paid                                               │
  ↓          └→ cancelled                                              │
completed ──→ payment_pending ──→ paid                                 │
  │  │              └→ partial ──→ paid                                │
  │  │              └→ completed (rollback)                             │
  │  └→ partial ──→ paid                                               │
  └→ paid                                                              │
```

**Transitions autorisées** (`Ticket::TRANSITIONS`):

| De → | Vers (autorisés) |
|------|-----------------|
| `pending` | `in_progress`, `paused`, `cancelled`, **`paid`**, **`partial`** |
| `in_progress` | `completed`, `paused`, `blocked`, `cancelled`, **`paid`**, **`partial`** |
| `paused` | `in_progress`, `cancelled` |
| `blocked` | `in_progress`, `cancelled` |
| `completed` | `payment_pending`, **`paid`**, **`partial`**, `cancelled` |
| `payment_pending` | **`paid`**, **`partial`**, `completed` (rollback) |
| `partial` | **`paid`**, `cancelled` |
| `paid` | *(terminal)* |
| `cancelled` | *(terminal)* |

### 1.3 Règles métier critiques

| Règle | Implémentation |
|-------|----------------|
| Stock consommé uniquement sur `paid` final | `ProcessPaymentAction::execute()` — `if ($targetStatus === STATUS_PAID)` |
| Points fidélité uniquement sur `paid` final (hors `credit`) | `if ($ticket->client_id && $targetStatus === STATUS_PAID && $method !== 'credit')` |
| `balance_due_cents` = 0 sur `paid`, > 0 sur `partial` | `resolveTargetStatus()` retour `[status, balanceDue, isPrepaid]` |
| `is_prepaid = true` uniquement si paiement avant lavage (`pending`/`in_progress`) | `resolveTargetStatus()` check `in_array($ticket->status, [PENDING, IN_PROGRESS])` |
| Collecte du solde = `requiredCents = balance_due_cents` (pas `total_cents`) | `$requiredCents = STATUS_PARTIAL && balance_due > 0 ? balance_due : total` |
| Advance quelconque positif autorisé (< total ou >= total) | `validateSufficiency()` — advance : retourne si `totalPaid > 0` |
| Mixed : somme canaux = `amount_cents` | `Payment::validateAmounts()` — inclut `amount_wire_cents` (BUG-1 fix) |

---

## 2. Scénarios de test — Paiement complet (méthodes simples)

### TC-01 — Cash / ticket completed

**Précondition :** ticket `completed`, `total_cents = 15000` (150 MAD)  
**Action :** POST `/caissier/tickets/{ulid}/payments` — `method=cash`, `amount_cash_cents=15000`

| Vérification | Attendu |
|---|---|
| HTTP redirect | 302 → show page |
| Flash success | "Paiement Espèces enregistré" |
| `tickets.status` | `paid` |
| `tickets.paid_at` | non null |
| `tickets.balance_due_cents` | `0` |
| `tickets.is_prepaid` | `false` |
| `payments.method` | `cash` |
| `payments.amount_cents` | `15000` |
| `payments.amount_cash_cents` | `15000` |
| `payments.change_given_cents` | `0` |
| Stock consommé | ✅ oui |
| Loyalty (si client) | ✅ oui |

### TC-02 — Cash avec rendu de monnaie

**Précondition :** ticket `completed`, `total_cents = 15000`  
**Action :** `method=cash`, `amount_cash_cents=20000`

| Vérification | Attendu |
|---|---|
| `payments.change_given_cents` | `5000` (50 MAD) |
| Flash success | contient "Rendu : 50.00 MAD" |
| `tickets.status` | `paid` |

### TC-03 — Cash insuffisant

**Précondition :** ticket `completed`, `total_cents = 15000`  
**Action :** `method=cash`, `amount_cash_cents=10000`

| Vérification | Attendu |
|---|---|
| HTTP | 422 (validation exception) |
| Erreur | contient "Montant insuffisant" |
| `tickets.status` | reste `completed` (inchangé) |
| Payment créé | ❌ non |

### TC-04 — Carte

**Précondition :** ticket `payment_pending`, `total_cents = 8000`  
**Action :** `method=card`, `amount_card_cents=8000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `payments.amount_card_cents` | `8000` |
| `payments.amount_cash_cents` | `0` |

### TC-05 — Mobile

**Précondition :** ticket `completed`, `total_cents = 5000`  
**Action :** `method=mobile`, `amount_mobile_cents=5000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `payments.amount_mobile_cents` | `5000` |

### TC-06 — Virement

**Précondition :** ticket `completed`, `total_cents = 120000`  
**Action :** `method=wire`, `amount_wire_cents=120000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `payments.amount_wire_cents` | `120000` |

---

## 3. Scénarios de test — Paiement mixte

### TC-07 — Mixed cash + card (BUG-1 fix area)

**Précondition :** ticket `completed`, `total_cents = 25000`  
**Action :** `method=mixed`, `amount_cash_cents=10000`, `amount_card_cents=15000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `payments.amount_cents` | `25000` |
| `payments.amount_cash_cents` | `10000` |
| `payments.amount_card_cents` | `15000` |
| `Payment::validateAmounts()` | `true` (10000 + 15000 = 25000) |

### TC-08 — Mixed cash + wire (BUG-1 regression test)

**Précondition :** ticket `completed`, `total_cents = 50000`  
**Action :** `method=mixed`, `amount_cash_cents=20000`, `amount_wire_cents=30000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `Payment::validateAmounts()` | `true` — ⚠️ avant BUG-1 fix était `false` car wire exclu |
| `payments.amount_wire_cents` | `30000` |

### TC-09 — Mixed 3 canaux

**Précondition :** ticket `completed`, `total_cents = 30000`  
**Action :** `method=mixed`, `amount_cash_cents=10000`, `amount_card_cents=10000`, `amount_mobile_cents=10000`

| Vérification | Attendu |
|---|---|
| `payments.amount_cents` | `30000` |
| `Payment::validateAmounts()` | `true` |
| `tickets.status` | `paid` |

### TC-10 — Mixed montant insuffisant

**Précondition :** ticket `completed`, `total_cents = 30000`  
**Action :** `method=mixed`, `amount_cash_cents=5000`, `amount_card_cents=5000`

| Vérification | Attendu |
|---|---|
| HTTP | 422 |
| `tickets.status` | inchangé (`completed`) |

---

## 4. Scénarios de test — Avance (advance)

### TC-11 — Advance >= total (pré-paiement complet avant lavage) ← BUG-2 fix

**Précondition :** ticket `pending`, `total_cents = 10000`  
**Action :** `method=advance`, `amount_cash_cents=10000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `tickets.is_prepaid` | `true` |
| `tickets.balance_due_cents` | `0` |
| `payments.amount_cents` | `10000` |
| Stock consommé | ✅ oui |
| Loyalty | ✅ oui (si client) |
| Flash success | "Paiement Avance enregistré" |

### TC-12 — Advance > total (surplus)

**Précondition :** ticket `in_progress`, `total_cents = 10000`  
**Action :** `method=advance`, `amount_cash_cents=12000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `tickets.is_prepaid` | `true` |
| `payments.change_given_cents` | `2000` |
| Flash success | contient "Rendu : 20.00 MAD" |

### TC-13 — Advance partielle < total ← BUG-2 fix principal

**Précondition :** ticket `pending`, `total_cents = 20000`  
**Action :** `method=advance`, `amount_cash_cents=8000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | **`partial`** ← (était `paid` avant fix) |
| `tickets.balance_due_cents` | `12000` |
| `tickets.is_prepaid` | `false` |
| `payments.amount_cents` | `8000` |
| Stock consommé | ❌ non (lavage pas encore effectué) |
| Loyalty | ❌ non |
| Flash success | contient "Avance de 80.00 MAD enregistrée — Reste dû : 120.00 MAD" |

### TC-14 — Advance partielle sur ticket in_progress

**Précondition :** ticket `in_progress`, `total_cents = 30000`  
**Action :** `method=advance`, `amount_cash_cents=15000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `partial` |
| `tickets.balance_due_cents` | `15000` |
| Queue laveur | ✅ ticket visible (partial + completed_at IS NULL) |

### TC-15 — Advance = 0 (invalide)

**Précondition :** ticket `pending`, `total_cents = 10000`  
**Action :** `method=advance`, `amount_cash_cents=0`

| Vérification | Attendu |
|---|---|
| HTTP | 422 |
| Erreur | "Veuillez saisir un montant d'avance." |
| `tickets.status` | inchangé |

### TC-16 — Advance partielle puis collecte du solde

**Étape 1 :** ticket `pending`, `total_cents = 20000` → advance `8000` → statut `partial`, `balance_due = 12000`  
**Étape 2 :** ticket `partial`, `balance_due_cents = 12000` → paiement `method=cash`, `amount_cash_cents=12000`

| Vérification Étape 2 | Attendu |
|---|---|
| `requiredCents` utilisé | `12000` (balance_due, pas total) |
| `tickets.status` | `paid` |
| `tickets.balance_due_cents` | `0` |
| `payments` (count) | 2 enregistrements pour ce ticket |
| Stock consommé | ✅ oui (à la collecte finale) |
| Loyalty | ✅ oui |

### TC-17 — Advance partielle puis collecte avec rendu

**Étape 1 :** advance `8000` sur total `20000` → `partial`, `balance_due = 12000`  
**Étape 2 :** cash `15000` pour solde `12000`

| Vérification Étape 2 | Attendu |
|---|---|
| `payments.change_given_cents` | `3000` |
| `tickets.status` | `paid` |

---

## 5. Scénarios de test — Crédit (credit / paiement différé)

### TC-18 — Crédit sur ticket completed ← BUG-3 fix principal

**Précondition :** ticket `completed`, `total_cents = 18000`  
**Action :** `method=credit`

| Vérification | Attendu |
|---|---|
| `tickets.status` | **`partial`** ← (était `paid` avant fix) |
| `tickets.balance_due_cents` | **`18000`** ← (était 0 avant fix) |
| `payments.amount_cents` | `0` (rien collecté) |
| `payments.method` | `credit` |
| Stock consommé | ❌ non (débloqué uniquement au solde) |
| Loyalty | ❌ non |
| Flash success | "Crédit enregistré — Solde dû : 180.00 MAD (paiement différé)." |

### TC-19 — Crédit sur ticket pending (pré-crédit)

**Précondition :** ticket `pending`, `total_cents = 9000`  
**Action :** `method=credit`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `partial` |
| `tickets.balance_due_cents` | `9000` |
| `tickets.is_prepaid` | `false` |

### TC-20 — Encaissement du crédit différé (collecte totale)

**Étape 1 :** ticket `completed`, credit → `partial`, `balance_due = 18000`  
**Étape 2 :** cash `18000`

| Vérification Étape 2 | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `tickets.balance_due_cents` | `0` |
| Stock consommé | ✅ oui |
| Loyalty | ✅ oui |

### TC-21 — Encaissement crédit via carte

**Étape 1 :** credit → `partial`, `balance_due = 25000`  
**Étape 2 :** card `25000`

| Vérification | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `payments` (2ᵉ) méthode | `card` |

### TC-22 — Tentative double crédit

**Précondition :** ticket déjà en `partial` (après 1er crédit)  
**Action :** POST credit à nouveau

| Vérification | Attendu |
|---|---|
| `payable` check | `partial` → peut aller vers `paid` ✅ mais PAS vers `partial` à nouveau |
| Comportement | `resolveTargetStatus` : status=partial → retourne `[STATUS_PAID, 0, false]` |
| Résultat | Paiement cash/card/etc. requis, pas un 2ᵉ crédit |

> **Note :** Si l'utilisateur soumet `method=credit` alors que `ticket.status = partial`, le résultat est `STATUS_PAID` avec `amount=0` — créant un payment `credit` à 0 qui clôture le ticket. Ce cas-limite doit être **bloqué côté UI** (masquer `credit` et `advance` dans PaymentModal quand `isBalanceCollection=true`).

---

## 6. Scénarios de test — Pré-paiement avance (is_prepaid flow)

### TC-23 — Pré-paiement complet → lavage → ticket déjà paid

**Précondition :** ticket `pending`, advance `15000` = total → `paid`, `is_prepaid=true`  
**Laveur voit :** ticket dans colonne "Prépayé" du kanban  
**Laveur clique "Démarrer" :** action sur un ticket `paid`

| Vérification | Attendu |
|---|---|
| `tickets.status` après paiement | `paid` |
| Visible dans queue laveur (colonne prépayé) | ✅ oui |
| `completed_at` | null (pas encore lavé) |
| Transition `paid → in_progress` | selon TRANSITIONS : **non autorisée** (paid = terminal) |

> **⚠️ Design note :** Les tickets `paid` prépayés sont lavés sans changement de statut dans la DB. Le `completed_at` est posé par le laveur via une action dédiée qui ne change pas le statut.

### TC-24 — Pré-paiement partiel → lavage → collecte solde

**Scénario complet :**
1. Caissier : advance `5000` sur total `15000` → `partial`, `balance_due=10000`
2. Laveur : voit le ticket dans la queue (partial + `completed_at IS NULL`) ✅
3. Laveur : termine le lavage → `completed_at` posé
4. Caissier : bouton "Encaisser le solde (100 MAD)" → cash `10000` → `paid`

| Vérification finale | Attendu |
|---|---|
| `tickets.status` | `paid` |
| `tickets.balance_due_cents` | `0` |
| `payments` count | 2 |
| Stock | consommé une seule fois (à l'étape 4) |

---

## 7. Scénarios de test — Annulation

### TC-25 — Annulation ticket pending

**Précondition :** ticket `pending`  
**Action :** passage à `cancelled`

| Vérification | Attendu |
|---|---|
| Transition autorisée | ✅ `pending → cancelled` |
| Payment | aucun |

### TC-26 — Annulation ticket partial (après avance)

**Précondition :** ticket `partial`, `balance_due=12000`, payment advance `8000`  
**Action :** annulation

| Vérification | Attendu |
|---|---|
| Transition autorisée | ✅ `partial → cancelled` |
| `tickets.status` | `cancelled` |
| Payment existant (advance) | reste en DB (audit trail) |
| Remboursement advance | ❌ hors périmètre automatique — manuel |

### TC-27 — Tentative annulation ticket paid

**Précondition :** ticket `paid`  
**Action :** tentative `cancelled`

| Vérification | Attendu |
|---|---|
| `canTransitionTo('cancelled')` | `false` |
| HTTP | 422 / LogicException |

### TC-28 — Annulation ticket completed sans paiement

**Précondition :** ticket `completed`  
**Action :** `cancelled`

| Vérification | Attendu |
|---|---|
| Transition | ✅ `completed → cancelled` |
| Stock | non consommé |

---

## 8. Scénarios de test — Statuts bloquants

### TC-29 — Paiement sur ticket paused (impossible)

**Précondition :** ticket `paused`  
**Action :** POST payment

| Vérification | Attendu |
|---|---|
| `canTransitionTo(STATUS_PAID)` | `false` |
| `canTransitionTo(STATUS_PARTIAL)` | `false` |
| `$payable` | `false` |
| HTTP | 422 |
| Message | "Ce ticket ne peut pas être encaissé (statut actuel : paused)." |

### TC-30 — Paiement sur ticket already paid (double encaissement)

**Précondition :** ticket `paid`  
**Action :** POST payment

| Vérification | Attendu |
|---|---|
| `canTransitionTo(STATUS_PAID)` | `false` |
| `canTransitionTo(STATUS_PARTIAL)` | `false` |
| HTTP | 422 |
| Payment créé | ❌ non |

### TC-31 — Paiement sur ticket cancelled

**Précondition :** ticket `cancelled`  
**Action :** POST payment

| Vérification | Attendu |
|---|---|
| HTTP | 422 |
| Payment créé | ❌ non |

---

## 9. Scénarios de test — Règles métier stock & fidélité

### TC-32 — Stock non consommé sur advance partielle

**Précondition :** ticket `pending`, advance partielle → `partial`  
**Vérification :** tables `stock_movements` (ou équivalent) — aucune ligne créée pour ce ticket

### TC-33 — Stock consommé une seule fois sur collecte de solde

**Scénario :** advance partielle → `partial` → collecte → `paid`  
**Vérification :** exactement 1 ligne stock par produit pour ce ticket

### TC-34 — Loyalty sur ticket avec client, full payment cash

**Précondition :** ticket `completed`, client attaché, `total_cents=20000`  
**Action :** `method=cash`, `amount_cash_cents=20000`  
**Vérification :** `payments` enregistrement ; `client.loyalty_points` incrémenté ; `tickets.loyalty_points_earned > 0`

### TC-35 — Loyalty non attribuée sur credit

**Précondition :** ticket `completed`, client attaché  
**Action :** `method=credit`  
**Vérification :** `tickets.loyalty_points_earned = 0` ; pas de mouvement fidélité

### TC-36 — Loyalty attribuée à la collecte du solde crédit

**Scénario :** credit → `partial` → cash collecte → `paid`  
**Vérification :** loyalty attribuée uniquement au moment de la collecte cash (étape 2)

---

## 10. Scénarios de test — Interface utilisateur

### TC-37 — Badge StatusBadge pour chaque statut

| Statut | Couleur badge | Texte | Pulsing dot |
|--------|--------------|-------|-------------|
| `pending` | jaune | "En attente" | non |
| `in_progress` | bleu | "En cours" | oui |
| `paused` | gris | "En pause" | non |
| `blocked` | rouge | "Bloqué" | non |
| `completed` | vert | "Terminé" | non |
| `payment_pending` | indigo | "Attente paiement" | oui |
| `partial` | orange | "Solde dû" | oui |
| `paid` | vert foncé | "Payé" | non |
| `cancelled` | rouge foncé | "Annulé" | non |

### TC-38 — Show.jsx : bannière orange pour ticket partial

**Précondition :** ticket `partial`, `balance_due_cents=12000`  
**Vérification :**
- Bannière orange affichée "Solde dû : 120.00 MAD"
- Bouton "Encaisser le solde (120.00 MAD)" visible
- Panneau balance (total / payé / reste dû) visible

### TC-39 — PaymentModal en mode collecte de solde

**Précondition :** ticket `partial`, `balance_due_cents=8000`  
**Vérification dans PaymentModal :**
- Header : "Encaisser le solde restant"
- Sous-titre : "Ticket total : XX MAD"
- Montant dû affiché : `8000` (pas total)
- Méthodes `advance` et `credit` **masquées**
- Bouton submit : "Encaisser 80.00 MAD"
- Quick amounts calculés sur `8000`

### TC-40 — Index.jsx : filtre partial + bouton orange

**Vérification :**
- Filtre statut `partial` disponible dans les options de filtre
- Tickets partiels affichent bouton orange "Solde X MAD"

### TC-41 — Queue laveur : tickets partial visibles

**Précondition :** ticket `partial`, `completed_at IS NULL` (pas encore lavé)  
**Vérification :** ticket visible dans la queue laveur (kanban colonne appropriée)  
**Si `completed_at` non null :** ticket **absent** de la queue (lavage terminé, en attente caissier)

---

## 11. Matrice de couverture méthode × statut initial

| Méthode \ Statut initial | `pending` | `in_progress` | `completed` | `payment_pending` | `partial` | `paused` | `paid` | `cancelled` |
|---|---|---|---|---|---|---|---|---|
| `cash` | ✅ paid (prepaid) | ✅ paid (prepaid) | ✅ paid | ✅ paid | ✅ paid (solde) | ❌ bloqué | ❌ bloqué | ❌ bloqué |
| `card` | ✅ paid (prepaid) | ✅ paid (prepaid) | ✅ paid | ✅ paid | ✅ paid (solde) | ❌ | ❌ | ❌ |
| `mobile` | ✅ paid (prepaid) | ✅ paid (prepaid) | ✅ paid | ✅ paid | ✅ paid (solde) | ❌ | ❌ | ❌ |
| `wire` | ✅ paid (prepaid) | ✅ paid (prepaid) | ✅ paid | ✅ paid | ✅ paid (solde) | ❌ | ❌ | ❌ |
| `mixed` | ✅ paid (prepaid) | ✅ paid (prepaid) | ✅ paid | ✅ paid | ✅ paid (solde) | ❌ | ❌ | ❌ |
| `advance (>=total)` | ✅ paid, is_prepaid=T | ✅ paid, is_prepaid=T | ✅ paid | ✅ paid | ✅ paid (solde total couvert) | ❌ | ❌ | ❌ |
| `advance (<total)` | ✅ partial | ✅ partial | ✅ partial | ✅ partial | ✅ paid (si couvre solde) | ❌ | ❌ | ❌ |
| `credit` | ✅ partial | ✅ partial | ✅ partial | ✅ partial | ⚠️ clôture à paid (UI bloque) | ❌ | ❌ | ❌ |

> ⚠️ La cellule `credit × partial` : le backend retourne `STATUS_PAID` (car `resolveTargetStatus` retourne `PAID` pour tout ticket déjà partial), mais le frontend bloque `credit` et `advance` en mode balance collection pour éviter ce cas limite.

---

## 12. Bugs corrigés — Référence rapide (Sprint 5)

| ID | Description | Fichier | Fix |
|----|-------------|---------|-----|
| BUG-1 | `validateAmounts()` excluait `amount_wire_cents` du sum mixte | `Payment.php` | Ajouté `+ $this->amount_wire_cents` |
| BUG-2 | advance partielle → `STATUS_PAID` au lieu de `STATUS_PARTIAL` | `ProcessPaymentAction.php` | `resolveTargetStatus()` : advance < total → partial avec `balance_due_cents` |
| BUG-3 | credit → `STATUS_PAID` avec `amount=0` (dette non tracée) | `ProcessPaymentAction.php` | credit → partial avec `balance_due_cents = total_cents` |
| BUG-4 | `advance` tombait dans le `default` de `resolveAmounts()` | `ProcessPaymentAction.php` | Arm `'advance'` explicite dans le match |
| BUG-5 | `PaymentController` vérifiait uniquement `canTransitionTo(STATUS_PAID)` | `PaymentController.php` | `$payable = canTransitionTo(PAID) \|\| canTransitionTo(PARTIAL)` |

---

## 13. Migrations liées aux corrections

| Migration | Champ | Type |
|-----------|-------|------|
| `2026_04_07_000001_add_is_prepaid_to_tickets` | `tickets.is_prepaid` | `BOOLEAN DEFAULT 0` |
| `2026_04_07_000002_add_balance_due_cents_to_tickets` | `tickets.balance_due_cents` | `UNSIGNED INT DEFAULT 0` |
| `2026_04_07_000002_add_balance_due_cents_to_tickets` | `tickets.status` ENUM | ajout de `'partial'` |

---

## 14. Checklist de validation finale (avant mise en production)

### Backend
- [ ] `php artisan migrate --force` exécuté en production
- [ ] `php artisan config:cache && php artisan route:cache` après déploiement
- [x] Tous les `STATUS_PARTIAL` visibles dans `TicketController::statusCounts` — `$allStatuses` inclut `'partial'`
- [x] `ProcessPaymentAction` couvert par tests Feature (`tests/Feature/Payment/`) — `PaymentControllerTest` 26/26 ✅
- [x] `Payment::validateAmounts()` couvert par test Unit — `PaymentValidateAmountsTest` 13/13 ✅
- [x] `Ticket::transitionTo()` couvert par test Unit pour toutes les transitions — `TicketStateMachineTest` 25/25 ✅

### Frontend
- [ ] `StatusBadge` render testé pour `partial` et `payment_pending`
- [ ] `PaymentModal` : `advance` et `credit` masqués en mode balance collection
- [ ] `Show.jsx` : bannière orange et bouton "Encaisser le solde" visibles sur ticket partial
- [ ] `Index.jsx` : filtre `partial` fonctionnel
- [ ] Queue laveur : tickets partial affichés

### Régression
- [ ] Paiement cash standard sur ticket `completed` toujours fonctionnel
- [ ] Rendu de monnaie correct
- [ ] Double encaissement bloqué (ticket `paid` → 422)
- [ ] Annulation ticket `partial` possible
- [ ] Stock consommé **une seule fois** (pas en double lors de collecte de solde)
- [ ] Loyalty attribuée **une seule fois** (à la collecte finale, pas à l'advance)

---

*Document généré automatiquement — RitajPOS Sprint 5 · 2026-04-07*
