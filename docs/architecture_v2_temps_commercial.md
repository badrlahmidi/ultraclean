# Architecture v2 — Temps Dynamique, State Machine Corrigée & Module Commercial

> **Contexte :** Ce document est un complément technique à `workflow_parcours_client.md`. Il ne réécrit pas l'existant — il corrige les angles morts identifiés et conçoit deux modules manquants. Toutes les propositions sont ancrées dans la stack réelle du projet : **Laravel 12 / Inertia + React / SQLite→MySQL / Laravel Reverb / barryvdh/laravel-dompdf**.
>
> **Date de conception :** 01/04/2026

---

## Partie 1 — State Machine Corrigée : Les Failles Bouchées

### 1.1 Statut `payment_pending` — Paiements Asynchrones sans Bloquer la Caisse

#### Le problème actuel

Avec `completed → paid` comme transition directe, un paiement Wave/Orange Money (qui nécessite une confirmation webhook de l'opérateur mobile) force le caissier à **attendre** la réponse réseau avant de pouvoir passer au client suivant. Sur une station avec 10 véhicules en file, c'est un goulot d'étranglement réel.

#### La solution : un statut tampon `payment_pending`

```
completed ──────────────────────────────────────────────► paid
              │                                  ▲
              │ [initiate async payment]         │ [webhook confirms]
              ▼                                  │
         payment_pending ────────────────────────┘
              │
              │ [timeout / échec]
              ▼
         completed  (retour automatique après X minutes)
```

#### Mise à jour de `Ticket::TRANSITIONS`

```php
const STATUS_PAYMENT_PENDING = 'payment_pending';

const TRANSITIONS = [
    'pending'         => ['in_progress',     'cancelled'],
    'in_progress'     => ['completed',       'cancelled'],
    'completed'       => ['payment_pending', 'paid', 'cancelled'],
    'payment_pending' => ['paid',            'completed'],  // completed = rollback
    'paid'            => [],
    'cancelled'       => [],
];
```

#### Migration SQL

```sql
-- Ajout de la colonne payment_initiated_at
ALTER TABLE tickets
    ADD COLUMN payment_initiated_at TIMESTAMP NULL,
    ADD COLUMN payment_reference    VARCHAR(255) NULL,
    ADD COLUMN payment_provider     VARCHAR(50) NULL;   -- 'wave' | 'orange' | 'cmi_tpe'
```

#### Séquence technique complète

**1. Le caissier clique "Payer par Wave"**

```php
// PaymentController@initiateAsync
$ticket->transitionTo('payment_pending', [
    'payment_initiated_at' => now(),
    'payment_provider'     => 'wave',
]);

$reference = WavePaymentGateway::initiate([
    'amount'     => $ticket->total_cents / 100,
    'currency'   => 'MAD',
    'webhook_url' => route('webhooks.payment', $ticket->ulid),
    'metadata'   => ['ticket_ulid' => $ticket->ulid],
]);

$ticket->update(['payment_reference' => $reference]);

// Le caissier peut déjà passer au client suivant
return back()->with('info', 'Attente confirmation Wave...');
```

**2. Le webhook arrive (endpoint public protégé par signature HMAC)**

```php
// WebhookController@paymentConfirmed
public function paymentConfirmed(Request $request, string $ulid): JsonResponse
{
    // Vérification signature HMAC
    abort_unless(
        hash_equals(
            hash_hmac('sha256', $request->getContent(), config('services.wave.secret')),
            $request->header('X-Wave-Signature', '')
        ),
        403
    );

    $ticket = Ticket::where('ulid', $ulid)
                    ->where('status', 'payment_pending')
                    ->firstOrFail();

    $ticket->transitionTo('paid', ['paid_by' => null]); // null = système

    // Déclenche stock + loyauté exactement comme PaymentController@store
    app(PaymentFinalizationService::class)->finalize($ticket, [
        'method' => $ticket->payment_provider,
        'amount_cents' => $ticket->total_cents,
        'reference' => $ticket->payment_reference,
    ]);

    TicketStatusUpdated::dispatch($ticket, 'payment_pending');

    return response()->json(['ok' => true]);
}
```

**3. Rollback automatique par Job schedulé**

```php
// app/Jobs/ExpirePaymentPendingTickets.php
// Lancé toutes les 5 minutes via Schedule
Ticket::where('status', 'payment_pending')
      ->where('payment_initiated_at', '<', now()->subMinutes(15))
      ->each(function (Ticket $ticket) {
          $ticket->transitionTo('completed'); // retour à la case départ
          ActivityLog::log('payment.timeout', $ticket, [
              'provider'  => $ticket->payment_provider,
              'reference' => $ticket->payment_reference,
          ]);
      });
```

```php
// app/Console/Kernel.php (ou bootstrap/app.php en Laravel 12)
Schedule::job(ExpirePaymentPendingTickets::class)->everyFiveMinutes();
```

---

### 1.2 Statuts `paused` et `blocked` — Stopper le Chrono

#### Le problème actuel

Un ticket `in_progress` depuis 18h00 parce que le client a perdu ses clés compte comme "en retard" depuis des heures. Le `due_at` est dépassé, le badge rouge pollue le dashboard, et les calculs de performance laveur sont faussés.

#### Deux statuts distincts, deux sémantiques

| Statut | Initiateur | Signification | Temps compté ? |
|---|---|---|---|
| `paused` | Laveur/Caissier | Pause volontaire (repas, attente pièce) | ❌ Suspendu |
| `blocked` | Caissier/Admin | Blocage externe (accident, litige, attente police) | ❌ Suspendu |

#### Mise à jour `TRANSITIONS`

```php
'in_progress' => ['completed', 'paused', 'blocked', 'cancelled'],
'paused'      => ['in_progress', 'cancelled'],
'blocked'     => ['in_progress', 'cancelled'],
```

#### Migration SQL

```sql
ALTER TABLE tickets
    ADD COLUMN paused_at      TIMESTAMP NULL,
    ADD COLUMN total_paused_seconds INT UNSIGNED DEFAULT 0,
    ADD COLUMN pause_reason   VARCHAR(255) NULL;
```

#### Calcul du "temps réel de travail" en respectant les pauses

```php
// Dans Ticket::transitionTo()
match ($newStatus) {
    'paused', 'blocked' => $updates['paused_at'] = now(),

    'in_progress' => (function() use (&$updates) {
        // Reprise : capitaliser la durée de pause
        if ($this->paused_at) {
            $pausedSeconds = now()->diffInSeconds($this->paused_at);
            $updates['total_paused_seconds'] = $this->total_paused_seconds + $pausedSeconds;
            $updates['paused_at'] = null;
            // Décaler le due_at du même delta
            if ($this->due_at) {
                $updates['due_at'] = $this->due_at->addSeconds($pausedSeconds);
            }
        }
        $updates['started_at'] ??= now();
    })(),

    'completed' => $updates['completed_at'] = now(),
    // ...
};
```

**Durée de travail réelle calculée en helper :**

```php
public function effectiveWorkDurationSeconds(): int
{
    if (!$this->started_at) return 0;
    $end = $this->completed_at ?? now();
    $raw = $this->started_at->diffInSeconds($end);
    return max(0, $raw - $this->total_paused_seconds);
}
```

---

### 1.3 Annulation Tardive d'un Ticket `in_progress` — Stocks et Logs

#### Le problème actuel

`consumeStock()` est appelé au moment du paiement (`PaymentController@store`). Si le ticket est annulé après démarrage du lavage, les produits chimiques utilisés ont déjà été physiquement consommés, mais aucun mouvement de stock n'est enregistré. La réalité terrain et l'inventaire divergent.

#### La règle métier

> **Règle :** Toute annulation d'un ticket `in_progress` ou `completed` doit déclencher une consommation partielle de stock estimée + une entrée de log d'annulation spécifique.

#### Implémentation via `TicketObserver`

```php
// app/Observers/TicketObserver.php
public function updated(Ticket $ticket): void
{
    if (
        $ticket->wasChanged('status') &&
        $ticket->status === Ticket::STATUS_CANCELLED &&
        in_array($ticket->getOriginal('status'), ['in_progress', 'completed'])
    ) {
        $this->handleLateCancel($ticket);
    }
}

private function handleLateCancel(Ticket $ticket): void
{
    $previousStatus = $ticket->getOriginal('status');
    $consumptionRatio = $previousStatus === 'in_progress'
        ? $this->estimateProgress($ticket)   // 0.0 → 1.0
        : 1.0;                               // completed = 100% consommé

    $ticket->load('services.service.stockProducts');

    foreach ($ticket->services as $ticketService) {
        foreach ($ticketService->service->stockProducts as $product) {
            $fullQty   = $product->pivot->quantity_per_use * $ticketService->quantity;
            $actualQty = round($fullQty * $consumptionRatio, 3);

            if ($actualQty > 0) {
                $product->consumeStock(
                    $actualQty,
                    "Annulation {$ticket->ticket_number} (ratio {$consumptionRatio})",
                    $ticket->id,
                    auth()->id()
                );
            }
        }
    }

    ActivityLog::log('ticket.cancelled_late', $ticket, [
        'previous_status'   => $previousStatus,
        'consumption_ratio' => $consumptionRatio,
        'reason'            => $ticket->cancelled_reason,
    ]);
}

/** Estime le ratio de consommation en fonction du temps écoulé vs estimé. */
private function estimateProgress(Ticket $ticket): float
{
    if (!$ticket->started_at || !$ticket->estimated_duration) return 0.5;

    $elapsedMinutes = $ticket->started_at->diffInMinutes(now());
    return min(1.0, $elapsedMinutes / $ticket->estimated_duration);
}
```

**Enregistrement de l'observer :**

```php
// app/Providers/AppServiceProvider.php
Ticket::observe(TicketObserver::class);
```

---

## Partie 2 — Moteur de Planification & Calcul Dynamique du Temps

### 2.1 Algorithme `due_at` — Calcul Intelligent de l'Heure de Fin

#### Problème actuel

Le `due_at` actuel est calculé une seule fois à la création du ticket avec une somme naïve :

```php
// TicketController@store (actuel — simplifié)
now()->addMinutes($queueMinutes + $estimated_duration)
```

Cette formule ignore les pauses, les tickets annulés en cours de route, et l'état réel `in_progress` (où le chrono est déjà en marche).

#### Algorithme v2 : `WasherScheduler::computeDueAt()`

```php
// app/Services/WasherScheduler.php

namespace App\Services;

use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;

class WasherScheduler
{
    /**
     * Calcule l'heure de fin estimée pour un nouveau ticket assigné à un laveur.
     *
     * Étapes :
     * 1. Récupérer tous les tickets actifs du laveur (pending + in_progress)
     * 2. Pour chaque ticket in_progress : calculer le temps restant réel (durée - elapsed - paused)
     * 3. Pour chaque ticket pending : prendre estimated_duration entier
     * 4. Sommer, ajouter la durée du nouveau ticket
     * 5. Appliquer les BusinessHours : si le résultat dépasse la fermeture → reporter au lendemain
     */
    public static function computeDueAt(int $washerId, int $newDurationMinutes): Carbon
    {
        $queueMinutes = static::queueMinutesForWasher($washerId);
        $rawEnd = now()->addMinutes($queueMinutes + $newDurationMinutes);
        return static::applyBusinessHours($rawEnd);
    }

    public static function queueMinutesForWasher(int $washerId): int
    {
        $active = Ticket::where('assigned_to', $washerId)
            ->whereIn('status', ['pending', 'in_progress', 'paused'])
            ->orderBy('created_at')
            ->get(['status', 'estimated_duration', 'started_at',
                   'paused_at', 'total_paused_seconds', 'due_at']);

        $minutes = 0;

        foreach ($active as $ticket) {
            if ($ticket->status === 'in_progress' && $ticket->started_at) {
                // Temps réellement écoulé, en tenant compte des secondes mises en pause
                $elapsedSeconds = $ticket->started_at->diffInSeconds(now())
                                - ($ticket->total_paused_seconds ?? 0);
                $remainingSeconds = max(
                    0,
                    ($ticket->estimated_duration * 60) - $elapsedSeconds
                );
                $minutes += (int) ceil($remainingSeconds / 60);

            } elseif ($ticket->status === 'paused' && $ticket->started_at) {
                // Paused : on compte le restant comme si arrêté maintenant
                $elapsedSeconds = $ticket->started_at->diffInSeconds($ticket->paused_at ?? now())
                                - ($ticket->total_paused_seconds ?? 0);
                $remainingSeconds = max(
                    0,
                    ($ticket->estimated_duration * 60) - $elapsedSeconds
                );
                $minutes += (int) ceil($remainingSeconds / 60);

            } else {
                // Pending : durée entière
                $minutes += (int) ($ticket->estimated_duration ?? 0);
            }
        }

        return $minutes;
    }

    /**
     * Si la fin calculée dépasse l'heure de fermeture :
     * → reporter au prochain jour ouvré à l'heure d'ouverture + overflow.
     */
    public static function applyBusinessHours(Carbon $rawEnd): Carbon
    {
        $closeHour  = (int) \App\Models\Setting::get('business_close_hour', 21);
        $closeMin   = (int) \App\Models\Setting::get('business_close_minute', 0);
        $openHour   = (int) \App\Models\Setting::get('business_open_hour', 8);
        $openMin    = (int) \App\Models\Setting::get('business_open_minute', 0);

        $closeToday = $rawEnd->copy()->setTime($closeHour, $closeMin, 0);
        $openTomorrow = $rawEnd->copy()->addDay()->setTime($openHour, $openMin, 0);

        if ($rawEnd->lte($closeToday)) {
            return $rawEnd; // dans les horaires → OK
        }

        // Overflow : combien de minutes débordent après fermeture ?
        $overflowMinutes = $closeToday->diffInMinutes($rawEnd);
        return $openTomorrow->addMinutes($overflowMinutes);
    }

    /**
     * Vérifie si l'assignation est possible aujourd'hui.
     * Retourne un objet de warning/blocage.
     */
    public static function feasibilityCheck(int $washerId, int $newDurationMinutes): array
    {
        $dueAt = static::computeDueAt($washerId, $newDurationMinutes);
        $closeHour = (int) \App\Models\Setting::get('business_close_hour', 21);
        $closeToday = now()->setTime($closeHour, 0, 0);

        return [
            'due_at'         => $dueAt->toIso8601String(),
            'overflow'       => $dueAt->isNextDay(),
            'queue_minutes'  => static::queueMinutesForWasher($washerId),
            'warning'        => $dueAt->isNextDay()
                ? "Ce véhicule sera prêt demain à {$dueAt->format('H:i')} (dépassement horaire)"
                : null,
        ];
    }
}
```

#### Settings en base (clés à seeder)

```php
// database/seeders/SettingsSeeder.php
$settings = [
    ['key' => 'business_open_hour',   'value' => '8',  'type' => 'integer', 'group' => 'horaires'],
    ['key' => 'business_open_minute', 'value' => '0',  'type' => 'integer', 'group' => 'horaires'],
    ['key' => 'business_close_hour',  'value' => '21', 'type' => 'integer', 'group' => 'horaires'],
    ['key' => 'business_close_minute','value' => '0',  'type' => 'integer', 'group' => 'horaires'],
    ['key' => 'business_days',        'value' => '[1,2,3,4,5,6]', 'type' => 'json', 'group' => 'horaires'],
    // 1=Lundi...6=Samedi, 0=Dimanche
];
```

#### Intégration dans `TicketController@store`

```php
// Remplacement du calcul naïf actuel
use App\Services\WasherScheduler;

$dueAt = $request->assigned_to && $request->estimated_duration
    ? WasherScheduler::computeDueAt($request->assigned_to, $request->estimated_duration)
    : null;

$ticket = Ticket::create([
    // ...
    'due_at' => $dueAt,
]);
```

#### Réponse JSON enrichie pour le `WasherDrawer`

```php
// TicketController@washerQueue — réponse enrichie
$washers = User::laveurs()->get()->map(fn ($w) => [
    ...$w->toArray(),
    ...WasherScheduler::feasibilityCheck($w->id, $request->integer('duration', 30)),
]);
// Le frontend affiche un badge 🔴 "Demain" si overflow=true
```

---

### 2.2 Calendrier & Cohabitation Walk-in / Rendez-vous

#### Modèle `Appointment`

```php
// Nouvelle migration : create_appointments_table
Schema::create('appointments', function (Blueprint $table) {
    $table->id();
    $table->string('ulid')->unique();
    $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
    $table->foreignId('created_by')->constrained('users');
    $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();

    $table->dateTime('scheduled_at');          // heure souhaitée par le client
    $table->dateTime('confirmed_at')->nullable();
    $table->integer('estimated_duration')->default(30); // minutes
    $table->string('vehicle_plate')->nullable();
    $table->string('vehicle_brand')->nullable();
    $table->text('notes')->nullable();

    $table->enum('status', [
        'pending',     // soumis par client, en attente confirmation
        'confirmed',   // confirmé par la station
        'arrived',     // client arrivé → ticket créé
        'no_show',     // client absent
        'cancelled',
    ])->default('pending');

    $table->string('source')->default('manual'); // 'manual' | 'online' | 'phone'
    $table->timestamps();
    $table->softDeletes();
});
```

#### Règles de cohabitation Walk-in / RDV

```
Priorité (par ordre) :
  1. Tickets IN_PROGRESS actifs (irréductibles)
  2. Rendez-vous CONFIRMED dans les 30 prochaines minutes (créneaux réservés)
  3. Walk-ins en PENDING (FIFO)

Algorithme d'affichage du calendrier (vue jour par laveur) :
  - Pour chaque laveur : construire une timeline de blocs
  - Bloc vert = ticket en cours
  - Bloc bleu = RDV confirmé (futur)
  - Bloc gris = créneau libre
  - Alerte rouge = conflit (RDV qui tombe sur un ticket déjà in_progress de durée dépassée)
```

#### Conversion Appointment → Ticket à l'arrivée

```php
// AppointmentController@convertToTicket
public function convertToTicket(Appointment $appointment): RedirectResponse
{
    abort_if($appointment->status !== 'confirmed', 422, 'RDV non confirmé');

    // Créer le ticket pré-rempli depuis les données du RDV
    $ticket = Ticket::create([
        'client_id'          => $appointment->client_id,
        'vehicle_plate'      => $appointment->vehicle_plate,
        'vehicle_brand'      => $appointment->vehicle_brand,
        'assigned_to'        => $appointment->assigned_to,
        'estimated_duration' => $appointment->estimated_duration,
        'created_by'         => auth()->id(),
        'status'             => 'pending',
        'shift_id'           => Shift::currentForUser(auth()->id())?->id,
        'notes'              => "[RDV] {$appointment->notes}",
    ]);

    $appointment->update([
        'status'    => 'arrived',
        'ticket_id' => $ticket->id,
    ]);

    return redirect()->route('caissier.tickets.show', $ticket->ulid)
        ->with('success', 'Rendez-vous converti en ticket.');
}
```

#### Vue Calendrier (React)

```jsx
// Composant simplifié — chaque laveur = une colonne
// Données : GET /admin/planning?date=2026-04-01
// Retourne : { washers: [{ id, name, blocks: [{ type, start, end, label, ticket_id }] }] }

const CalendarView = ({ date, washers }) => (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${washers.length}, 1fr)` }}>
        {washers.map(washer => (
            <WasherColumn key={washer.id} washer={washer} />
        ))}
    </div>
);
```

---

## Partie 3 — Module Commercial : Devis & Factures B2B

### 3.1 Modélisation des Tables

#### `quotes` — Devis

```sql
CREATE TABLE quotes (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ulid             VARCHAR(26) UNIQUE NOT NULL,
    quote_number     VARCHAR(30) UNIQUE NOT NULL,    -- DEV-20260401-001
    client_id        BIGINT UNSIGNED REFERENCES clients(id),
    created_by       BIGINT UNSIGNED REFERENCES users(id),
    status           ENUM('draft','sent','accepted','refused','expired') DEFAULT 'draft',

    -- Adresse facturation (snapshot au moment de l'émission)
    billing_name     VARCHAR(255),
    billing_address  TEXT,
    billing_ice      VARCHAR(50),           -- Numéro ICE Maroc (entreprises)
    billing_phone    VARCHAR(30),

    -- Totaux
    subtotal_cents   INT UNSIGNED DEFAULT 0,
    discount_cents   INT UNSIGNED DEFAULT 0,
    tax_rate         DECIMAL(5,2) DEFAULT 0.00,  -- 0 ou 20 (TVA Maroc)
    tax_cents        INT UNSIGNED DEFAULT 0,
    total_cents      INT UNSIGNED DEFAULT 0,

    notes            TEXT,
    valid_until      DATE,
    sent_at          TIMESTAMP NULL,
    accepted_at      TIMESTAMP NULL,
    pdf_path         VARCHAR(500),

    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    deleted_at       TIMESTAMP NULL
);
```

#### `invoices` — Factures

```sql
CREATE TABLE invoices (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ulid             VARCHAR(26) UNIQUE NOT NULL,
    invoice_number   VARCHAR(30) UNIQUE NOT NULL,   -- FAC-20260401-001

    quote_id         BIGINT UNSIGNED NULL REFERENCES quotes(id),   -- issue d'un devis ?
    client_id        BIGINT UNSIGNED REFERENCES clients(id),
    created_by       BIGINT UNSIGNED REFERENCES users(id),

    status           ENUM('draft','issued','paid','partial','cancelled') DEFAULT 'draft',
    payment_method   VARCHAR(50) NULL,

    -- Adresse (snapshot)
    billing_name     VARCHAR(255),
    billing_address  TEXT,
    billing_ice      VARCHAR(50),
    billing_phone    VARCHAR(30),

    -- Totaux
    subtotal_cents   INT UNSIGNED DEFAULT 0,
    discount_cents   INT UNSIGNED DEFAULT 0,
    tax_rate         DECIMAL(5,2) DEFAULT 0.00,
    tax_cents        INT UNSIGNED DEFAULT 0,
    total_cents      INT UNSIGNED DEFAULT 0,
    amount_paid_cents INT UNSIGNED DEFAULT 0,

    notes            TEXT,
    issued_at        DATE,
    due_date         DATE,
    paid_at          TIMESTAMP NULL,
    pdf_path         VARCHAR(500),

    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    deleted_at       TIMESTAMP NULL
);
```

#### `invoice_tickets` — Table pivot Invoice ↔ Tickets (facturation de flotte)

```sql
CREATE TABLE invoice_tickets (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id  BIGINT UNSIGNED REFERENCES invoices(id) ON DELETE CASCADE,
    ticket_id   BIGINT UNSIGNED REFERENCES tickets(id) ON DELETE RESTRICT,
    UNIQUE(invoice_id, ticket_id)
);
```

#### `invoice_lines` — Lignes de facturation hybrides

```sql
CREATE TABLE invoice_lines (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id         BIGINT UNSIGNED REFERENCES invoices(id) ON DELETE CASCADE,
    quote_id           BIGINT UNSIGNED NULL REFERENCES quotes(id) ON DELETE CASCADE,

    -- Source : catalogue OU saisie libre
    service_id         BIGINT UNSIGNED NULL REFERENCES services(id) ON DELETE SET NULL,
    description        VARCHAR(500) NOT NULL,   -- snapshot du nom service OU texte libre

    quantity           DECIMAL(10,3) DEFAULT 1,
    unit_price_cents   INT UNSIGNED DEFAULT 0,
    discount_cents     INT UNSIGNED DEFAULT 0,
    line_total_cents   INT UNSIGNED GENERATED ALWAYS AS
                           (GREATEST(0, unit_price_cents * quantity - discount_cents)) STORED,

    sort_order         SMALLINT UNSIGNED DEFAULT 0
);
```

> **Ligne catalogue :** `service_id` renseigné, `description` = snapshot du nom.
> **Ligne libre :** `service_id = NULL`, `description` = texte saisi manuellement, prix saisi à la main.

---

### 3.2 Modèle `Invoice` — Logique Métier Laravel

```php
// app/Models/Invoice.php
namespace App\Models;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

class Invoice extends Model
{
    use SoftDeletes;

    // ── Génération automatique du numéro ──
    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            $invoice->ulid           = (string) Str::ulid();
            $invoice->invoice_number = static::generateNumber();
        });
    }

    private static function generateNumber(): string
    {
        $year  = now()->format('Y');
        $month = now()->format('m');
        $count = static::whereYear('created_at', $year)
                        ->whereMonth('created_at', $month)
                        ->withTrashed()->count() + 1;
        return sprintf('FAC-%s%s-%04d', $year, $month, $count);
    }

    // ── Relations ──
    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function lines(): HasMany    { return $this->hasMany(InvoiceLine::class)->orderBy('sort_order'); }
    public function tickets(): BelongsToMany {
        return $this->belongsToMany(Ticket::class, 'invoice_tickets');
    }
    public function quote(): BelongsTo { return $this->belongsTo(Quote::class); }

    // ── Recalcul des totaux ──
    public function recalculate(): void
    {
        $subtotal = $this->lines()->sum('line_total_cents')
                  + $this->tickets()->with('services')->get()
                         ->sum(fn($t) => $t->total_cents);

        $subtotal   = $subtotal - $this->discount_cents;
        $taxCents   = (int) round($subtotal * $this->tax_rate / 100);
        $total      = $subtotal + $taxCents;

        $this->update([
            'subtotal_cents' => $subtotal,
            'tax_cents'      => $taxCents,
            'total_cents'    => $total,
        ]);
    }

    // ── Génération PDF via barryvdh/laravel-dompdf ──
    public function generatePdf(): string
    {
        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice'  => $this->load(['client', 'lines', 'tickets.services']),
            'settings' => [
                'center_name'    => Setting::get('center_name'),
                'center_address' => Setting::get('center_address'),
                'center_phone'   => Setting::get('center_phone'),
                'center_logo'    => Setting::get('center_logo'),
                'receipt_footer' => Setting::get('receipt_footer'),
            ],
        ])->setPaper('a4', 'portrait');

        $path = "invoices/{$this->ulid}.pdf";
        \Storage::put("public/{$path}", $pdf->output());

        $this->update(['pdf_path' => $path]);

        return $path;
    }

    // ── Marquer comme payée ──
    public function markPaid(string $method): void
    {
        $this->update([
            'status'           => 'paid',
            'payment_method'   => $method,
            'paid_at'          => now(),
            'amount_paid_cents'=> $this->total_cents,
        ]);
    }

    // ── Paiement partiel ──
    public function recordPartialPayment(int $amountCents, string $method): void
    {
        $newPaid = $this->amount_paid_cents + $amountCents;
        $this->update([
            'amount_paid_cents' => $newPaid,
            'payment_method'    => $method,
            'status'            => $newPaid >= $this->total_cents ? 'paid' : 'partial',
            'paid_at'           => $newPaid >= $this->total_cents ? now() : null,
        ]);
    }
}
```

---

### 3.3 Gestion de la TVA — Toggle "HT / TTC"

```php
// InvoiceController@updateTax
public function updateTax(Request $request, Invoice $invoice): RedirectResponse
{
    $request->validate(['include_tax' => 'required|boolean']);

    $invoice->update([
        'tax_rate' => $request->include_tax
            ? (float) Setting::get('default_tax_rate', 20.0)  // 20% TVA Maroc
            : 0.0,
    ]);

    $invoice->recalculate();

    return back()->with('success', $request->include_tax
        ? 'TVA 20% activée sur cette facture.'
        : 'Facture en exonération de TVA.');
}
```

**Setting à seeder :**
```php
['key' => 'default_tax_rate', 'value' => '20', 'type' => 'float', 'group' => 'fiscal'],
```

---

### 3.4 Vue Blade pour le PDF (`resources/views/pdf/invoice.blade.php`)

```blade
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        .total-row { font-weight: bold; font-size: 14px; }
        .tax-section { margin-top: 12px; text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            @if($settings['center_logo'])
                <img src="{{ public_path('storage/' . $settings['center_logo']) }}" height="60">
            @endif
            <h2>{{ $settings['center_name'] }}</h2>
            <p>{{ $settings['center_address'] }} — {{ $settings['center_phone'] }}</p>
        </div>
        <div style="text-align:right">
            <h1>FACTURE</h1>
            <p><strong>N° :</strong> {{ $invoice->invoice_number }}</p>
            <p><strong>Date :</strong> {{ $invoice->issued_at?->format('d/m/Y') }}</p>
            <p><strong>Échéance :</strong> {{ $invoice->due_date?->format('d/m/Y') ?? 'À réception' }}</p>
        </div>
    </div>

    {{-- Client --}}
    <div style="margin-bottom:20px">
        <strong>Facturé à :</strong><br>
        {{ $invoice->billing_name }}<br>
        @if($invoice->billing_ice) ICE : {{ $invoice->billing_ice }}<br> @endif
        {{ $invoice->billing_address }}<br>
        {{ $invoice->billing_phone }}
    </div>

    {{-- Lignes manuelles --}}
    @if($invoice->lines->count())
    <table>
        <thead><tr><th>Description</th><th>Qté</th><th>P.U. (MAD)</th><th>Total (MAD)</th></tr></thead>
        <tbody>
            @foreach($invoice->lines as $line)
            <tr>
                <td>{{ $line->description }}</td>
                <td>{{ $line->quantity }}</td>
                <td>{{ number_format($line->unit_price_cents / 100, 2) }}</td>
                <td>{{ number_format($line->line_total_cents / 100, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Tickets liés (flotte) --}}
    @foreach($invoice->tickets as $ticket)
    <p style="margin-top:12px; color:#64748b">
        🎫 Ticket {{ $ticket->ticket_number }} —
        {{ $ticket->vehicle_brand }} {{ $ticket->vehicle_plate }} —
        {{ number_format($ticket->total_cents / 100, 2) }} MAD
    </p>
    @endforeach

    {{-- Totaux --}}
    <div class="tax-section">
        <p>Sous-total HT : <strong>{{ number_format($invoice->subtotal_cents / 100, 2) }} MAD</strong></p>
        @if($invoice->tax_rate > 0)
        <p>TVA {{ $invoice->tax_rate }}% : <strong>{{ number_format($invoice->tax_cents / 100, 2) }} MAD</strong></p>
        @endif
        <p class="total-row">Total TTC : {{ number_format($invoice->total_cents / 100, 2) }} MAD</p>
    </div>

    @if($settings['receipt_footer'])
    <hr style="margin-top:40px">
    <p style="text-align:center; color:#94a3b8; font-size:10px">{{ $settings['receipt_footer'] }}</p>
    @endif
</body>
</html>
```

---

### 3.5 Workflow Devis → Facture → Paiement B2B

```
┌──────────────┐   accepté    ┌──────────────┐   tickets liés   ┌──────────────┐
│    DEVIS     │ ────────────► │   FACTURE    │ ◄────────────── │   TICKETS    │
│   (draft)    │              │   (draft)    │   (flotte fin     │  (paid/B2B)  │
│   (sent)     │              │   (issued)   │    de mois)       │              │
│  (accepted)  │              │   (partial)  │                   └──────────────┘
│  (refused)   │              │   (paid)     │
└──────────────┘              │  (cancelled) │
                              └──────────────┘
                                     │
                                     │ generatePdf()
                                     ▼
                              storage/invoices/{ulid}.pdf
                                     │
                                     │ GET /invoices/{ulid}/pdf
                                     ▼
                              Téléchargement / Email
```

---

## Partie 4 — Brainstorming CTO : 3 Edge Cases Ignorés

### 💡 Edge Case #1 — Multi-Laveur sur un Seul Ticket (Véhicule Complexe)

**Scénario terrain :** Une Cadillac Escalade (grand SUV) nécessite Ahmed pour l'extérieur et Karim pour l'intérieur simultanément. Avec le modèle actuel, un seul `assigned_to` est possible.

**Solution proposée :**

```sql
-- Table de jonction ticket_washers (remplace la contrainte 1-1)
CREATE TABLE ticket_washers (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id  BIGINT UNSIGNED REFERENCES tickets(id),
    user_id    BIGINT UNSIGNED REFERENCES users(id),
    role       ENUM('lead', 'assistant') DEFAULT 'lead',
    started_at TIMESTAMP NULL,
    ended_at   TIMESTAMP NULL,
    UNIQUE(ticket_id, user_id)
);
```

- Le `WasherScheduler::queueMinutesForWasher()` prend en compte cette table.
- La vue Laveur affiche les tickets où `user_id = auth()->id()` (via la jointure).
- Le `assigned_to` actuel reste le "lead" (compatibilité ascendante).
- **Impact calcul salarial :** `ticket_washers` permet de tracer la contribution individuelle de chaque laveur pour les stats de performance.

---

### 💡 Edge Case #2 — Tickets Récurrents (Flotte d'Entreprise Hebdomadaire)

**Scénario terrain :** La société XYZ envoie 5 voitures chaque lundi matin. Le caissier recrée manuellement les mêmes 5 tickets chaque semaine — perte de temps et risque d'erreur.

**Solution proposée : `TicketTemplate` + Schedule automatique**

```php
// Modèle TicketTemplate
// Champs : client_id, vehicle_plate, vehicle_brand, vehicle_type_id,
//          service_ids (JSON), estimated_duration, assigned_to_preference,
//          recurrence_rule (cron string : "0 8 * * 1" = lundi 8h)
//          is_active, next_run_at

// Job quotidien
class GenerateRecurringTickets implements ShouldQueue
{
    public function handle(): void
    {
        TicketTemplate::active()
            ->where('next_run_at', '<=', now())
            ->each(function (TicketTemplate $tpl) {
                // Créer le ticket (similaire à TicketController@store)
                $ticket = Ticket::createFromTemplate($tpl);

                // Calculer le prochain run
                $cron = new CronExpression($tpl->recurrence_rule);
                $tpl->update(['next_run_at' => $cron->getNextRunDate()]);

                // Notifier le caissier
                NotifyRecurringTicketCreated::dispatch($ticket);
            });
    }
}
```

Le caissier voit ces tickets pré-créés chaque matin dans son dashboard avec le badge 🔄 "Récurrent".

---

### 💡 Edge Case #3 — Portail Client Enrichi + QR Code Physique Permanent

**Scénario terrain :** Le client Samir vient chaque semaine. À chaque visite, le caissier scanne sa plaque ou cherche son nom — 30 secondes perdues × 200 clients/jour = 1h40 de friction quotidienne.

**Solution proposée : Carte fidélité QR Code physique (ou digital) pérenne**

```
QR Code sur carte plastifiée ──► /client/checkin/{client_ulid}
         │
         ▼
CheckinController@handle :
  1. Identifier le client (Client::where('ulid', $ulid))
  2. Si un shift est ouvert :
       → Pré-remplir le formulaire "Nouveau Ticket" avec les données client
       → Sélectionner automatiquement le véhicule principal (last vehicle_plate)
       → Afficher l'historique des 3 dernières visites + points fidélité
  3. Si aucun shift ouvert :
       → Page "Bienvenue, la station n'est pas encore ouverte"
```

```php
// ClientController@checkin
public function checkin(string $ulid): Response
{
    $client = Client::where('ulid', $ulid)->active()->firstOrFail();

    // Pré-chauffer les données du formulaire de création
    return redirect()->route('caissier.tickets.create', [
        'prefill_client' => $client->id,
        'prefill_plate'  => $client->vehicle_plate,
    ]);
}
```

**Côté React :** Le `ClientDrawer` détecte `?prefill_client=X` dans l'URL au montage et pré-sélectionne automatiquement le client — 0 saisie manuelle, passage immédiat aux services.

**Extension :** La carte physique peut aussi être un bracelet NFC (même URL, tag NFC). Le caissier approche son téléphone du bracelet → ticket pré-rempli en 1 seconde.

---

## Récapitulatif des Nouvelles Tables à Créer

| Table | Module | Priorité |
|---|---|---|
| `ticket_washers` | Multi-laveur | 🟡 Moyen terme |
| `appointments` | Planning/RDV | 🟠 Court terme |
| `quotes` + `quote_lines` | Commercial B2B | 🟠 Court terme |
| `invoices` + `invoice_lines` + `invoice_tickets` | Commercial B2B | 🟠 Court terme |
| `ticket_templates` | Récurrence | 🟢 Long terme |

## Récapitulatif des Nouveaux Statuts `Ticket`

```php
const TRANSITIONS = [
    'pending'         => ['in_progress', 'paused', 'cancelled'],
    'in_progress'     => ['completed', 'paused', 'blocked', 'cancelled'],
    'paused'          => ['in_progress', 'cancelled'],
    'blocked'         => ['in_progress', 'cancelled'],
    'completed'       => ['payment_pending', 'paid', 'cancelled'],
    'payment_pending' => ['paid', 'completed'],   // completed = rollback si timeout
    'paid'            => [],
    'cancelled'       => [],
];
```

## Nouvelles Colonnes à Ajouter sur `tickets`

```sql
ALTER TABLE tickets ADD COLUMN status           ENUM(..., 'paused', 'blocked', 'payment_pending');
ALTER TABLE tickets ADD COLUMN paused_at        TIMESTAMP NULL;
ALTER TABLE tickets ADD COLUMN total_paused_seconds INT UNSIGNED DEFAULT 0;
ALTER TABLE tickets ADD COLUMN pause_reason     VARCHAR(255) NULL;
ALTER TABLE tickets ADD COLUMN payment_initiated_at TIMESTAMP NULL;
ALTER TABLE tickets ADD COLUMN payment_reference    VARCHAR(255) NULL;
ALTER TABLE tickets ADD COLUMN payment_provider     VARCHAR(50) NULL;
```

---

*Document technique — Architecture v2 UltraClean — 01/04/2026*
*Complémentaire à : `docs/workflow_parcours_client.md`*
