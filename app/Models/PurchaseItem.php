<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_id', 'stock_product_id', 'product_name',
        'quantity', 'unit', 'unit_price_cents', 'total_cents',
    ];

    protected $casts = [
        'quantity'        => 'float',
        'unit_price_cents'=> 'integer',
        'total_cents'     => 'integer',
    ];

    /* ─── Relations ─── */

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function stockProduct(): BelongsTo
    {
        return $this->belongsTo(StockProduct::class);
    }
}
