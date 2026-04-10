# AUDIT — Module Rendez-vous (Appointments)

> **Date d'audit :** 7 avril 2026  
> **Type :** Lecture seule — aucune modification de code  
> **Fichiers analysés :**
> - `app/Models/Appointment.php`
> - `app/Http/Controllers/Admin/AppointmentController.php`
> - `app/Services/WasherScheduler.php`
> - `app/Policies/AppointmentPolicy.php`
> - `database/migrations/2026_04_01_000033_create_appointments_table.php`
> - `routes/web.php` (section appointments)

---

## 1. Architecture du module

### 1.1 Vue d'ensemble

Le module Rendez-vous (RDV) couvre le cycle de vie complet d'une réservation de lavage :
de la prise de RDV jusqu'à la création automatique d'un ticket de caisse.
Il s'articule autour de trois couches :

```
[AppointmentController]  ← Routes HTTP + autorisation
        │
        ├── [Appointment (Model)]       ← State machine + conflict scope
        │         │
        │         └── [AppointmentPolicy]   ← RBAC (admin / caissier / laveur)
        │
        └── [WasherScheduler (Service)]  ← Calcul due_at + feasibility
```

### 1.2 Routes exposées

| Méthode | URI | Nom de route | Description |
|---------|-----|-------------|-------------|
| `GET` | `/admin/appointments` | `admin.appointments.index` | Liste paginée (filtres + statusCounts) |
| `GET` | `/admin/appointments/calendar` | `admin.appointments.calendar` | Vue calendrier jour/laveur |
| `GET` | `/admin/appointments/check-conflicts` | `admin.appointments.check-conflicts` | API JSON — conflits temps réel |
| `GET` | `/admin/appointments/vehicle-brands` | `admin.appointments.vehicle-brands` | API JSON — autocomplétion marques |
| `GET` | `/admin/appointments/{appointment}` | `admin.appointments.show` | Détail + historique client |
| `POST` | `/admin/appointments` | `admin.appointments.store` | Création |
| `PUT` | `/admin/appointments/{appointment}` | `admin.appointments.update` | Modification |
| `DELETE` | `/admin/appointments/{appointment}` | `admin.appointments.destroy` | Suppression douce |
| `POST` | `/admin/appointments/{appointment}/confirm` | `admin.appointments.confirm` | Confirmation |
| `POST` | `/admin/appointments/{appointment}/convert-ticket` | `admin.appointments.convert` | Conversion → Ticket |

> **Note :** la route `show` est déclarée dans le bloc **non-resourceful** (ligne 209 de `web.php`),
> après le groupe de routes actives — ceci la rend accessible aux caissiers également.

---

## 2. Modèle de données

### 2.1 Table `appointments`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | BIGINT PK | Clé primaire auto-increment |
| `ulid` | VARCHAR(26) UNIQUE | Identifiant public (ULID) — généré au `creating` |
| `client_id` | FK → `clients` (nullable) | Client associé — `nullOnDelete` |
| `assigned_to` | FK → `users` (nullable) | Laveur assigné — `nullOnDelete` |
| `created_by` | FK → `users` (non-nullable) | Auteur du RDV |
| `ticket_id` | FK → `tickets` (nullable) | Ticket créé après conversion — `nullOnDelete` |
| `scheduled_at` | DATETIME | Date/heure planifiée du RDV |
| `confirmed_at` | DATETIME (nullable) | Horodatage de confirmation |
| `estimated_duration` | SMALLINT (défaut 30) | Durée estimée en minutes |
| `vehicle_plate` | VARCHAR(20) nullable | Immatriculation |
| `vehicle_brand` | VARCHAR(80) nullable | **Snapshot textuel** de la marque (dénormalisé) |
| `vehicle_brand_id` | FK → `vehicle_brands` nullable | FK marque |
| `vehicle_model_id` | FK → `vehicle_models` nullable | FK modèle |
| `vehicle_type_id` | FK → `vehicle_types` nullable | FK type de véhicule |
| `notes` | TEXT nullable | Notes libres |
| `cancelled_reason` | VARCHAR(255) nullable | Motif d'annulation |
| `status` | ENUM | État courant (7 valeurs) |
| `source` | ENUM | Canal d'origine du RDV |
| `deleted_at` | DATETIME nullable | Soft delete |

**Index définis :**
- `(scheduled_at)` — requêtes calendrier
- `(assigned_to, scheduled_at)` — détection conflits + file laveur
- `(status)` — filtres liste / compteurs

### 2.2 Relations Eloquent (Appointment → *)

