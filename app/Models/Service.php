<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'description', 'color', 'category',
        'duration_minutes', 'sort_order', 'is_active',
        'price_type', 'base_price_cents',
    ];

    // Prix unique = un seul enregistrement ServiceVehiclePrice ou base_price_cents renseigné
    // Prix variable = plusieurs ServiceVehiclePrice selon le type véhicule
    public function hasSinglePrice(): bool
    {
        return $this->price_type === 'fixed' || $this->base_price_cents > 0;
    }

    protected $casts = [
        'is_active'        => 'boolean',
        'duration_minutes' => 'integer',
        'sort_order'       => 'integer',
        'base_price_cents' => 'integer',
    ];

    // ---------- Relations ----------

    public function vehicleTypes(): BelongsToMany
    {
        return $this->belongsToMany(VehicleType::class, 'service_vehicle_prices')
                    ->withPivot('price_cents')
                    ->withTimestamps();
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ServiceVehiclePrice::class);
    }    public function ticketServices(): HasMany
    {
        return $this->hasMany(TicketService::class);
    }

    public function stockProducts(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(StockProduct::class, 'service_stock_products')
                    ->withPivot('quantity_per_use')
                    ->withTimestamps();
    }

    // ---------- Helpers ----------

    /** Retourne le prix en centimes pour un type de véhicule donné. */    public function priceFor(int $vehicleTypeId): ?int
    {
        /** @var ServiceVehiclePrice|null $price */
        $price = $this->prices()->where('vehicle_type_id', $vehicleTypeId)->first();
        return $price?->price_cents;
    }

    // ---------- Scopes ----------

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
