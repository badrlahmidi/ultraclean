<?php

namespace Database\Factories;

use App\Models\StockProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockProduct>
 */
class StockProductFactory extends Factory
{
    protected $model = StockProduct::class;

    public function definition(): array
    {
        return [
            'name'             => fake()->words(3, true),
            'description'      => fake()->sentence(),
            'category'         => fake()->randomElement(['produit_chimique', 'consommable', 'outil', 'autre']),
            'unit'             => fake()->randomElement(['L', 'kg', 'unité', 'rouleau']),
            'current_quantity' => fake()->randomFloat(2, 5, 50),
            'min_quantity'     => 2.0,
            'cost_price_cents' => fake()->numberBetween(500, 5000),
            'supplier'         => fake()->company(),
            'sku'              => strtoupper(fake()->unique()->bothify('SKU-####')),
            'is_active'        => true,
        ];
    }

    public function lowStock(): static
    {
        return $this->state([
            'current_quantity' => 1.0,
            'min_quantity'     => 5.0,
        ]);
    }

    public function withQuantity(float $qty): static
    {
        return $this->state(['current_quantity' => $qty]);
    }
}