| Méthode | Type | Cible |
|---------|------|-------|
| `client()` | `BelongsTo` | `Client` |
| `assignedTo()` | `BelongsTo` | `User` (laveur) |
| `creator()` | `BelongsTo` | `User` (auteur) |
| `ticket()` | `BelongsTo` | `Ticket` |
| `vehicleBrand()` | `BelongsTo` | `VehicleBrand` |
| `vehicleModel()` | `BelongsTo` | `VehicleModel` |
| `vehicleType()` | `BelongsTo` | `VehicleType` |

### 2.3 Sources (canal d'origine)

`walk_in` · `phone` · `online` · `whatsapp` · `admin`

---

## 3. Machine à états

### 3.1 Statuts (7)

| Constante | Valeur | Label FR | Tailwind badge |
|-----------|--------|----------|----------------|
| `STATUS_PENDING` | `pending` | En attente | `bg-yellow-100 text-yellow-800` |
| `STATUS_CONFIRMED` | `confirmed` | Confirmé | `bg-blue-100 text-blue-800` |
| `STATUS_ARRIVED` | `arrived` | Arrivé | `bg-indigo-100 text-indigo-800` |
| `STATUS_IN_PROGRESS` | `in_progress` | En cours | `bg-purple-100 text-purple-800` |
| `STATUS_COMPLETED` | `completed` | Terminé | `bg-green-100 text-green-800` |
| `STATUS_CANCELLED` | `cancelled` | Annulé | `bg-red-100 text-red-800` |
| `STATUS_NO_SHOW` | `no_show` | Absent | `bg-gray-100 text-gray-600` |

### 3.2 Transitions autorisées

```
pending ──────┬──► confirmed
              ├──► cancelled
              └──► no_show

confirmed ────┬──► arrived
              ├──► cancelled
              └──► no_show

arrived ──────┬──► in_progress
              └──► cancelled

in_progress ──┬──► completed
              └──► cancelled

completed ────  (terminal)
cancelled ────  (terminal)
no_show ──────  (terminal)
```

### 3.3 Règles métier de la machine à états

1. **`transitionTo(string $newStatus, array $extra = [])`** lève une `\RuntimeException` si la transition n'est pas dans `TRANSITIONS[$this->status]`.
2. Lors d'une transition vers `confirmed`, l'attribut `confirmed_at` est automatiquement horodaté (`now()`).
3. Les transitions sont atomiques : `$this->update($attrs)` — pas de dispatch d'événement explicite.

### 3.4 Helpers booléens

`isPending()`, `isConfirmed()`, `isArrived()`, `isInProgress()`, `isCompleted()`, `isCancelled()`, `isNoShow()`

### 3.5 Règles d'édition et de conversion

- **`isEditable()`** → `true` si statut `pending` ou `confirmed` uniquement.
- **`isConvertible()`** → `true` si statut `confirmed` ou `arrived` **ET** `ticket_id === null` (non encore converti).

---

## 4. Mécanique de planification — WasherScheduler

### 4.1 Vue d'ensemble

`WasherScheduler` (service statique) calcule dynamiquement l'heure de fin estimée d'un nouveau travail en tenant compte de toute la charge courante d'un laveur.

### 4.2 `queueMinutesForWasher(int $washerId): int`

Calcule le **nombre de minutes de travail déjà planifiées** devant le nouveau ticket.

**Sources incluses :**
1. **Tickets directs** (`assigned_to = $washerId`) aux statuts `pending`, `in_progress`, `paused`, `blocked`
2. **Tickets assistant** (`ticket_washers.user_id = $washerId`) aux mêmes statuts

**Calcul du temps restant par ticket :**

| Statut | Formule |
|--------|---------|
| `in_progress` | `max(0, estimated*60 − (diffInSeconds(started_at, now()) − total_paused_seconds))` |
| `paused` / `blocked` | `max(0, estimated*60 − (diffInSeconds(started_at, paused_at) − total_paused_seconds))` |
| `pending` | `estimated_duration` (durée entière) |

3. **RDV confirmés/arrivés futurs non convertis** — via `confirmedAppointmentMinutes()`.

### 4.3 `confirmedAppointmentMinutes(int $washerId): int`

Somme des `estimated_duration` des RDV du laveur avec statut `confirmed` ou `arrived`, dont `ticket_id IS NULL` et `scheduled_at >= now()`.

> **Effet :** La file virtuelle intègre les créneaux réservés en avance, même avant conversion en ticket.

