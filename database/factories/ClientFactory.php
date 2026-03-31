<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        return [
            'name'               => fake()->name(),
            'phone'              => fake()->unique()->numerify('06########'),
            'email'              => fake()->unique()->safeEmail(),
            'vehicle_plate'      => strtoupper(fake()->bothify('??-####-??')),
            'loyalty_tier'       => 'standard',
            'loyalty_points'     => 0,
            'total_visits'       => 0,
            'total_spent_cents'  => 0,
            'last_visit_date'    => null,
            'is_active'          => true,
        ];
    }

    public function silver(): static
    {
        return $this->state(['loyalty_tier' => 'silver', 'total_visits' => 15]);
    }

    public function gold(): static
    {
        return $this->state(['loyalty_tier' => 'gold', 'total_visits' => 30]);
    }

    public function platinum(): static
    {
        return $this->state(['loyalty_tier' => 'platinum', 'total_visits' => 60]);
    }

    public function withPoints(int $points): static
    {
        return $this->state(['loyalty_points' => $points]);
    }
}
