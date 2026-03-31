<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Services\LoyaltyService;

class Client extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'phone', 'email', 'vehicle_plate',
        'notes', 'is_active',
        'is_company', 'ice',
        'loyalty_tier', 'loyalty_points',
        'total_visits', 'total_spent_cents', 'last_visit_date',
    ];

    protected $casts = [
        'is_active'         => 'boolean',
        'is_company'        => 'boolean',
        'loyalty_points'    => 'integer',
        'total_visits'      => 'integer',
        'total_spent_cents' => 'integer',
        'last_visit_date'   => 'date',
    ];

    // ---------- Relations ----------

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class)->latest();
    }

    // ---------- Loyalty Helpers ----------

    public function tierLabel(): string
    {
        return LoyaltyService::TIERS[$this->loyalty_tier]['label'] ?? 'Standard';
    }

    public function visitsToNextTier(): ?int
    {
        return LoyaltyService::visitsToNextTier($this->total_visits);
    }

    public function pointsValueCents(): int
    {
        return LoyaltyService::pointsToDiscount($this->loyalty_points);
    }

    // ---------- Scopes ----------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('phone', 'like', "%{$term}%")
              ->orWhere('vehicle_plate', 'like', "%{$term}%");
        });
    }
}
