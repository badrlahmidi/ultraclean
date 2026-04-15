<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SaleOrderLine — Ligne de produit d'une vente express.
 *
 * @property int                        $id
 * @property int                        $sale_order_id
 * @property int|null                   $sellable_product_id
 * @property string                     $product_name
 * @property string|null                $product_sku
 * @property int                        $unit_price_cents
 * @property float                      $quantity
 * @property int                        $discount_cents
 * @property int                        $line_total_cents
 * @property bool                       $is_free
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 *
 * @property-read \App\Models\SaleOrder           $saleOrder
 * @property-read \App\Models\SellableProduct|null $sellableProduct
 */
class SaleOrderLine extends Model
{
    protected $fillable = [
        'sale_order_id',
        'sellable_product_id',
        'product_name',
        'product_sku',
        'unit_price_cents',
        'quantity',
        'discount_cents',
        'line_total_cents',
        'is_free',
    ];

    protected $casts = [
        'unit_price_cents' => 'integer',
        'quantity'         => 'float',
        'discount_cents'   => 'integer',
        'line_total_cents' => 'integer',
        'is_free'          => 'boolean',
    ];

    // ── Boot ──────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::saving(function (SaleOrderLine $line) {
            if ($line->is_free) {
                $line->line_total_cents = 0;
            } else {
                $gross = (int) round($line->unit_price_cents * $line->quantity);
                $line->line_total_cents = max(0, $gross - $line->discount_cents);
            }
        });
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function saleOrder(): BelongsTo
    {
        return $this->belongsTo(SaleOrder::class);
    }

    public function sellableProduct(): BelongsTo
    {
        return $this->belongsTo(SellableProduct::class);
    }
}
