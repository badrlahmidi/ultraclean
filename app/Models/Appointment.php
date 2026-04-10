<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Appointment extends Model
{
    use HasFactory, SoftDeletes;

    // ── Statuts ─────────────────────────────────────────────────────────
    const STATUS_PENDING     = 'pending';
    const STATUS_CONFIRMED   = 'confirmed';
    const STATUS_ARRIVED     = 'arrived';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED   = 'completed';
    const STATUS_CANCELLED   = 'cancelled';
    const STATUS_NO_SHOW     = 'no_show';

    /** Transitions autorisées */
    const TRANSITIONS = [
        self::STATUS_PENDING     => [self::STATUS_CONFIRMED, self::STATUS_CANCELLED, self::STATUS_NO_SHOW],
        self::STATUS_CONFIRMED   => [self::STATUS_ARRIVED, self::STATUS_CANCELLED, self::STATUS_NO_SHOW],
        self::STATUS_ARRIVED     => [self::STATUS_IN_PROGRESS, self::STATUS_CANCELLED],
        self::STATUS_IN_PROGRESS => [self::STATUS_COMPLETED, self::STATUS_CANCELLED],
        self::STATUS_COMPLETED   => [],
        self::STATUS_CANCELLED   => [],
        self::STATUS_NO_SHOW     => [],
    ];

    /** Labels affichage */
    const STATUS_LABELS = [
        self::STATUS_PENDING     => 'En attente',
        self::STATUS_CONFIRMED   => 'Confirmé',
        self::STATUS_ARRIVED     => 'Arrivé',
        self::STATUS_IN_PROGRESS => 'En cours',
        self::STATUS_COMPLETED   => 'Terminé',
        self::STATUS_CANCELLED   => 'Annulé',
        self::STATUS_NO_SHOW     => 'Absent',
    ];

    /** Sources */
    const SOURCES = ['walk_in', 'phone', 'online', 'whatsapp', 'admin'];

    protected $fillable = [
        'ulid', 'client_id', 'assigned_to', 'created_by', 'ticket_id',
        'scheduled_at', 'confirmed_at', 'estimated_duration',
        'vehicle_plate', 'vehicle_brand', 'vehicle_brand_id', 'vehicle_model_id', 'vehicle_type_id',
        'notes', 'cancelled_reason',
        'status', 'source',
    ];

    protected $casts = [
        'scheduled_at'       => 'datetime',
        'confirmed_at'       => 'datetime',
        'estimated_duration' => 'integer',
    ];

    // ── Boot ──────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (Appointment $appt) {
            if (empty($appt->ulid)) {
                $appt->ulid = (string) Str::ulid();
            }
        });
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function vehicleBrand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class, 'vehicle_brand_id');
    }

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'vehicle_model_id');
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class, 'vehicle_type_id');
    }    // ── Scopes ───────────────────────────────────────────────────────────

    /**
     * Scope : RDV confirmés/arrivés/in_progress qui chevauchent un créneau donné pour un laveur.
     *
     * Un conflit = le créneau [scheduled_at, scheduled_at + duration] chevauche
     * le créneau d'un RDV existant confirmé/arrivé/in_progress du même laveur.
     */    public function scopeConflicting($query, int $washerId, \Carbon\Carbon $start, int $durationMinutes, ?int $excludeId = null)
    {
        $end = $start->copy()->addMinutes($durationMinutes);

        // Build driver-appropriate "end of existing appointment" expression
        $driver = $query->getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            $endExpr = "datetime(scheduled_at, '+' || estimated_duration || ' minutes')";
        } else {
            // MySQL / MariaDB / PostgreSQL-compatible
            $endExpr = "DATE_ADD(scheduled_at, INTERVAL estimated_duration MINUTE)";
        }

        return $query
            ->where('assigned_to', $washerId)
            ->whereIn('status', [
                self::STATUS_CONFIRMED,
                self::STATUS_ARRIVED,
                self::STATUS_IN_PROGRESS,
            ])
            ->where(function ($q) use ($start, $end, $endExpr) {
                // Overlap: existing.start < new.end AND existing.end > new.start
                $q->where('scheduled_at', '<', $end)
                  ->whereRaw(
                      "{$endExpr} > ?",
                      [$start->toDateTimeString()]
                  );
            })
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId));
    }

    /**
     * Vérifie s'il existe des conflits pour un laveur à un créneau donné.
     *
     * @return \Illuminate\Database\Eloquent\Collection  Les RDV en conflit (vide = pas de conflit)
     */
    public static function findConflicts(int $washerId, \Carbon\Carbon $start, int $durationMinutes, ?int $excludeId = null): \Illuminate\Database\Eloquent\Collection
    {
        return static::conflicting($washerId, $start, $durationMinutes, $excludeId)
            ->with('client:id,name')
            ->get(['id', 'ulid', 'client_id', 'scheduled_at', 'estimated_duration', 'status', 'vehicle_plate']);
    }

    // ── State Machine ─────────────────────────────────────────────────────

    /**
     * Transition vers un nouveau statut avec validation.
     *
     * @throws \RuntimeException si la transition est invalide
     */
    public function transitionTo(string $newStatus, array $extra = []): void
    {
        $allowed = self::TRANSITIONS[$this->status] ?? [];

        if (! in_array($newStatus, $allowed, true)) {
            throw new \RuntimeException(
                "Transition invalide : {$this->status} → {$newStatus}"
            );
        }

        $attrs = array_merge(['status' => $newStatus], $extra);

        if ($newStatus === self::STATUS_CONFIRMED) {
            $attrs['confirmed_at'] = now();
        }

        $this->update($attrs);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    public function isPending(): bool     { return $this->status === self::STATUS_PENDING; }
    public function isConfirmed(): bool   { return $this->status === self::STATUS_CONFIRMED; }
    public function isArrived(): bool     { return $this->status === self::STATUS_ARRIVED; }
    public function isInProgress(): bool  { return $this->status === self::STATUS_IN_PROGRESS; }
    public function isCompleted(): bool   { return $this->status === self::STATUS_COMPLETED; }
    public function isCancelled(): bool   { return $this->status === self::STATUS_CANCELLED; }
    public function isNoShow(): bool      { return $this->status === self::STATUS_NO_SHOW; }

    /** Le RDV peut encore être modifié */
    public function isEditable(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_CONFIRMED], true);
    }

    /** Le RDV peut être converti en ticket */
    public function isConvertible(): bool
    {
        return in_array($this->status, [
            self::STATUS_CONFIRMED,
            self::STATUS_ARRIVED,
        ], true) && $this->ticket_id === null;
    }

    /** Heure de fin estimée */
    public function scheduledEndAt(): \Carbon\Carbon
    {
        return $this->scheduled_at->copy()->addMinutes($this->estimated_duration);
    }

    /** Label couleur selon statut (Tailwind) */
    public function statusColorClass(): string
    {
        return match ($this->status) {
            self::STATUS_PENDING     => 'bg-yellow-100 text-yellow-800',
            self::STATUS_CONFIRMED   => 'bg-blue-100 text-blue-800',
            self::STATUS_ARRIVED     => 'bg-indigo-100 text-indigo-800',
            self::STATUS_IN_PROGRESS => 'bg-purple-100 text-purple-800',
            self::STATUS_COMPLETED   => 'bg-green-100 text-green-800',
            self::STATUS_CANCELLED   => 'bg-red-100 text-red-800',
            self::STATUS_NO_SHOW     => 'bg-gray-100 text-gray-600',
            default                  => 'bg-gray-100 text-gray-600',
        };
    }
}
