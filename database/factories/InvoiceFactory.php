<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        $subtotal = fake()->numberBetween(5000, 50000);
        $taxRate  = 20.0;
        $tax      = (int) round($subtotal * $taxRate / 100);
        $total    = $subtotal + $tax;

        return [
            'ulid'              => (string) Str::ulid(),
            'invoice_number'    => 'FAC-' . now()->format('Ym') . '-' . fake()->unique()->numberBetween(1000, 9999),
            'quote_id'          => null,
            'client_id'         => Client::factory(),
            'created_by'        => User::factory()->admin(),
            'status'            => Invoice::STATUS_DRAFT,
            'payment_method'    => null,
            'billing_name'      => fake()->company(),
            'billing_address'   => fake()->streetAddress(),
            'billing_city'      => fake()->city(),
            'billing_zip'       => fake()->postcode(),
            'billing_ice'       => null,
            'subtotal_cents'    => $subtotal,
            'discount_cents'    => 0,
            'tax_rate'          => $taxRate,
            'tax_cents'         => $tax,
            'total_cents'       => $total,
            'amount_paid_cents' => 0,
            'notes'             => null,
            'due_date'          => now()->addDays(30)->toDateString(),
            'issued_at'         => null,
            'paid_at'           => null,
            'pdf_path'          => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => Invoice::STATUS_DRAFT]);
    }

    public function issued(): static
    {
        return $this->state([
            'status'    => Invoice::STATUS_ISSUED,
            'issued_at' => now(),
        ]);
    }

    public function paid(): static
    {
        return $this->state([
            'status'            => Invoice::STATUS_PAID,
            'issued_at'         => now()->subDays(5),
            'paid_at'           => now(),
            'amount_paid_cents' => fn (array $attrs) => $attrs['total_cents'],
            'payment_method'    => 'cash',
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(['status' => Invoice::STATUS_CANCELLED]);
    }
}
