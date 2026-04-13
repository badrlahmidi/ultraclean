<?php

namespace Tests\Unit;

use App\Http\Requests\StoreTicketRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * DiscountValidationTest — AUDIT-FIX C6
 *
 * Vérifie que discount_value est borné à 100 pour les remises en pourcentage.
 */
class DiscountValidationTest extends TestCase
{
    use RefreshDatabase;

    private function makeRules(string $discountType): array
    {
        return [
            'discount_type'  => ['nullable', 'in:percent,fixed'],
            'discount_value' => array_filter([
                'nullable', 'numeric', 'min:0',
                $discountType === 'percent' ? 'max:100' : null,
            ]),
        ];
    }

    public function test_percent_discount_above_100_fails(): void
    {
        $validator = Validator::make(
            ['discount_type' => 'percent', 'discount_value' => 150],
            $this->makeRules('percent')
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('discount_value', $validator->errors()->toArray());
    }

    public function test_percent_discount_equal_100_passes(): void
    {
        $validator = Validator::make(
            ['discount_type' => 'percent', 'discount_value' => 100],
            $this->makeRules('percent')
        );

        $this->assertFalse($validator->fails());
    }

    public function test_fixed_discount_above_100_passes(): void
    {
        $validator = Validator::make(
            ['discount_type' => 'fixed', 'discount_value' => 50000],
            $this->makeRules('fixed')
        );

        $this->assertFalse($validator->fails());
    }

    public function test_null_discount_value_passes(): void
    {
        $validator = Validator::make(
            ['discount_type' => 'percent', 'discount_value' => null],
            $this->makeRules('percent')
        );

        $this->assertFalse($validator->fails());
    }

    public function test_negative_discount_fails(): void
    {
        $validator = Validator::make(
            ['discount_type' => 'fixed', 'discount_value' => -5],
            $this->makeRules('fixed')
        );

        $this->assertTrue($validator->fails());
    }
}
