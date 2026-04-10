<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{    protected $fillable = [
        'ticket_id',
        'amount_cents',
        'method',
        'amount_cash_cents', 'amount_card_cents', 'amount_mobile_cents', 'amount_wire_cents',
        'change_given_cents',
        'reference',
        'processed_by',
    ];

    protected $casts = [
        'amount_cents'        => 'integer',
        'amount_cash_cents'   => 'integer',
        'amount_card_cents'   => 'integer',
        'amount_mobile_cents' => 'integer',
        'amount_wire_cents'   => 'integer',
        'change_given_cents'  => 'integer',
    ];

    // ---------- Relations ----------

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    // ---------- Helpers ----------    /** Valide la cohérence des montants mixtes. */
    public function validateAmounts(): bool
    {
        if ($this->method !== 'mixed') {
            return true;
        }
        $sum = $this->amount_cash_cents
             + $this->amount_card_cents
             + $this->amount_mobile_cents
             + $this->amount_wire_cents;   // BUG-FIX: wire was missing from mixed sum
        return $sum === $this->amount_cents;
    }

    /** Retourne le montant total en MAD (float). */
    public function getAmountInMadAttribute(): float
    {
        return $this->amount_cents / 100;
    }
}
