<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SellableProductMovement — Track stock movements for sellable products.
 *
 * @property int                             $id
 * @property int                             $sellable_product_id
 * @property int|null                        $ticket_id
 * @property int|null                        $user_id
 * @property string                          $type
 * @property float                           $quantity
 * @property string|null                     $note
 * @property string|null                     $reference
 * @property bool                            $is_free
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 */
class SellableProductMovement extends Model
{
    protected $fillable = [
        'sellable_product_id',
        'ticket_id',
        'user_id',
        'type',
        'quantity',
        'note',
        'reference',
        'is_free',
    ];

    protected $casts = [
        'quantity' => 'float',
        'is_free'  => 'boolean',
    ];

    /* ─── Relations ─── */

    public function sellableProduct(): BelongsTo
    {
        return $this->belongsTo(SellableProduct::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /* ─── Helpers ─── */

    public function isIncoming(): bool
    {
        return $this->type === 'in';
    }

    public function isOutgoing(): bool
    {
        return $this->type === 'out';
    }

    public function isAdjustment(): bool
    {
        return $this->type === 'adjustment';
    }

    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'in'         => 'Entrée',
            'out'        => 'Sortie',
            'adjustment' => 'Ajustement',
            default      => ucfirst($type),
        };
    }
}
