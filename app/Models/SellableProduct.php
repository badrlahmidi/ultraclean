<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * SellableProduct — Products that can be sold directly to customers.
 *
 * Distinct from StockProduct which tracks internal consumables for services.
 *
 * @property int                             $id
 * @property string                          $name
 * @property string|null                     $sku
 * @property string|null                     $barcode
 * @property string|null                     $description
 * @property int                             $purchase_price_cents
 * @property int                             $selling_price_cents
 * @property float                           $current_stock
 * @property float                           $alert_threshold
 * @property string                          $unit
 * @property bool                            $is_active
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
class SellableProduct extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'sku',
        'barcode',
        'description',
        'purchase_price_cents',
        'selling_price_cents',
        'current_stock',
        'alert_threshold',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'purchase_price_cents' => 'integer',
        'selling_price_cents'  => 'integer',
        'current_stock'        => 'float',
        'alert_threshold'      => 'float',
        'is_active'            => 'boolean',
    ];

    /* ─── Relations ─── */

    public function movements(): HasMany
    {
        return $this->hasMany(SellableProductMovement::class)->latest();
    }

    public function ticketProducts(): HasMany
    {
        return $this->hasMany(TicketProduct::class);
    }

    /* ─── Scopes ─── */

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('current_stock', '<=', 'alert_threshold')
                     ->where('is_active', true);
    }

    public function scopeByBarcode(Builder $query, string $barcode): Builder
    {
        return $query->where('barcode', $barcode);
    }

    /* ─── Helpers ─── */

    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->alert_threshold;
    }

    /**
     * Get selling price in MAD.
     */
    public function getSellingPriceMadAttribute(): float
    {
        return $this->selling_price_cents / 100;
    }

    /**
     * Get purchase price in MAD.
     */
    public function getPurchasePriceMadAttribute(): float
    {
        return $this->purchase_price_cents / 100;
    }

    /**
     * Calculate profit margin per unit.
     */
    public function getProfitCentsAttribute(): int
    {
        return $this->selling_price_cents - $this->purchase_price_cents;
    }

    /**
     * Add stock (purchase/receipt).
     */
    public function addStock(float $qty, ?string $note = null, ?string $reference = null, ?int $userId = null): SellableProductMovement
    {
        /** @var SellableProductMovement $movement */
        $movement = $this->movements()->create([
            'type'      => 'in',
            'quantity'  => $qty,
            'note'      => $note,
            'reference' => $reference,
            'user_id'   => $userId,
        ]);

        $this->increment('current_stock', $qty);

        return $movement;
    }

    /**
     * Consume stock (sale or workshop use).
     */
    public function consumeStock(float $qty, ?int $ticketId = null, bool $isFree = false, ?int $userId = null): SellableProductMovement
    {
        /** @var SellableProductMovement $movement */
        $movement = $this->movements()->create([
            'type'      => 'out',
            'quantity'  => $qty,
            'ticket_id' => $ticketId,
            'is_free'   => $isFree,
            'note'      => $isFree ? 'Usage atelier (gratuit)' : 'Vente',
            'user_id'   => $userId,
        ]);

        $this->decrement('current_stock', $qty);

        return $movement;
    }

    /**
     * Adjust stock to exact value (inventory correction).
     */
    public function adjustStock(float $newQty, ?string $note = null, ?int $userId = null): SellableProductMovement
    {
        $diff = $newQty - $this->current_stock;

        /** @var SellableProductMovement $movement */
        $movement = $this->movements()->create([
            'type'      => 'adjustment',
            'quantity'  => abs($diff),
            'note'      => $note ?? sprintf('Ajustement: %.2f → %.2f %s', $this->current_stock, $newQty, $this->unit),
            'user_id'   => $userId,
        ]);

        $this->update(['current_stock' => $newQty]);

        return $movement;
    }
}
