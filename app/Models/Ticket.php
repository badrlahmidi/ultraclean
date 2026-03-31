<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Ticket extends Model
{
    use HasFactory, SoftDeletes;

    // Constantes de statut
    const STATUS_PENDING     = 'pending';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED   = 'completed';
    const STATUS_PAID        = 'paid';
    const STATUS_CANCELLED   = 'cancelled';

    /** Transitions de statut autorisées. */
    const TRANSITIONS = [
        self::STATUS_PENDING     => [self::STATUS_IN_PROGRESS, self::STATUS_CANCELLED],
        self::STATUS_IN_PROGRESS => [self::STATUS_COMPLETED, self::STATUS_CANCELLED],
        self::STATUS_COMPLETED   => [self::STATUS_PAID, self::STATUS_CANCELLED],
        self::STATUS_PAID        => [],
        self::STATUS_CANCELLED   => [],
    ];    protected $fillable = [
        'ulid', 'ticket_number', 'status',
        'vehicle_type_id', 'vehicle_plate', 'vehicle_brand',
        'vehicle_brand_id', 'vehicle_model_id',        'client_id', 'created_by', 'assigned_to', 'paid_by', 'shift_id',
        'subtotal_cents', 'discount_cents', 'total_cents',
        'loyalty_points_earned', 'loyalty_points_used',
        'notes', 'cancelled_reason',
        'estimated_duration', 'due_at',
        'started_at', 'completed_at', 'paid_at',
    ];    protected $casts = [
        'subtotal_cents'         => 'integer',
        'discount_cents'         => 'integer',
        'total_cents'            => 'integer',
        'loyalty_points_earned'  => 'integer',
        'loyalty_points_used'    => 'integer',
        'estimated_duration'     => 'integer',
        'started_at'             => 'datetime',
        'completed_at'           => 'datetime',
        'paid_at'                => 'datetime',
        'due_at'                 => 'datetime',
    ];

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

    // ---------- State Machine ----------

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
            self::STATUS_IN_PROGRESS => $updates['started_at']   = now(),
            self::STATUS_COMPLETED   => $updates['completed_at'] = now(),
            self::STATUS_PAID        => $updates['paid_at']      = now(),
            default                  => null,
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

    public function isPaid(): bool      { return $this->status === self::STATUS_PAID; }
    public function isPending(): bool   { return $this->status === self::STATUS_PENDING; }
    public function isCancelled(): bool { return $this->status === self::STATUS_CANCELLED; }

    // ---------- Scopes ----------

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', [self::STATUS_PAID, self::STATUS_CANCELLED]);
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
