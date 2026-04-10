<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class VehicleModel extends Model
{
    use HasFactory;
    protected $fillable = [
        'brand_id', 'name', 'slug',
        'suggested_vehicle_type_id', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    // ---------- Boot ----------

    protected static function booted(): void
    {
        static::creating(function (VehicleModel $model) {
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    // ---------- Relations ----------

    public function brand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class, 'brand_id');
    }

    /**
     * Catégorie de taille suggérée (Citadine, SUV…).
     * Pré-remplit le sélecteur de prix dans l'interface de réception.
     */
    public function suggestedVehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class, 'suggested_vehicle_type_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'vehicle_model_id');
    }

    // ---------- Scopes ----------

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order')->orderBy('name');
    }

    public function scopeForBrand($query, int $brandId)
    {
        return $query->where('brand_id', $brandId);
    }
}
