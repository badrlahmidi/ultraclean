<?php

namespace Database\Factories;

use App\Models\Quote;
use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Quote>
 */
class QuoteFactory extends Factory
{
    protected $model = Quote::class;

    public function definition(): array
    {
        $subtotal = fake()->numberBetween(5000, 50000);
        $taxRate  = 20.0;
        $tax      = (int) round($subtotal * $taxRate / 100);
        $total    = $subtotal + $tax;

        return [
            'ulid'           => (string) Str::ulid(),
            'quote_number'   => 'DEV-' . now()->format('Ym') . '-' . fake()->unique()->numberBetween(1000, 9999),
            'client_id'      => Client::factory(),
            'created_by'     => User::factory()->admin(),
            'status'         => Quote::STATUS_DRAFT,
            'billing_name'   => fake()->company(),
            'billing_address'=> fake()->streetAddress(),
            'billing_city'   => fake()->city(),
            'billing_zip'    => fake()->postcode(),
            'billing_ice'    => null,
            'subtotal_cents' => $subtotal,
            'discount_cents' => 0,
            'tax_rate'       => $taxRate,
            'tax_cents'      => $tax,
            'total_cents'    => $total,
            'notes'          => null,
            'valid_until'    => now()->addDays(30)->toDateString(),
            'sent_at'        => null,
            'accepted_at'    => null,
            'pdf_path'       => null,
        ];
    }

    public function sent(): static
    {
        return $this->state([
            'status'  => Quote::STATUS_SENT,
            'sent_at' => now(),
        ]);
    }

    public function accepted(): static
    {
        return $this->state([
            'status'      => Quote::STATUS_ACCEPTED,
            'sent_at'     => now()->subDay(),
            'accepted_at' => now(),
        ]);
    }
}
