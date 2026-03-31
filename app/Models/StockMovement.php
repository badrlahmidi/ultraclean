<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $fillable = [
        'stock_product_id', 'type', 'quantity',
        'note', 'reference', 'user_id', 'ticket_id',
    ];

    protected $casts = [
        'quantity' => 'float',
    ];

    /* ─── Relations ─── */

    public function product(): BelongsTo
    {
        return $this->belongsTo(StockProduct::class, 'stock_product_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /* ─── Helpers ─── */

    public function typeLabel(): string
    {
        return match ($this->type) {
            'in'         => 'Entrée',
            'out'        => 'Sortie',
            'adjustment' => 'Inventaire',
            default      => ucfirst($this->type),
        };
    }

    public function typeColor(): string
    {
        return match ($this->type) {
            'in'         => 'green',
            'out'        => 'red',
            'adjustment' => 'blue',
            default      => 'gray',
        };
    }
}
