<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property int                             $id
 * @property string                          $ulid
 * @property string                          $ticket_number
 * @property string                          $status
 * @property int|null                        $vehicle_type_id
 * @property string|null                     $vehicle_plate
 * @property string|null                     $vehicle_brand
 * @property int|null                        $vehicle_brand_id
 * @property int|null                        $vehicle_model_id
 * @property int|null                        $client_id
 * @property int|null                        $created_by
 * @property int|null                        $assigned_to
 * @property int|null                        $paid_by
 * @property int|null                        $shift_id
 * @property int|null                        $ticket_template_id
 * @property int                             $subtotal_cents
 * @property int                             $discount_cents
 * @property int                             $total_cents
 * @property int                             $balance_due_cents
 * @property int                             $loyalty_points_earned
 * @property int                             $loyalty_points_used
 * @property string|null                     $notes
 * @property string|null                     $cancelled_reason
 * @property int|null                        $estimated_duration
 * @property bool                            $is_prepaid
 * @property string|null                     $payment_mode
 * @property string|null                     $payment_reference
 * @property string|null                     $payment_provider
 * @property string|null                     $pause_reason
 * @property int                             $total_paused_seconds
 * @property \Illuminate\Support\Carbon|null $started_at
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property \Illuminate\Support\Carbon|null $due_at
 * @property \Illuminate\Support\Carbon|null $paused_at
 * @property \Illuminate\Support\Carbon|null $payment_initiated_at
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read \App\Models\Client|null          $client
 * @property-read \App\Models\User|null            $creator
 * @property-read \App\Models\User|null            $washer
 * @property-read \App\Models\Shift|null           $shift
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\TicketLine> $lines
 * @property-read \App\Models\Payment|null         $payment
 */
class Ticket extends Model
{
    use HasFactory, SoftDeletes;    // ── Constantes de statut ─────────────────────────────────────────────
    const STATUS_PENDING         = 'pending';
    const STATUS_IN_PROGRESS     = 'in_progress';
    const STATUS_PAUSED          = 'paused';
    const STATUS_BLOCKED         = 'blocked';
    const STATUS_COMPLETED       = 'completed';
    const STATUS_PAYMENT_PENDING = 'payment_pending';
    const STATUS_PAID            = 'paid';
    const STATUS_PARTIAL         = 'partial';   // Avance partielle OU crédit différé
    const STATUS_CANCELLED       = 'cancelled';

    /** Transitions de statut autorisées — State Machine v2. */
    const TRANSITIONS = [
        // STATUS_PAID  ajouté à pending/in_progress pour le pré-encaissement (is_prepaid, avance totale)
        // STATUS_PARTIAL ajouté à pending/in_progress/completed pour avance partielle + crédit différé
        self::STATUS_PENDING         => [self::STATUS_IN_PROGRESS, self::STATUS_PAUSED, self::STATUS_CANCELLED, self::STATUS_PAID, self::STATUS_PARTIAL],
        self::STATUS_IN_PROGRESS     => [self::STATUS_COMPLETED, self::STATUS_PAUSED, self::STATUS_BLOCKED, self::STATUS_CANCELLED, self::STATUS_PAID, self::STATUS_PARTIAL],
        self::STATUS_PAUSED          => [self::STATUS_IN_PROGRESS, self::STATUS_CANCELLED],
        self::STATUS_BLOCKED         => [self::STATUS_IN_PROGRESS, self::STATUS_CANCELLED],
        self::STATUS_COMPLETED       => [self::STATUS_PAYMENT_PENDING, self::STATUS_PAID, self::STATUS_PARTIAL, self::STATUS_CANCELLED],
        self::STATUS_PAYMENT_PENDING => [self::STATUS_PAID, self::STATUS_PARTIAL, self::STATUS_COMPLETED],  // completed = rollback timeout
        self::STATUS_PARTIAL         => [self::STATUS_PAID, self::STATUS_CANCELLED],                        // balance collected → paid
        self::STATUS_PAID            => [],
        self::STATUS_CANCELLED       => [],
    ];

