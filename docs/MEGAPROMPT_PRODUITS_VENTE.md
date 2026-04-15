# Méga Prompt — Module Produits & Vente (UltraClean POS)

> **Usage :** Ce document sert de référence complète pour tout développement, débogage ou extension du module produits/vente de l'application UltraClean. Il décrit l'architecture, les règles métier, les flux de données et les cas limites à gérer.

---

## 1. Architecture du module produits

### 1.1 Deux types de produits distincts

| Type | Modèle | But | Stock |
|------|--------|-----|-------|
| **Produit consommable interne** | `StockProduct` | Utilisé lors de l'exécution d'un service (ex : shampooing, cire) | `current_quantity` (float) |
| **Produit vendable** | `SellableProduct` | Vendu directement au client via un ticket | `current_stock` (float) |

**Règle :** Ne jamais confondre les deux. `StockProduct` est lié aux services via `service_stock_products` (pivot). `SellableProduct` est lié aux tickets via `ticket_products`.

### 1.2 Mouvements de stock

| Modèle | Table | Champs clés |
|--------|-------|-------------|
| `StockMovement` | `stock_movements` | `type` (in/out/adjustment), `quantity`, `ticket_id` |
| `SellableProductMovement` | `sellable_product_movements` | `type`, `quantity`, `ticket_id`, `is_free` |

---

## 2. Flux complet d'une vente produit

```
Caissier ouvre ticket POS
        ↓
Onglet "Produits" → ProductGrid affiche les SellableProduct actifs
        ↓
Ajout produit → ligne TicketProduct en mémoire (is_free = false par défaut)
        ↓
  Si client = Atelier → is_free = true automatiquement
        ↓
Soumission ticket → TicketService::attachProductLines() → rows ticket_products
        ↓
Ticket passe en statut "completed"
        ↓
Paiement → ProcessPaymentAction::consumeStock()
           → Pour chaque ticket_products:
              SellableProduct::consumeStock(qty, ticketId, isFree, userId)
           → SellableProductMovement créé
           → current_stock décrémenté
```

---

## 3. Client Atelier — Règles métier

### 3.1 Identification
- Téléphone sentinel : `Client::ATELIER_PHONE = '0000000001'`
- Méthode : `Client::atelier()` — crée le client si absent (firstOrCreate)
- `Client::isAtelierId(int $id)` — vérification rapide par ID
- `Client::isAtelier()` — sur instance

### 3.2 Comportement dans le POS
- **Accès rapide** : Section "Accès rapide" épinglée dans le `ClientDrawer` (sans recherche requise)
- **Auto-gratuit** : Quand Atelier est sélectionné, tous les produits ajoutés au ticket sont automatiquement marqués `is_free = true`
- **Toggle manuel** : Le caissier peut basculer `is_free` sur chaque ligne produit (pour corriger si nécessaire)
- **Indicateur visuel** : Bandeau "🎁 Client Atelier — option gratuit disponible" dans le récap

### 3.3 Comportement du stock
- Les produits gratuits (Atelier) **sortent quand même du stock**
- `SellableProduct::consumeStock($qty, $ticketId, $isFree=true, $userId)` est appelé
- Le mouvement est créé avec `is_free=true` et note `'Usage atelier (gratuit)'`
- Le `line_total_cents` du `TicketProduct` est `0` (gratuit = 0 revenue)

