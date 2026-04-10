<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    use HasFactory;

    const STATUS_LABELS = [
        'draft'     => 'Brouillon',
        'confirmed' => 'Confirmé',
        'received'  => 'Réceptionné',
        'cancelled' => 'Annulé',
    ];

    protected $fillable = [
        'supplier_id', 'reference', 'purchased_at',
        'status', 'total_cents', 'notes', 'created_by',
    ];

    protected $casts = [
        'purchased_at' => 'date',
        'total_cents'  => 'integer',
    ];

    /* ─── Relations ─── */

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /* ─── Helpers ─── */

    public function recalcTotal(): void
    {
        $this->total_cents = $this->items()->sum('total_cents');
        $this->saveQuietly();
    }
}