    protected $fillable = [
        'ulid', 'ticket_number', 'status',
        'vehicle_type_id', 'vehicle_plate', 'vehicle_brand',
        'vehicle_brand_id', 'vehicle_model_id',
        'client_id', 'created_by', 'assigned_to', 'paid_by', 'shift_id',        'ticket_template_id',
        'subtotal_cents', 'discount_cents', 'total_cents', 'balance_due_cents',
        'loyalty_points_earned', 'loyalty_points_used',        'notes', 'cancelled_reason',
        'estimated_duration', 'due_at', 'payment_mode', 'is_prepaid',
        'started_at', 'completed_at', 'paid_at',
        // v2 — pause / blocage
        'paused_at', 'total_paused_seconds', 'pause_reason',
        // v2 — paiement asynchrone
        'payment_initiated_at', 'payment_reference',        'payment_provider',
    ];    protected $casts = [
        'subtotal_cents'         => 'integer',
        'discount_cents'         => 'integer',
        'total_cents'            => 'integer',
        'balance_due_cents'      => 'integer',
        'loyalty_points_earned'  => 'integer',
        'loyalty_points_used'    => 'integer',
        'estimated_duration'     => 'integer',
        'total_paused_seconds'   => 'integer',
        'started_at'             => 'datetime',
        'completed_at'           => 'datetime',
        'paid_at'                => 'datetime',
        'due_at'                 => 'datetime',
        'paused_at'              => 'datetime',        'payment_initiated_at'   => 'datetime',
        'is_prepaid'             => 'boolean',
    ];// ---------- Route model binding ----------

    /**
     * Bind route model by ULID (URLs use ULID, not integer id).
     * Allows: route('caissier.tickets.show', $ticket->ulid)
     */
    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    // ---------- Boot ----------

