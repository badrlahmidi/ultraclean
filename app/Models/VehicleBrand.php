<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class VehicleBrand extends Model
{    protected $fillable = [
        'name', 'slug', 'logo_path', 'country', 'sort_order', 'is_active',
    ];

    protected $appends = ['logo_url'];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    // ---------- Boot ----------

    protected static function booted(): void
    {
        static::creating(function (VehicleBrand $brand) {
            if (empty($brand->slug)) {
                $brand->slug = Str::slug($brand->name);
            }
        });
    }

    // ---------- Accessors ----------

    /**
     * URL publique du logo depuis le Storage.
     * Retourne null si aucun logo n'est défini.
     */
    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path
            ? asset('storage/' . $this->logo_path)
            : null;
    }

    // ---------- Relations ----------

    public function models(): HasMany
    {
        return $this->hasMany(VehicleModel::class, 'brand_id')
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('name');
    }

    public function allModels(): HasMany
    {
        return $this->hasMany(VehicleModel::class, 'brand_id');
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'vehicle_brand_id');
    }

    // ---------- Scopes ----------

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order')->orderBy('name');
    }
}
