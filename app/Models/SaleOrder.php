<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * SaleOrder — Vente express (Point de Vente).
 *
 * Entité distincte des Tickets : pas de véhicule, pas de laveur, pas de
 * file d'attente. Flux simplifié : création → paiement immédiat.
 *
 * @property int                             $id
 * @property string                          $ulid
 * @property string                          $sale_number
 * @property int|null                        $client_id
 * @property int|null                        $shift_id
 * @property int|null                        $created_by
 * @property int                             $subtotal_cents
 * @property string|null                     $discount_type
 * @property float|null                      $discount_value
 * @property int                             $discount_cents
 * @property int                             $total_cents
 * @property string|null                     $payment_method
 * @property string|null                     $payment_reference
 * @property string                          $status
 * @property string|null                     $notes
 * @property string|null                     $cancelled_reason
 * @property \Illuminate\Support\Carbon|null $paid_at
 * @property \Illuminate\Support\Carbon|null $cancelled_at
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read \App\Models\Client|null                                                    $client
 * @property-read \App\Models\Shift|null                                                     $shift
 * @property-read \App\Models\User|null                                                      $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\SaleOrderLine>  $lines
 */
class SaleOrder extends Model
{
    use HasFactory, SoftDeletes;

    // ── Statuts ──────────────────────────────────────────────────────────
    const STATUS_PAID      = 'paid';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'ulid', 'sale_number',
        'client_id', 'shift_id', 'created_by',
        'subtotal_cents', 'discount_type', 'discount_value', 'discount_cents', 'total_cents',
        'payment_method', 'payment_reference',
        'status', 'notes', 'cancelled_reason',
        'paid_at', 'cancelled_at',
    ];

    protected $casts = [
        'subtotal_cents'  => 'integer',
        'discount_value'  => 'float',
        'discount_cents'  => 'integer',
        'total_cents'     => 'integer',
        'paid_at'         => 'datetime',
        'cancelled_at'    => 'datetime',
    ];

    // ── Route model binding ───────────────────────────────────────────────

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    // ── Boot ──────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (SaleOrder $sale) {
            if (empty($sale->ulid)) {
                $sale->ulid = (string) Str::ulid();
            }
            if (empty($sale->sale_number)) {
                $sale->sale_number = static::generateSaleNumber();
            }
        });
    }

    /**
     * Generate an atomic, collision-safe sale number: VTE-YYYYMMDD-XXXX.
     *
     * Uses the same pattern as Ticket::generateTicketNumber() but against
     * the `sale_daily_counters` table.
     */
    protected static function generateSaleNumber(): string
    {
        $date  = now()->format('Ymd');
        $today = now()->toDateString();
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::table('sale_daily_counters')
                ->insertOrIgnore(['date' => $today, 'next_value' => 1]);

            $sequence = DB::table('sale_daily_counters')
                ->where('date', $today)
                ->value('next_value');

            DB::table('sale_daily_counters')
                ->where('date', $today)
                ->increment('next_value');
        } else {
            DB::statement(
                'INSERT INTO sale_daily_counters (`date`, next_value) VALUES (?, 2)
                 ON DUPLICATE KEY UPDATE next_value = next_value + 1',
                [$today]
            );

            $sequence = DB::table('sale_daily_counters')
                ->where('date', $today)
                ->lockForUpdate()
                ->value('next_value') - 1;
        }

        return sprintf('VTE-%s-%04d', $date, max(1, (int) $sequence));
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SaleOrderLine::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Recalculate subtotal/discount/total from lines.
     */
    public function recalculateTotals(): void
    {
        $subtotal = (int) $this->lines()->sum(
            \Illuminate\Support\Facades\DB::raw('CASE WHEN is_free = 0 THEN unit_price_cents * quantity ELSE 0 END')
        );

        $discountCents = 0;
        if ($this->discount_type === 'percent' && $this->discount_value > 0) {
            $discountCents = (int) round($subtotal * $this->discount_value / 100);
        } elseif ($this->discount_type === 'fixed' && $this->discount_value > 0) {
            $discountCents = (int) ($this->discount_value * 100);
        }

        $this->updateQuietly([
            'subtotal_cents' => $subtotal,
            'discount_cents' => $discountCents,
            'total_cents'    => max(0, $subtotal - $discountCents),
        ]);
    }
}
