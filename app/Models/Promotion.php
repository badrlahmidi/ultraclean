<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    protected $fillable = [
        'code', 'label', 'type', 'value',
        'min_amount_cents', 'max_uses', 'used_count',
        'is_active', 'valid_from', 'valid_until',
    ];

    protected $casts = [
        'value'            => 'integer',
        'min_amount_cents' => 'integer',
        'max_uses'         => 'integer',
        'used_count'       => 'integer',
        'is_active'        => 'boolean',
        'valid_from'       => 'datetime',
        'valid_until'      => 'datetime',
    ];
    /* ─── Relations ─── */

    public function usages(): HasMany
    {
        return $this->hasMany(PromotionUsage::class);
    }

    /* ─── Scopes ─── */
    /* ─── Scopes ─── */

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('valid_from')->orWhere('valid_from', '<=', now()))
            ->where(fn ($q) => $q->whereNull('valid_until')->orWhere('valid_until', '>=', now()));
    }

    /* ─── Helpers ─── */

    /**
     * Compute the discount amount (in cents) for a given subtotal.
     */
    public function computeDiscount(int $subtotalCents): int
    {
        if ($subtotalCents < $this->min_amount_cents) {
            return 0;
        }

        if ($this->type === 'percent') {
            return (int) round($subtotalCents * $this->value / 100);
        }

        // fixed — value is already in centimes
        return min($this->value, $subtotalCents);
    }

    public function isExhausted(): bool
    {
        return $this->max_uses !== null && $this->used_count >= $this->max_uses;
    }

    public function isCurrentlyValid(): bool
    {
        if (!$this->is_active) return false;
        if ($this->isExhausted()) return false;
        $now = now();
        if ($this->valid_from && $now->lt($this->valid_from)) return false;
        if ($this->valid_until && $now->gt($this->valid_until)) return false;
        return true;
    }
}
