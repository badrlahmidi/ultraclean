<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockProduct extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'description', 'category', 'unit',
        'current_quantity', 'min_quantity', 'cost_price_cents',
        'supplier', 'sku', 'is_active',
    ];

    protected $casts = [
        'current_quantity' => 'float',
        'min_quantity'     => 'float',
        'cost_price_cents' => 'integer',
        'is_active'        => 'boolean',
    ];

    /* ─── Relations ─── */

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class)->latest();
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'service_stock_products')
                    ->withPivot('quantity_per_use')
                    ->withTimestamps();
    }

    /* ─── Scopes ─── */

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('current_quantity', '<=', 'min_quantity')
                     ->where('is_active', true);
    }

    /* ─── Helpers ─── */

    public function isLowStock(): bool
    {
        return $this->current_quantity <= $this->min_quantity;
    }

    /**
     * Add stock (movement type: in).
     */    public function addStock(float $qty, string $note = null, string $reference = null, int $userId = null): StockMovement
    {
        /** @var StockMovement $movement */
        $movement = $this->movements()->create([
            'type'      => 'in',
            'quantity'  => $qty,
            'note'      => $note,
            'reference' => $reference,
            'user_id'   => $userId,
        ]);

        $this->increment('current_quantity', $qty);

        return $movement;
    }

    /**
     * Consume stock (movement type: out). Allows negative stock with a warning.
     */    public function consumeStock(float $qty, string $reference = null, int $ticketId = null, int $userId = null): StockMovement
    {
        /** @var StockMovement $movement */
        $movement = $this->movements()->create([
            'type'      => 'out',
            'quantity'  => $qty,
            'note'      => 'Consommation automatique (ticket)',
            'reference' => $reference,
            'user_id'   => $userId,
            'ticket_id' => $ticketId,
        ]);

        $this->decrement('current_quantity', $qty);

        return $movement;
    }

    /**
     * Adjust stock to exact value (movement type: adjustment).
     */    public function adjustStock(float $newQty, string $note = null, int $userId = null): StockMovement
    {
        $diff = $newQty - $this->current_quantity;

        /** @var StockMovement $movement */
        $movement = $this->movements()->create([
            'type'      => 'adjustment',
            'quantity'  => abs($diff),
            'note'      => $note ?? sprintf(
                'Ajustement: %.3f → %.3f %s',
                $this->current_quantity, $newQty, $this->unit
            ),
            'user_id'   => $userId,
        ]);

        $this->update(['current_quantity' => $newQty]);

        return $movement;
    }

    /* ─── Labels ─── */

    public static function categoryLabel(string $cat): string
    {
        return match ($cat) {
            'produit_chimique' => 'Produit chimique',
            'consommable'      => 'Consommable',
            'outil'            => 'Outil / Matériel',
            'autre'            => 'Autre',
            default            => ucfirst($cat),
        };
    }
}