### 4.4 `computeDueAt(int $washerId, int $newDurationMinutes): Carbon`

```
rawEnd = now() + queueMinutesForWasher() + newDurationMinutes
return applyBusinessHours(rawEnd)
```

### 4.5 `applyBusinessHours(Carbon $rawEnd): Carbon`

Lit les settings `business_close_hour`, `business_close_minute`, `business_open_hour`, `business_open_minute`.

```
si rawEnd ≤ closeToday   → retourne rawEnd (dans les horaires)
sinon (overflow)         → retourne openTomorrow + overflowMinutes
```

**Exemple :**
- Fermeture à 21h00, ouverture à 8h00.
- `rawEnd` = 21h45 → overflow = 45 min → retourne **lendemain 8h45**.

> **Limitation actuelle :** l'overflow ne gère qu'**un seul niveau** (pas de récursivité pour les jours fermés ni les week-ends).

### 4.6 `feasibilityCheck(int $washerId, int $newDurationMinutes = 0): array`

Utilisé par la vue Calendar pour afficher les disponibilités en temps réel.

**Retourne :**
```json
{
  "queue_minutes": 45,
  "due_at": "2026-04-07T21:15:00+01:00",
  "overflow": false,
  "warning": null
}
```

| Champ | Description |
|-------|-------------|
| `queue_minutes` | File actuelle du laveur |
| `due_at` | ISO 8601, après business hours (null si laveur libre) |
| `overflow` | `true` si `due_at > endOfDay()` |
| `warning` | Message prêt à afficher côté frontend, ou `null` |

---

## 5. Flux de conversion RDV → Ticket

### 5.1 Déclencheurs

- **Admin** : bouton "Convertir en ticket" dans `Admin/Appointments/Show`
- **Caissier** : bouton dans sa vue (autorisation via `AppointmentPolicy::convertToTicket`)

### 5.2 Pré-conditions vérifiées

1. `$appointment->isConvertible()` → statut `confirmed` ou `arrived`, et `ticket_id === null`
2. Autorisation policy : `convertToTicket` → admin (bypass `before`) ou caissier

### 5.3 Transaction DB avec verrouillage

```php
DB::transaction(function () use ($appointment) {
    $appointment = Appointment::lockForUpdate()->findOrFail($appointment->id);
    // re-vérification inside lock
    if (! $appointment->isConvertible()) throw new RuntimeException(...);
    ...
});
```

> `lockForUpdate()` prévient la double conversion en cas de race condition (deux requêtes simultanées).

### 5.4 Données copiées du RDV vers le Ticket

| Champ Ticket | Source |
|-------------|--------|
| `vehicle_plate` | `appointment.vehicle_plate` |
| `vehicle_brand` | `appointment.vehicle_brand` (snapshot) |
| `vehicle_brand_id` | `appointment.vehicle_brand_id` |
| `vehicle_model_id` | `appointment.vehicle_model_id` |
| `vehicle_type_id` | `appointment.vehicle_type_id` |
| `client_id` | `appointment.client_id` |
| `assigned_to` | `appointment.assigned_to` (laveur) |
| `created_by` | `auth()->id()` (caissier/admin qui fait la conversion) |
| `shift_id` | Shift ouvert de l'utilisateur courant (ou `null`) |
| `notes` | `appointment.notes` |
| `estimated_duration` | `appointment.estimated_duration` |
| `due_at` | `WasherScheduler::computeDueAt(washerId, duration)` (si laveur assigné) |
| `status` | `Ticket::STATUS_PENDING` (point de départ) |

### 5.5 Transitions d'état après création du ticket

```
[RDV confirmed] → arrived → in_progress
[RDV arrived]             → in_progress
```

L'appointment termine en `in_progress`, signifiant que le lavage est en cours.

### 5.6 Lien bidirectionnel

`appointment.ticket_id = ticket.id` — permet la navigation RDV ↔ Ticket dans les deux sens.

### 5.7 Audit log

```php
ActivityLog::log('appointment.converted', $appointment, [
    'ticket_id'     => $ticket->id,
    'ticket_number' => $ticket->ticket_number,
]);
```

### 5.8 Redirection post-conversion

| Rôle | Destination |
|------|-------------|
| Admin | `admin.appointments.show` (reste sur le RDV) |
| Caissier | `caissier.tickets.show` (bascule sur le ticket POS) |

---

## 6. Détection des conflits

### 6.1 Définition d'un conflit

Deux RDV du **même laveur** dont les plages horaires **se chevauchent** :