### 3.4 Loyauté
- Le client Atelier **ne cumule pas de points de fidélité** (pas d'exclusion explicite, mais il est interne — surveiller si `isWalkIn()` doit être étendu)

---

## 4. Consommation de stock au paiement

### 4.1 Déclencheur
`ProcessPaymentAction::consumeStock()` est appelé uniquement quand `$targetStatus === Ticket::STATUS_PAID`.

### 4.2 Ordre des opérations
1. Charger `ticket->services.service.stockProducts` + `ticket->products.sellableProduct`
2. **Pass 1** : Vérifier l'insuffisance de `StockProduct` (avec `strict_mode`)
3. **Pass 2** : Consommer `StockProduct` pour chaque service
4. **Pass 3** : Consommer `SellableProduct` pour chaque ligne produit (`ticket_products`)

### 4.3 Mode strict vs laxiste
- `config('stock.strict_mode', false)` contrôle le comportement sur rupture de stock `StockProduct`
- En mode laxiste : `has_stock_warning = true` sur le ticket, paiement continue
- **Note :** Le mode strict ne s'applique actuellement qu'aux `StockProduct`. Les `SellableProduct` peuvent passer en négatif (pas de blocage au paiement).

---

## 5. Composants frontend

### 5.1 ProductGrid (`components/ProductGrid.jsx`)
- Grille des `SellableProduct` actifs
- Scanner code-barres matériel (keydown rapide < 80ms → buffer → Enter)
- Recherche par nom ou code-barres
- Affichage : stock restant, badge "Rupture", badge quantité sélectionnée
- Bouton "Marquer gratuit" visible uniquement si `isAtelierClient = true`

### 5.2 ClientDrawer (`components/ClientDrawer.jsx`)
- Recherche client par nom/téléphone (debounce 300ms)
- Section "Accès rapide" : bouton Atelier épinglé en haut (quand Atelier n'est pas déjà sélectionné)
- Quick-add de nouveau client (nom + téléphone + type + ICE)

### 5.3 TicketRecap (`components/TicketRecap.jsx`)
- Affiche les lignes produit séparément des services
- Indicateur `is_free` avec style ligne barrée et badge "Gratuit"
- Toggle `is_free` par ligne (Atelier uniquement)
- Calcul du total : `productLines.reduce(... l.is_free ? 0 : l.unit_price_cents * l.quantity)`

---

## 6. API REST disponibles

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/sellable-products` | Liste tous les produits actifs (pour POS) |
| POST | `/api/sellable-products/barcode` | Recherche par code-barres |
| GET | `/admin/sellable-products` | Page admin — liste complète |
| POST | `/admin/sellable-products` | Créer un produit |
| PUT | `/admin/sellable-products/{id}` | Modifier un produit |
| DELETE | `/admin/sellable-products/{id}` | Supprimer (soft) |
| POST | `/admin/sellable-products/{id}/movement` | Mouvement manuel (entrée/sortie/ajustement) |
| GET | `/admin/sellable-products/{id}/movements` | Historique des mouvements |

---

## 7. Gestion des cas limites

### 7.1 Stock négatif
- `SellableProduct::consumeStock()` permet le stock négatif (pas de guard)
- Prévoir une alerte admin si `current_stock < 0` après paiement
- Envisager d'ajouter `strict_mode` pour `SellableProduct` dans le futur

### 7.2 Annulation tardive avec produits
- L'`TicketObserver::handleLateCancel()` gère uniquement `StockProduct` (consommables services)
- Les `SellableProduct` ne sont consommés qu'au paiement → pas de restauration nécessaire à l'annulation

### 7.3 Mise à jour d'un ticket avec produits existants
- `TicketService::syncProductLines()` supprime toutes les lignes et recrée
- Le stock **n'est pas re-crédité** lors de l'édition car la consommation n'a lieu qu'au paiement
- Si le ticket est déjà payé : la modification est bloquée (`abort_if($ticket->isPaid())`)

### 7.4 Produit désactivé / supprimé
- `SellableProduct::active()` scope filtre les produits inactifs du POS
- `SellableProduct` utilise `SoftDeletes` — les produits supprimés restent dans les `ticket_products` via `product_name` (snapshot dénormalisé)

### 7.5 Cache POS
- `getFormProps()` met en cache `active_sellable_products` pendant 60 secondes
- **Attention :** Un produit créé peut ne pas apparaître immédiatement dans le POS
- Pour forcer le rafraîchissement : `Cache::forget('active_sellable_products')`

---

## 8. Checklist d'ajout d'un nouveau produit vendable

1. [ ] Admin → Produits vendables → Créer
2. [ ] Renseigner : nom, prix achat, prix vente, stock initial, seuil alerte, unité
3. [ ] Code-barres (optionnel, pour scanner)
4. [ ] `is_active = true` pour apparaître dans le POS
5. [ ] Vérifier que le stock initial est > 0 (sinon "Rupture de stock" dans le POS)
6. [ ] Tester en POS : onglet Produits → produit visible → ajout → récap → paiement → vérifier mouvement

---

## 9. Prompt de débogage rapide

**Symptôme : "Le stock ne diminue pas après paiement"**
- Vérifier `ProcessPaymentAction::consumeStock()` — chercher le bloc "Third pass: consume SellableProduct"
- Vérifier que `ticket->products` est bien chargé avec `products.sellableProduct`
- Vérifier que le ticket est passé à `STATUS_PAID` (pas `STATUS_PARTIAL`)

**Symptôme : "Les produits ne s'affichent pas dans l'onglet Produits"**
- Vérifier que `SellableProduct::is_active = true`
- Vider le cache : `php artisan cache:clear`
- Vérifier que `sellableProducts` est bien passé dans `getFormProps()`

**Symptôme : "Atelier — produits non marqués gratuits automatiquement"**
- Vérifier que `atelierClient` est passé à `ClientDrawer` et `Create`/`Edit`
- Vérifier le `useEffect` sur `isAtelierClient` dans `Create.jsx` / `Edit.jsx`
- Vérifier que `atelierClientId` correspond à l'ID retourné par `Client::atelier()`

**Symptôme : "Double consommation de stock"**
- Vérifier qu'aucun Observer ne consomme aussi `SellableProduct` (seul `ProcessPaymentAction` doit le faire)
- Vérifier que `syncProductLines()` ne déclenche pas de consommation (il ne le fait pas)
