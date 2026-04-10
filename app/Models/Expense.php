<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = [
        'shift_id',
        'user_id',
        'amount_cents',
        'category',
        'label',
        'paid_with',
        'date',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'date'         => 'date',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    /** Dépenses d'un shift donné. */
    public function scopeForShift($query, int $shiftId)
    {
        return $query->where('shift_id', $shiftId);
    }

    /** Dépenses d'une date donnée. */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Catégories prédéfinies. */
    public static function categories(): array
    {
        return [
            'carburant'    => 'Carburant',
            'fournitures'  => 'Fournitures',
            'entretien'    => 'Entretien',
            'salaires'     => 'Salaires / avances',
            'loyer'        => 'Loyer / charges',
            'taxes'        => 'Taxes & impôts',
            'repas'        => 'Repas / restauration',
            'transport'    => 'Transport',
            'autre'        => 'Autre',
        ];
    }

    /** Modes de paiement. */
    public static function paymentMethods(): array
    {
        return [
            'cash'   => 'Espèces',
            'card'   => 'Carte',
            'mobile' => 'Mobile',
            'wire'   => 'Virement',
        ];
    }
}
