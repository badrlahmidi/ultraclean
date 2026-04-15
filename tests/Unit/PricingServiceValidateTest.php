<?php

namespace Tests\Unit;

use App\DTOs\ServiceLineDTO;
use App\Services\PricingService;
use App\Models\Service;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit tests for PricingService::validatePrices() — edge-case coverage.
 *
 * The validatePrices() method is the only server-side guard between a
 * client-side price manipulation and a real payment shortfall.  These tests
 * ensure every important branch is exercised.
 */
class PricingServiceValidateTest extends TestCase
{
    use RefreshDatabase;

    // ── Empty input ──────────────────────────────────────────────────────

    public function test_empty_lines_returns_no_mismatches(): void
    {
        $result = PricingService::validatePrices([]);

        $this->assertCount(0, $result);
    }

    // ── Fixed-price service ──────────────────────────────────────────────

    public function test_correct_fixed_price_returns_no_mismatch(): void
    {
        $service = Service::factory()->create([
            'price_type'       => 'fixed',
            'base_price_cents' => 5000,
        ]);

        $line = $this->makeLine($service->id, 5000);

        $result = PricingService::validatePrices([$line]);

        $this->assertCount(0, $result);
    }

    public function test_wrong_fixed_price_returns_mismatch(): void
    {
        $service = Service::factory()->create([
            'price_type'       => 'fixed',
            'base_price_cents' => 5000,
        ]);

        // Submit 3 000 instead of the correct 5 000
        $line = $this->makeLine($service->id, 3000);

        $result = PricingService::validatePrices([$line]);

        $this->assertCount(1, $result);
        $this->assertStringContainsString('5000', $result->first());
        $this->assertStringContainsString('3000', $result->first());
    }

    // ── Zero-price "free / quote-on-demand" service ──────────────────────

    public function test_zero_price_service_is_never_flagged_as_mismatch(): void
    {
        // A service with base_price_cents = 0 means "quote on demand" or free.
        // PricingService must NOT flag submitted prices when the expected price is 0,
        // otherwise the caissier cannot override the price for custom services.
        $service = Service::factory()->create([
            'price_type'       => 'fixed',
            'base_price_cents' => 0,
        ]);

        // Submit any price for a zero-base-price service — must pass validation.
        $line = $this->makeLine($service->id, 9999);

        $result = PricingService::validatePrices([$line]);

        $this->assertCount(0, $result, 'Zero-base-price services must never produce a mismatch');
    }

    // ── Variable-price service ───────────────────────────────────────────

    public function test_correct_variable_price_passes_validation(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $service = Service::factory()->create([
            'price_type'       => 'variable',
            'base_price_cents' => 0,
        ]);
        $service->prices()->create([
            'vehicle_type_id' => $vehicleType->id,
            'price_cents'     => 8000,
        ]);

        $line = $this->makeLine($service->id, 8000, $vehicleType->id);

        $result = PricingService::validatePrices([$line], $vehicleType->id);

        $this->assertCount(0, $result);
    }

    public function test_wrong_variable_price_returns_mismatch(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $service = Service::factory()->create([
            'price_type'       => 'variable',
            'base_price_cents' => 0,
        ]);
        $service->prices()->create([
            'vehicle_type_id' => $vehicleType->id,
            'price_cents'     => 8000,
        ]);

        // Submit 4 000 instead of the correct 8 000
        $line = $this->makeLine($service->id, 4000, $vehicleType->id);

        $result = PricingService::validatePrices([$line], $vehicleType->id);

        $this->assertCount(1, $result);
    }

    // ── Multiple lines ───────────────────────────────────────────────────

    public function test_multiple_mismatches_are_all_reported(): void
    {
        $s1 = Service::factory()->create(['price_type' => 'fixed', 'base_price_cents' => 5000]);
        $s2 = Service::factory()->create(['price_type' => 'fixed', 'base_price_cents' => 3000]);

        $lines = [
            $this->makeLine($s1->id, 1000), // wrong (expect 5000)
            $this->makeLine($s2->id, 1000), // wrong (expect 3000)
        ];

        $result = PricingService::validatePrices($lines);

        $this->assertCount(2, $result);
    }

    public function test_mixed_correct_and_wrong_lines(): void
    {
        $correct = Service::factory()->create(['price_type' => 'fixed', 'base_price_cents' => 5000]);
        $wrong   = Service::factory()->create(['price_type' => 'fixed', 'base_price_cents' => 3000]);

        $lines = [
            $this->makeLine($correct->id, 5000), // correct
            $this->makeLine($wrong->id, 1000),   // wrong
        ];

        $result = PricingService::validatePrices($lines);

        $this->assertCount(1, $result);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private function makeLine(int $serviceId, int $unitPriceCents, ?int $vehicleTypeId = null): ServiceLineDTO
    {
        return new ServiceLineDTO(
            serviceId: $serviceId,
            quantity: 1,
            unitPriceCents: $unitPriceCents,
            discountCents: 0,
            priceVariantId: $vehicleTypeId,
        );
    }
}
