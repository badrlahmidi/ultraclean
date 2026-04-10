<?php

namespace App\Observers;

use Illuminate\Support\Facades\Cache;

/**
 * CatalogCacheObserver — Busts cached catalog data when any
 * Service, VehicleType, VehicleBrand, or ServiceVehiclePrice is modified.
 *
 * Registered in AppServiceProvider for:
 *   - Service
 *   - VehicleType
 *   - VehicleBrand
 *   - VehicleModel
 *   - ServiceVehiclePrice
 */
class CatalogCacheObserver
{
    public function saved($model): void
    {
        $this->bustCache();
    }

    public function deleted($model): void
    {
        $this->bustCache();
    }

    private function bustCache(): void
    {
        Cache::forget('active_services_with_prices');
        Cache::forget('price_grid');
        Cache::forget('active_brands_with_models');
        Cache::forget('active_vehicle_types');
    }
}
