<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Explicit imports so IDE can resolve — avoid circular autoload issues
// (Ticket, ServiceVehiclePrice, TicketService are in same namespace)

class VehicleType extends Model
{
    protected $fillable = ['name', 'slug', 'icon', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    // ---------- Relations ----------

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function servicePrices(): HasMany
    {
        return $this->hasMany(ServiceVehiclePrice::class);
    }

    public function ticketServices(): HasMany
    {
        return $this->hasMany(TicketService::class, 'price_variant_id');
    }

    // ---------- Scopes ----------

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
