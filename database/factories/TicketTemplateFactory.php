<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\TicketTemplate;
use App\Models\VehicleType;
use Illuminate\Database\Eloquent\Factories\Factory;
/**
 * @extends Factory<TicketTemplate>
 */
class TicketTemplateFactory extends Factory
{
    protected $model = TicketTemplate::class;    public function definition(): array
    {
        return [
            'client_id'               => Client::factory(),
            'vehicle_plate'           => strtoupper(fake()->bothify('??-####-??')),
            'vehicle_brand'           => fake()->randomElement(['Renault', 'Peugeot', 'Dacia', 'Toyota', 'BMW']),
            'vehicle_type_id'         => VehicleType::factory(),
            'service_ids'             => [1],
            'estimated_duration'      => fake()->randomElement([20, 30, 45, 60]),
            'assigned_to_preference'  => null,
            'recurrence_rule'         => '0 8 * * 1',  // Chaque lundi à 8h
            'label'                   => fake()->words(3, true),
            'notes'                   => null,            'is_active'               => true,
            // Date de déclenchement dans le passé pour que updateNextRun()
            // calcule toujours une prochaine exécution ≥ à l'originale.
            'next_run_at'             => now()->subDay(),
            'last_run_at'             => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }

    public function daily(): static
    {
        return $this->state([
            'recurrence_rule' => '0 8 * * *',
            'next_run_at'     => now()->addDay(),
        ]);
    }

    public function withClient(): static
    {
        return $this->state(['client_id' => Client::factory()]);
    }
}
