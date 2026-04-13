<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * TicketProduct — A product line on a ticket.
 *
 * Similar to TicketService but for sellable products.
 *
 * @property int                        $id
 * @property int                        $ticket_id
 * @property int                        $sellable_product_id
 * @property string                     $product_name
 * @property int                        $unit_price_cents
 * @property float                      $quantity
 * @property int                        $discount_cents
 * @property int                        $line_total_cents
 * @property bool                       $is_free
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 */
class TicketProduct extends Model
{
    protected $fillable = [
        'ticket_id',
        'sellable_product_id',
        'product_name',
        'unit_price_cents',
        'quantity',
        'discount_cents',
        'line_total_cents',
        'is_free',
    ];

    protected $casts = [
        'unit_price_cents'  => 'integer',
        'quantity'          => 'float',
        'discount_cents'    => 'integer',
        'line_total_cents'  => 'integer',
        'is_free'           => 'boolean',
    ];

    /* ─── Boot ─── */

    protected static function booted(): void
    {
        // Recalculate line_total before save
        static::saving(function (TicketProduct $item) {
            if ($item->is_free) {
                $item->line_total_cents = 0;
            } else {
                $item->line_total_cents = max(
                    0,
                    (int) (($item->unit_price_cents * $item->quantity) - $item->discount_cents)
                );
            }
        });

        // Recalculate ticket totals after create/update/delete
        static::saved(function (TicketProduct $item): void {
            $item->ticket?->recalculateTotals();
        });

        static::deleted(function (TicketProduct $item): void {
            $item->ticket?->recalculateTotals();
        });
    }

    /* ─── Relations ─── */

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function sellableProduct(): BelongsTo
    {
        return $this->belongsTo(SellableProduct::class);
    }

    /* ─── Helpers ─── */

    /**
     * Get the price in MAD.
     */
    public function getLineTotalMadAttribute(): float
    {
        return $this->line_total_cents / 100;
    }
}
