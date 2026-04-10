<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientVehicle extends Model
{
    protected $fillable = [
        'client_id', 'plate', 'brand', 'model', 'color', 'year',
        'vehicle_type_id', 'is_primary', 'notes',
    ];

    protected $casts = [
        'is_primary'      => 'boolean',
        'year'            => 'integer',
        'vehicle_type_id' => 'integer',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    /** Label court — ex: "Toyota Yaris (A-12345-B)" */
    public function label(): string
    {
        $parts = array_filter([$this->brand, $this->model]);
        $desc  = implode(' ', $parts) ?: 'Véhicule';
        return $this->plate ? "{$desc} ({$this->plate})" : $desc;
    }
}
