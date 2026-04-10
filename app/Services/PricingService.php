<?php

namespace App\Services;

use App\DTOs\ServiceLineDTO;
use App\Models\Service;
use App\Models\ServiceVehiclePrice;
use Illuminate\Support\Collection;

/**
 * PricingService — Centralised price resolution and validation.
 *
 * Single source of truth for:
 * - Resolving the server-side unit price of a service (fixed or vehicle-type variable)
 * - Calculating line totals
 * - Validating that frontend-submitted prices match backend expectations
 *
 * Addresses ARCH-3: "Logique de calcul de prix dispersée".
 */
class PricingService
{
    /**
     * Resolve the canonical unit price (in cents) for a service.
     *
     * Rules:
     *  1. If the service has a fixed `base_price_cents`, return it.
     *  2. If a `vehicleTypeId` is provided, look up the ServiceVehiclePrice row.
     *  3. Fall back to `base_price_cents` (may be 0 for "quote on demand" services).
     */
    public static function resolveUnitPrice(int $serviceId, ?int $vehicleTypeId = null): int
    {
        $service = Service::find($serviceId);

        if (! $service) {
            return 0;
        }        // Fixed-price service — vehicle type irrelevant.
        // Returns base_price_cents directly; 0 means "free service" and must
        // NOT fall through to the variable grid (F-11 fix).
        if ($service->price_type === 'fixed') {
            return (int) $service->base_price_cents;
        }

        // Variable-price service — look up the vehicle-type grid
        if ($vehicleTypeId) {
            $variantPrice = ServiceVehiclePrice::where('service_id', $serviceId)
                ->where('vehicle_type_id', $vehicleTypeId)
                ->value('price_cents');

            if ($variantPrice !== null) {
                return (int) $variantPrice;
            }
        }

        // Fallback to base price
        return (int) ($service->base_price_cents ?? 0);
    }

    /**
     * Calculate the line total for a single service line.
     *
     *   line_total = max(0, unit_price × quantity − discount)
     */
    public static function lineTotal(int $unitPriceCents, int $quantity, int $discountCents = 0): int
    {
        return max(0, ($unitPriceCents * $quantity) - $discountCents);
    }

    /**
     * Calculate the gross subtotal for an array of ServiceLineDTOs.
     *
     * @param  ServiceLineDTO[]  $lines
     */
    public static function subtotal(array $lines): int
    {
        $sum = 0;
        foreach ($lines as $line) {
            $sum += self::lineTotal($line->unitPriceCents, $line->quantity, $line->discountCents);
        }
        return $sum;
    }

    /**
     * Validate that every submitted line price matches the server-side price.
     *
     * Returns a collection of mismatch descriptions (empty = all OK).
     * A tolerance of 0 cents is used (exact match required).
     *
     * @param  ServiceLineDTO[]  $lines
     * @param  int|null          $vehicleTypeId  Global vehicle type for the ticket
     * @return Collection<int, string>  Mismatch messages
     */
    public static function validatePrices(array $lines, ?int $vehicleTypeId = null): Collection
    {
        $mismatches = collect();

        foreach ($lines as $i => $line) {
            $variantId = $line->priceVariantId ?? $vehicleTypeId;
            $expected  = self::resolveUnitPrice($line->serviceId, $variantId);

            // Allow $expected = 0 for "quote on demand" / custom-priced services
            if ($expected > 0 && $line->unitPriceCents !== $expected) {                $service = Service::find($line->serviceId);
                $serviceName = $service !== null ? $service->name : '?';
                $mismatches->push(sprintf(
                    'Service #%d (%s) : prix soumis %d ≠ prix serveur %d centimes',
                    $i + 1,
                    $serviceName,
                    $line->unitPriceCents,
                    $expected,
                ));
            }
        }

        return $mismatches;
    }

    /**
     * Build the full price grid for the ticket creation page.
     *
     * Returns [service_id => [vehicle_type_id => price_cents, ...], ...]
     *
     * @param  Collection  $services  Services with `prices` relation loaded
     */
    public static function buildPriceGrid(Collection $services): array
    {
        $grid = [];
        foreach ($services as $svc) {
            $grid[$svc->id] = $svc->prices
                ->keyBy('vehicle_type_id')
                ->map(fn ($p) => $p->price_cents)
                ->all();
        }
        return $grid;
    }
}
