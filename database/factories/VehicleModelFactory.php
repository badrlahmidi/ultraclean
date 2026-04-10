<?php

namespace Database\Factories;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleModel>
 */
class VehicleModelFactory extends Factory
{
    protected $model = VehicleModel::class;

    public function definition(): array
    {
        static $order = 0;

        return [
            'brand_id'         => VehicleBrand::factory(),
            'name'             => fake()->unique()->word(),
            'slug'             => fake()->unique()->slug(1),
            'is_active'        => true,
            'sort_order'       => ++$order,
        ];
    }
}
