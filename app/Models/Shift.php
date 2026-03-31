<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = [
        'user_id',
        'opened_at', 'closed_at',
        'opening_cash_cents', 'closing_cash_cents',
        'expected_cash_cents', 'difference_cents',
        'notes',
    ];

    protected $casts = [
        'opened_at'            => 'datetime',
        'closed_at'            => 'datetime',
        'opening_cash_cents'   => 'integer',
        'closing_cash_cents'   => 'integer',
        'expected_cash_cents'  => 'integer',
        'difference_cents'     => 'integer',
    ];

    // ---------- Relations ----------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    // ---------- Helpers ----------

    public function isOpen(): bool
    {
        return $this->closed_at === null;
    }

    /** Retourne le total encaissé en espèces sur ce shift. */
    public function totalCashCollected(): int
    {
        return $this->tickets()
                    ->whereHas('payment', fn($q) => $q->where('method', '!=', 'card'))
                    ->with('payment')
                    ->get()
                    ->sum(fn($t) => $t->payment?->amount_cash_cents ?? 0);
    }

    // ---------- Scopes ----------

    public function scopeOpen($query)
    {
        return $query->whereNull('closed_at');
    }
}
