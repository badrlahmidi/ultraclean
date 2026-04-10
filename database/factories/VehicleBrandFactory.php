<?php

namespace Database\Factories;

use App\Models\VehicleBrand;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleBrand>
 */
class VehicleBrandFactory extends Factory
{
    protected $model = VehicleBrand::class;

    public function definition(): array
    {
        static $order = 0;

        return [
            'name'       => fake()->unique()->company(),
            'slug'       => fake()->unique()->slug(1),
            'is_active'  => true,
            'sort_order' => ++$order,
        ];
    }
}
