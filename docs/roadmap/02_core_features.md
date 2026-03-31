# ⚙️ 02 — Fonctionnalités Détaillées par Rôle — UltraClean

> **Principe :** Chaque fonctionnalité est décrite avec ses acteurs, ses règles de gestion et ses cas limites. Ce document est la référence métier avant tout développement.

---

## Table des matières

1. [Matrice des rôles](#matrice)
2. [Admin](#admin)
3. [Caissier](#caissier)
4. [Laveur](#laveur)
5. [Règles de gestion transversales](#regles)
6. [Notifications & Alertes](#notifications)

---

## 1. Matrice des rôles et accès

| Fonctionnalité | Admin | Caissier | Laveur |
|---|:---:|:---:|:---:|
| Tableau de bord général | ✅ | ✅ (limité) | ✅ (limité) |
| Créer un ticket | ✅ | ✅ | ❌ |
| Modifier un ticket | ✅ | ✅ (avant paiement) | ❌ |
| Annuler un ticket | ✅ | ✅ (avant paiement) | ❌ |
| Démarrer un lavage | ✅ | ✅ | ✅ (ses tickets) |
| Terminer un lavage | ✅ | ✅ | ✅ (ses tickets) |
| Encaisser un ticket | ✅ | ✅ | ❌ |
| Gérer le catalogue services | ✅ | ❌ | ❌ |
| Gérer les types de véhicules | ✅ | ❌ | ❌ |
| Gérer les tarifs | ✅ | ❌ | ❌ |
| Gérer le personnel | ✅ | ❌ | ❌ |
| Voir tous les tickets | ✅ | ✅ | ❌ |
| Voir les rapports | ✅ | ✅ (jour courant) | ❌ |
| Exporter les rapports | ✅ | ❌ | ❌ |
| Gérer les clients/fidélité | ✅ | ✅ | ❌ |
| Ouvrir/Fermer une session caisse | ✅ | ✅ | ❌ |
| Gérer les paramètres | ✅ | ❌ | ❌ |
| Consulter journal d'audit | ✅ | ❌ | ❌ |

---

## 2. Fonctionnalités Admin

### 2.1 Tableau de bord Admin

**Objectif :** Vue 360° des opérations en temps réel et des performances.

**Widgets affichés :**
- 💰 **Chiffre d'affaires du jour** (total encaissé, en MAD)
- 🚗 **Tickets du jour** : nombre total / par statut (pending, in_progress, completed, paid)
- 👥 **Laveurs actifs** : qui travaille, combien de voitures chacun a terminé
- 📊 **Graphique 7 derniers jours** : revenus journaliers
- 🏆 **Top services** : les 3 prestations les plus vendues du jour
- ⚠️ **Alertes** : tickets en attente depuis > 30 min, shift non fermé

**Rafraîchissement :** Automatique toutes les 60 secondes (polling ou WebSocket selon infrastructure).

---

### 2.2 Gestion du Personnel

**Lister le personnel :**
- Tableau avec : Nom, Rôle, Statut (actif/inactif), Dernière connexion, Tickets traités ce mois
- Filtre par rôle
- Recherche par nom

**Créer un employé :**
- Champs : Nom complet, Téléphone, Email, Rôle, Mot de passe temporaire
- Le PIN caisse (4–6 chiffres) est généré automatiquement ou défini manuellement
- Email de bienvenue optionnel

**Modifier un employé :**
- Modifier tous les champs sauf l'ID
- Réinitialiser le mot de passe
- Activer/Désactiver (ne jamais supprimer définitivement un employé avec historique)

**Règle :** Un admin ne peut pas se désactiver lui-même. Il doit toujours exister au moins 1 admin actif.

---

### 2.3 Catalogue des Services

**Lister les services :**
- Tableau avec : Nom, Description, Durée, Statut, Prix par type de véhicule
- Réorganisation par drag & drop (sort_order)

**Créer/Modifier un service :**
- Champs : Nom, Description, Couleur (sélecteur HEX), Durée estimée (minutes)
- Pour chaque type de véhicule actif : saisie du prix en MAD (stocké en centimes)
- **Validation :** prix ≥ 1 MAD pour chaque combinaison

**Désactiver un service :**
- Le service n'apparaît plus dans la création de ticket
- Les tickets existants avec ce service conservent leur snapshot

---

### 2.4 Gestion des Tarifs (via service)

- Les prix sont modifiables depuis la fiche service
- **Historique des prix :** non requis en MVP (les snapshots dans `ticket_services` suffisent)
- **Remises globales :** possibilité d'appliquer un % de remise à tous les prix (outil batch)

---

### 2.5 Rapports & Analytics

**Rapport journalier :**
- Date sélectionnable
- CA total, CA par méthode de paiement
- Nombre de tickets, nombre de voitures par type
- Récapitulatif par service (quantité vendue, CA)
- Récapitulatif par laveur (tickets traités, temps moyen)

**Rapport mensuel :**
- Même structure avec agrégation mensuelle
- Graphique de tendance

**Rapport de caisse :**
- Par shift : fond d'ouverture, recettes, monnaie rendue, solde théorique vs réel
- Écart signalé en rouge si > 50 MAD

**Export :**
- Format PDF (via dompdf) et CSV
- Nommage automatique : `rapport_20260327.pdf`

---

### 2.6 Paramètres Globaux

- Interface de modification des `settings` regroupées par groupe
- Modification du nom du centre, logo
- Configuration du programme de fidélité (seuils, taux de conversion)
- **Sauvegarde immédiate** avec confirmation toast

---

## 3. Fonctionnalités Caissier

### 3.1 Tableau de bord Caissier

**Widgets affichés :**
- 🎫 Tickets actifs (pending + in_progress + completed non payés)
- 💰 Total encaissé aujourd'hui (son propre shift)
- 🔔 Tickets "completed" en attente de paiement (badge rouge)
- Bouton rapide **"Nouveau Ticket"** (call-to-action principal)

---

### 3.2 Gestion de la Session Caisse (Shift)

**Ouverture de session :**
1. Le caissier arrive, clique "Ouvrir ma session"
2. Saisit le fond de caisse initial (en MAD)
3. Confirmation → shift créé, heure enregistrée

**Fermeture de session :**
1. Clique "Fermer ma session"
2. Compte sa caisse physiquement, saisit le montant réel
3. Le système calcule l'écart (attendu vs réel)
4. Confirmation → shift fermé

**Règle :** Un caissier ne peut pas créer de ticket sans shift ouvert (si le paramètre `shift.require_opening_cash` est activé).

---

### 3.3 Création d'un Ticket (flux principal)

**Étape 1 — Type de véhicule**
- Sélection visuelle avec icônes (Citadine, SUV, Utilitaire, Moto)
- Optionnel : saisie de la plaque d'immatriculation

**Étape 2 — Client (optionnel)**
- Recherche rapide par numéro de téléphone ou plaque
- Si trouvé : affichage du nom, solde de points, tier fidélité
- Si non trouvé : bouton "Créer client" ou continuer sans client

**Étape 3 — Sélection des services**
- Grille de services disponibles avec prix pré-calculés pour le type de véhicule sélectionné
- Sélection multiple possible (ex: lavage extérieur + aspiration)
- Sous-total mis à jour en temps réel
- Champ notes optionnel

**Étape 4 — Récapitulatif & Confirmation**
- Résumé : services sélectionnés, prix unitaires, total
- Affichage de la remise fidélité si client Silver/Gold
- Bouton **"Créer le Ticket"** → ticket créé en statut `pending`

**Règles :**
- Au moins 1 service requis
- Le total ne peut pas être 0 MAD (sauf remise 100% par admin uniquement)
- Le numéro de ticket est généré automatiquement : `TK-YYYYMMDD-XXXX`

---

### 3.4 Vue "File d'Attente" (Tableau des Tickets Actifs)

**Affichage :** Colonnes Kanban ou liste triée par heure de création.

**Colonnes :**
| En attente (pending) | En cours (in_progress) | Terminé (completed) |
|---|---|---|
| Ticket N° | Ticket N° | Ticket N° |
| Type véhicule | Type véhicule | Type véhicule |
| Services | Laveur assigné | ⚡ ENCAISSER |
| Heure création | Temps écoulé | Montant total |

**Actions rapides par ticket :**
- `pending` → **Assigner laveur** / Démarrer / Annuler
- `in_progress` → **Terminer** / Voir détail
- `completed` → **Encaisser** (bouton vert proéminent)

**Indicateur d'urgence :** Ticket `pending` depuis > 20 min → bordure rouge clignotante.

---

### 3.5 Encaissement (Paiement)

1. Clic sur **"Encaisser"** depuis la vue tickets
2. Affichage du récapitulatif final :
   - Liste des services, prix, éventuelles remises
   - Utilisation de points fidélité (si client avec compte)
3. Sélection de la méthode de paiement :
   - **Espèces (Cash)** → saisie du montant remis → calcul automatique de la monnaie à rendre
   - **Carte bancaire** → saisie optionnelle de la référence TPE
   - **Paiement mobile** → saisie de la référence
   - **Mixte** → répartition libre entre méthodes
4. Validation → ticket passe en `paid`, points fidélité crédités
5. Impression du reçu (optionnel)

**Règle du rendu monnaie :**
- Si montant remis < total → **blocage** avec message d'erreur
- Si montant remis > total → affichage de la monnaie à rendre en **grand et en rouge/vert**

**Règle fidélité (earn) :**
- Points gagnés = `floor(total_cents / 100) × loyalty.points_per_mad`
- Ex : ticket de 85 MAD → 85 points gagnés
- Les points sont crédités **uniquement** lors du paiement (statut `paid`)

---

### 3.6 Gestion des Clients & Fidélité

**Fiche client :**
- Informations : nom, téléphone, email, plaque habituelle
- Solde de points, tier, historique des visites
- Bouton "Ajouter des points manuellement" (avec justification)

**Création client :**
- Via formulaire rapide (nom + téléphone obligatoires)
- Numéro de carte fidélité généré automatiquement : `ULC-XXXXX`

---

## 4. Fonctionnalités Laveur

### 4.1 Tableau de bord Laveur

**Vue simplifiée et épurée**, optimisée pour une tablette en condition de lavage (écran potentiellement mouillé, gants).

**Affichage :**
- Ma file : tickets assignés à moi, triés par priorité (heure)
- Boutons larges et bien espacés
- Statut temps réel

---

### 4.2 Vue "Mes Tickets"

**Carte ticket (format compact et lisible) :**
```
┌─────────────────────────────────┐
│  TK-20260327-0042               │
│  🚗 SUV                         │
│  Lavage complet + Aspiration    │
│  Créé à 10h34                   │
│                                 │
│  [ ▶️ DÉMARRER ]                │
└─────────────────────────────────┘
```

**Actions :**
- Ticket `pending` → bouton **"DÉMARRER"** (grand, bleu)
- Ticket `in_progress` → bouton **"TERMINER"** (grand, vert)
- Ticket `completed` → lecture seule (le caissier encaisse)

**Confirmation requise** avant toute transition de statut (popup modal).

---

### 4.3 Mon bilan du jour

- Nombre de voitures lavées
- Liste des types de véhicules traités
- Pas de données financières visibles pour le laveur

---

## 5. Règles de Gestion Transversales

### 5.1 Cycle de vie complet d'un ticket

```
[CAISSIER crée]
      ↓
  [PENDING]  ──────────────────────────────→ [CANCELLED]
      ↓  (laveur assigné + démarrage)              ↑
 [IN_PROGRESS]  ──────────────────────────→ [CANCELLED]
      ↓  (lavage terminé)
  [COMPLETED]
      ↓  (caissier encaisse)
    [PAID]  ←── ÉTAT FINAL, AUCUNE MODIFICATION POSSIBLE
```

### 5.2 Règles de calcul des totaux

```
line_total_cents   = unit_price_cents × quantity - line_discount_cents
subtotal_cents     = SUM(line_total_cents)
discount_cents     = remise globale (manuelle par caissier/admin) + remise fidélité tier
total_cents        = subtotal_cents - discount_cents
```

### 5.3 Règles de concurrence (multi-caissier)

- Un ticket `completed` ne peut être encaissé que par **une seule** action simultanée
- Utiliser un verrou optimiste (timestamp `paid_at`) : si `paid_at IS NOT NULL` → refuser la 2ème tentative avec message "Ce ticket a déjà été encaissé"

### 5.4 Règles de suppression

- **Jamais de `DELETE` physique** sur : tickets, payments, loyalty_transactions, activity_logs
- Soft delete (`deleted_at`) sur : users, clients, services
- Les tickets `cancelled` restent visibles dans l'historique

### 5.5 Fuseaux horaires

- Toutes les timestamps sont stockées en **UTC** dans MySQL
- L'application configure `config/app.php timezone = 'Africa/Casablanca'`
- Laravel affiche toutes les dates en heure locale marocaine
- Les rapports sont découpés par **jour calendaire marocain** (00h00–23h59 `Africa/Casablanca`)

### 5.6 Gestion de la monnaie (MAD)

- Stockage en **centimes** (INT) → aucun problème de virgule flottante
- Affichage toujours formaté avec 2 décimales : `50.00 MAD`
- Arrondi : `round()` à l'entier le plus proche en centimes
- La monnaie rendue est toujours calculée côté serveur, jamais côté client seul

---

## 6. Notifications & Alertes

| Événement | Canal | Destinataire |
|---|---|---|
| Nouveau ticket créé | UI temps réel (toast) | Laveurs actifs |
| Ticket assigné au laveur | UI temps réel | Laveur concerné |
| Ticket terminé (prêt à encaisser) | UI temps réel + badge | Tous les caissiers |
| Ticket en attente > 20 min | UI alerte visuelle | Admin + caissiers |
| Shift non fermé à 23h | UI alerte | Admin |
| Écart de caisse > 50 MAD | UI alerte rouge | Admin |

> **MVP :** Notifications uniquement via UI (pas de SMS/email en phase 1). L'infrastructure de notification est cependant conçue pour être extensible.