    protected static function booted(): void
    {
        static::creating(function (Ticket $ticket) {
            if (empty($ticket->ulid)) {
                $ticket->ulid = (string) Str::ulid();
            }
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = static::generateTicketNumber();
            }
        });
    }

    protected static function generateTicketNumber(): string
    {
        $date  = now()->format('Ymd');
        $count = static::whereDate('created_at', today())->withTrashed()->count() + 1;
        return sprintf('TK-%s-%04d', $date, $count);
    }    // ---------- Relations ----------

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    public function vehicleBrand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class, 'vehicle_brand_id');
    }

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'vehicle_model_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(TicketService::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    /**
     * Laveurs assignés à ce ticket (multi-laveur Sprint 5).
     * assigned_to reste le lead ; cette relation enrichit avec les assistants.
     */
    public function washers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'ticket_washers')
                    ->withPivot(['role', 'started_at', 'ended_at'])
                    ->withTimestamps()
                    ->using(TicketWasher::class);
    }

    /** Laveur lead (= assigned_to via table pivot). */
    public function leadWasher(): BelongsToMany
    {
        return $this->washers()->wherePivot('role', TicketWasher::ROLE_LEAD);
    }

    /** Laveurs assistants. */
    public function assistantWashers(): BelongsToMany
    {
        return $this->washers()->wherePivot('role', TicketWasher::ROLE_ASSISTANT);
    }

    /** Template récurrent ayant généré ce ticket (nullable). */
    public function ticketTemplate(): BelongsTo
    {
        return $this->belongsTo(TicketTemplate::class, 'ticket_template_id');
    }

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::TRANSITIONS[$this->status] ?? []);
    }

    public function transitionTo(string $newStatus, array $data = []): void
    {
        if (! $this->canTransitionTo($newStatus)) {
            throw new \LogicException(
                "Transition '{$this->status}' → '{$newStatus}' non autorisée."
            );
        }

        $updates = array_merge(['status' => $newStatus], $data);

        match ($newStatus) {

            // ── Mise en pause / blocage ───────────────────────────────────────
            self::STATUS_PAUSED,
            self::STATUS_BLOCKED => (function () use (&$updates) {
                $updates['paused_at'] ??= now();
            })(),

            // ── Reprise (in_progress depuis paused/blocked OU première mise en route) ──
            self::STATUS_IN_PROGRESS => (function () use (&$updates) {
                if ($this->paused_at) {
                    // Capitaliser la durée de pause dans total_paused_seconds
                    $pausedSeconds = (int) now()->diffInSeconds($this->paused_at);
                    $updates['total_paused_seconds'] = ($this->total_paused_seconds ?? 0) + $pausedSeconds;
                    $updates['paused_at'] = null;
                    // Décaler le due_at du même delta pour ne pas polluer la timeline
                    if ($this->due_at) {
                        $updates['due_at'] = $this->due_at->copy()->addSeconds($pausedSeconds);
                    }
                }
                // Horodater le démarrage uniquement la première fois
                $updates['started_at'] ??= now();
            })(),

            // ── Fin de lavage ─────────────────────────────────────────────────
            self::STATUS_COMPLETED => (function () use (&$updates) {
                $updates['completed_at'] ??= now();
            })(),

            // ── Paiement asynchrone initié ────────────────────────────────────
            self::STATUS_PAYMENT_PENDING => (function () use (&$updates) {
                $updates['payment_initiated_at'] ??= now();
            })(),

            // ── Encaissement final ────────────────────────────────────────────
            self::STATUS_PAID => (function () use (&$updates) {
                $updates['paid_at'] ??= now();
            })(),

            default => null,
        };

        $this->update($updates);
    }

    // ---------- Helpers ----------

    public function recalculateTotals(): void
    {
        $subtotal = $this->services()->sum('line_total_cents');
        $this->update([
            'subtotal_cents' => $subtotal,
            'total_cents'    => max(0, $subtotal - $this->discount_cents),
        ]);
    }

    /**
     * Durée de travail réelle en secondes (exclut les temps de pause accumulés).
     * Utilisé pour les stats de performance laveur et le calcul du WasherScheduler.
     */
    public function effectiveWorkDurationSeconds(): int
    {
        if (! $this->started_at) {
            return 0;
        }
        $end = $this->completed_at ?? now();
        $raw = (int) $this->started_at->diffInSeconds($end);
        return max(0, $raw - ($this->total_paused_seconds ?? 0));
    }    // ── Helpers de statut ────────────────────────────────────────────────────

    public function isPaid(): bool           { return $this->status === self::STATUS_PAID; }
    public function isPending(): bool        { return $this->status === self::STATUS_PENDING; }
    public function isInProgress(): bool     { return $this->status === self::STATUS_IN_PROGRESS; }
    public function isPaused(): bool         { return $this->status === self::STATUS_PAUSED; }
    public function isBlocked(): bool        { return $this->status === self::STATUS_BLOCKED; }
    public function isCompleted(): bool      { return $this->status === self::STATUS_COMPLETED; }
    public function isPaymentPending(): bool { return $this->status === self::STATUS_PAYMENT_PENDING; }
    public function isPartial(): bool        { return $this->status === self::STATUS_PARTIAL; }
    public function isCancelled(): bool      { return $this->status === self::STATUS_CANCELLED; }

    /** Vrai si le chrono est suspendu (pause volontaire ou blocage). */
    public function isOnHold(): bool
    {
        return in_array($this->status, [self::STATUS_PAUSED, self::STATUS_BLOCKED]);
    }

    // ---------- Scopes ----------

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }    public function scopeActive($query)
    {
        return $query->whereNotIn('status', [
            self::STATUS_PAID,
            self::STATUS_CANCELLED,
        ]);
    }

    public function scopeForShift($query, int $shiftId)
    {
        return $query->where('shift_id', $shiftId);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }
}
