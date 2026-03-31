<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceVehiclePrice extends Model
{
    protected $table = 'service_vehicle_prices';

    protected $fillable = ['service_id', 'vehicle_type_id', 'price_cents'];

    protected $casts = [
        'price_cents' => 'integer',
    ];

    // ---------- Relations ----------

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    // ---------- Helpers ----------

    /** Retourne le prix formaté en MAD. */
    public function getPriceInMadAttribute(): float
    {
        return $this->price_cents / 100;
    }
}
