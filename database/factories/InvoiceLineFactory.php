<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceLine>
 */
class InvoiceLineFactory extends Factory
{
    protected $model = InvoiceLine::class;

    public function definition(): array
    {
        $unitPrice = fake()->numberBetween(1000, 10000);
        $quantity  = fake()->numberBetween(1, 5);

        return [
            'invoice_id'       => Invoice::factory(),
            'service_id'       => null,
            'description'      => fake()->words(4, true),
            'quantity'         => $quantity,
            'unit_price_cents' => $unitPrice,
            'discount_cents'   => 0,
            'line_total_cents' => $unitPrice * $quantity,
            'sort_order'       => 1,
        ];
    }
}