```
existing.scheduled_at < new.end
AND (existing.scheduled_at + existing.duration) > new.start
```

### 6.2 Statuts entrant dans le scope de conflit

`confirmed`, `arrived`, `in_progress` — seuls les RDV "actifs" sont considérés.
Les RDV `pending`, `cancelled`, `no_show`, `completed` sont ignorés.

### 6.3 Compatibilité SQLite / MySQL

Le calcul de la fin d'un RDV existant utilise une expression SQL adaptée au driver :

```php
// SQLite
"datetime(scheduled_at, '+' || estimated_duration || ' minutes')"

// MySQL / MariaDB / PostgreSQL
"DATE_ADD(scheduled_at, INTERVAL estimated_duration MINUTE)"
```

### 6.4 Politique de blocage vs avertissement

| Moment | Comportement |
|--------|-------------|
| **Création** (`store`) | ⚠️ Avertissement dans le flash message — **non bloquant** |
| **Confirmation** (`confirm`) | ⚠️ Avertissement avec détail des conflits (`vehicle_plate + H:i`) — **non bloquant** |
| **API temps réel** (`checkConflicts`) | JSON avec `has_conflicts`, `count`, liste détaillée — utilisé par le frontend pour avertissements inline |

### 6.5 `findConflicts()` — API statique

```php
Appointment::findConflicts(
    int $washerId,
    Carbon $start,
    int $durationMinutes,
    ?int $excludeId = null  // exclure le RDV en cours d'édition
)
// → Collection avec : id, ulid, client_id, scheduled_at, estimated_duration, status, vehicle_plate
```

---

## 7. Vue Calendrier

### 7.1 Architecture

Vue journalière par laveur : affiche les créneaux de tous les laveurs actifs pour un jour donné.

**Données transmises à `Admin/Appointments/Calendar` :**

| Prop | Contenu |
|------|---------|
| `date` | Date sélectionnée (ISO date string) |
| `washers` | Liste des laveurs actifs `(id, name, avatar)` |
| `appointmentsByWasher` | Map `washerId → Appointment[]` pour le jour sélectionné |
| `washerQueues` | Map `washerId → feasibilityCheck(id, 30)` — file en temps réel |
| `openHour` | Heure d'ouverture (Setting `business_open_hour`, défaut 8) |
| `closeHour` | Heure de fermeture (Setting `business_close_hour`, défaut 21) |

### 7.2 Données par RDV dans le calendrier

```json
{
  "id": 42,
  "ulid": "01HX...",
  "status": "confirmed",
  "status_label": "Confirmé",
  "client_name": "Jean Dupont",
  "vehicle_plate": "AB-123-CD",
  "vehicle_brand": "Peugeot 308",
  "scheduled_at": "2026-04-07T10:00:00+02:00",
  "scheduled_end_at": "2026-04-07T10:45:00+02:00",
  "estimated_duration": 45,
  "ticket_id": null,
  "is_convertible": true,
  "notes": "..."
}
```

### 7.3 `feasibilityCheck` dans le calendrier

La prop `washerQueues` permet au frontend d'afficher pour chaque colonne de laveur :
- Sa file courante (minutes)
- Son prochain `due_at` estimé (pour un job de 30 min par défaut)
- Un warning si overflow

---

## 8. Autorisation — AppointmentPolicy

| Ability | Admin | Caissier | Laveur |
|---------|-------|----------|--------|
| `viewAny` | ✅ (before) | ✅ | ✅ |
| `view` | ✅ (before) | ✅ (tous) | ✅ (ses RDV uniquement) |
| `create` | ✅ (before) | ❌ | ❌ |
| `update` | ✅ (before) | ❌ | ❌ |
| `delete` | ✅ (before) | ❌ | ❌ |
| `convertToTicket` | ✅ (before) | ✅ | ❌ |

> La méthode `before()` court-circuite toutes les vérifications pour l'admin.

---

## 9. Notifications

À la création d'un RDV, une notification `NewAppointment` est envoyée à :
- Tous les **admins actifs**
- Le **laveur assigné** (si présent)
- **Sauf l'auteur** du RDV (`where('id', '!=', auth()->id())`)

---

## 10. Audit log

| Événement | Données loggées |
|-----------|-----------------|
| `appointment.created` | `scheduled_at` |
| `appointment.confirmed` | _(aucune donnée extra)_ |
| `appointment.converted` | `ticket_id`, `ticket_number` |
| `appointment.deleted` | _(aucune donnée extra)_ |

---

## 11. Lacunes identifiées & plan d'amélioration

