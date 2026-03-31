<?php

namespace Database\Factories;

use App\Models\VehicleType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VehicleType>
 */
class VehicleTypeFactory extends Factory
{
    protected $model = VehicleType::class;

    public function definition(): array
    {
        static $order = 0;

        return [
            'name'       => fake()->unique()->randomElement(['Citadine', 'Berline', 'SUV', 'Camionnette', 'Moto']),
            'slug'       => fake()->unique()->slug(1),
            'is_active'  => true,
            'sort_order' => ++$order,
        ];
    }
}
