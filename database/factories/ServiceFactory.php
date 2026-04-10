<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'name'             => fake()->unique()->words(3, true),
            'description'      => fake()->sentence(),
            'color'            => fake()->hexColor(),
            'category'         => fake()->randomElement(['exterieur', 'interieur', 'complet', 'detail']),
            'duration_minutes' => fake()->randomElement([15, 20, 30, 45, 60]),
            'sort_order'       => fake()->numberBetween(1, 100),
            'is_active'        => true,
            'price_type'       => 'fixed',
            'base_price_cents' => fake()->numberBetween(2000, 15000),
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }

    public function variable(): static
    {
        return $this->state([
            'price_type'       => 'variable',
            'base_price_cents' => 0,
        ]);
    }
}