### 11.1 🔴 Lacunes critiques

| # | Problème | Impact | Suggestion |
|---|---------|--------|------------|
| L1 | `applyBusinessHours` ne gère qu'**un seul débordement** (pas de récursivité) | Si la file dépasse 2 jours (fermeture → lendemain soir → surlendemain), `due_at` sera encore en dehors des heures d'ouverture | Rendre `applyBusinessHours` récursive ou itérative + intégrer les jours ouvrés (`business_days` setting) |
| L2 | `confirmedAppointmentMinutes` utilise `sum('estimated_duration')` sans tenir compte des chevauchements entre RDV | Si deux RDV sont planifiés en parallèle, leur durée est comptée deux fois dans la file | Calculer une plage temporelle effective plutôt qu'une somme brute |
| L3 | Pas de **route `show` dans le groupe admin principal** — elle est dans un groupe secondaire (ligne 209). Risque de confusion sur les middlewares appliqués | Possible faille d'autorisation selon la configuration du groupe | Déplacer `show` dans le groupe principal avec les autres routes appointments |

### 11.2 🟡 Lacunes modérées

| # | Problème | Impact | Suggestion |
|---|---------|--------|------------|
| L4 | `convertToTicket` crée le ticket avec `status = pending` mais **ne démarre pas** le chrono du ticket (`started_at` reste null) — c'est correct car le ticket est pending, mais l'appointment passe à `in_progress`, créant une incohérence sémantique | L'appointment dit "en cours" mais le ticket est "en attente" | Soit démarrer le ticket immédiatement (`in_progress` + `started_at = now()`), soit laisser l'appointment à `arrived` jusqu'au vrai démarrage |
| L5 | **Aucun test feature** pour le module Appointments (ConvertToTicket, ConflictDetection, transitions d'état) | Régression possible | Ajouter `AppointmentTest.php` dans `tests/Feature/` |
| L6 | `confirmedAppointmentMinutes` filtre `scheduled_at >= now()` mais pas par jour — un RDV confirmé à J+7 gonfle artificiellement la file de J+0 | `due_at` surestimé | Filtrer par plage temporelle pertinente (≤ `now() + queue_horizon_hours` setting) |
| L7 | Le `vehicle_brand` snapshot (texte dénormalisé) n'est mis à jour que si `vehicle_brand_id` change lors d'un `update`. Si la marque est renommée en base, le snapshot reste obsolète | Données affichées divergentes | Documenter cette dénormalisation intentionnelle ou forcer la re-synchronisation |

### 11.3 🟢 Améliorations souhaitables

| # | Amélioration | Valeur |
|---|-------------|--------|
| A1 | Ajouter une route `/appointments/{appointment}/no-show` dédiée (actuellement non exposée côté HTTP — la transition doit se faire via une action générique) | UX |
| A2 | Exposer `feasibilityCheck` en API JSON autonome (GET `/api/washer/{id}/queue`) pour les intégrations futures (booking online) | Extensibilité |
| A3 | Ajouter un event/listener `AppointmentConverted` pour découpler les effets secondaires (SMS client, mise à jour CRM, etc.) | Architecture |
| A4 | Implémenter un **rappel automatique** (Job schedulé) pour les RDV `confirmed` proches de leur `scheduled_at` (ex: J-1 via `NewAppointment` notification) | Fonctionnel |
| A5 | Ajouter la politique de **doublon client** : avertir si le même client a un autre RDV à ±2h le même jour | UX / opérationnel |

---

## 12. Résumé flux complet — parcours type

```
1. Admin crée le RDV (source: phone)
        status: pending
        → Notification → admins + laveur assigné
        → Conflits vérifiés (warning non bloquant)

2. Admin confirme le RDV
        pending → confirmed
        confirmed_at = now()
        → Conflits re-vérifiés (warning dans flash)

3. Client arrive
        confirmed → arrived
        (via action manuelle admin ou caissier)

4. Caissier/Admin déclenche "Convertir en ticket"
        → DB transaction + lockForUpdate()
        → Ticket créé (données copiées)
        → due_at = WasherScheduler::computeDueAt()
        → appointment.ticket_id = ticket.id
        → arrived → in_progress  (ou confirmed → arrived → in_progress)
        → ActivityLog: appointment.converted
        → Redirection selon rôle

5. Ticket suit son propre cycle de vie (POS)
        pending → in_progress → paused → done → paid
        (indépendant du module Appointments)
```

---

*Audit rédigé à partir de la lecture statique du code — aucune modification effectuée.*
