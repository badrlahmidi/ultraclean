<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int                             $id
 * @property int                             $user_id
 * @property bool                            $is_open
 * @property int                             $opening_cash_cents
 * @property int|null                        $closing_cash_cents
 * @property int|null                        $expected_cash_cents
 * @property int|null                        $difference_cents
 * @property string|null                     $notes
 * @property \Illuminate\Support\Carbon      $opened_at
 * @property \Illuminate\Support\Carbon|null $closed_at
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 *
 * @property-read \App\Models\User                                                       $user
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Ticket>     $tickets
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Expense>    $expenses
 */
class Shift extends Model
{protected $fillable = [
        'user_id',
        'opened_at', 'closed_at',
        'opening_cash_cents', 'closing_cash_cents',
        'expected_cash_cents', 'difference_cents',
        'notes',
        'is_open',
    ];    protected $casts = [
        'opened_at'            => 'datetime',
        'closed_at'            => 'datetime',
        'opening_cash_cents'   => 'integer',
        'closing_cash_cents'   => 'integer',
        'expected_cash_cents'  => 'integer',
        'difference_cents'     => 'integer',
        'is_open'              => 'boolean',
    ];

    // ---------- Relations ----------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(\App\Models\Expense::class);
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
                    ->sum(fn($t) => $t->payment->amount_cash_cents ?? 0);
    }

    // ---------- Scopes ----------

    public function scopeOpen($query)
    {
        return $query->whereNull('closed_at');
    }
}
