<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    public function definition(): array
    {
        return [
            'ulid'               => (string) Str::ulid(),
            'client_id'          => Client::factory(),
            'assigned_to'        => User::factory()->laveur(),
            'created_by'         => User::factory()->admin(),
            'ticket_id'          => null,
            'scheduled_at'       => now()->addDays(1)->setTime(10, 0),
            'confirmed_at'       => null,
            'estimated_duration' => 30,
            'vehicle_plate'      => strtoupper(fake()->bothify('??-####-??')),
            'vehicle_brand'      => null,
            'vehicle_brand_id'   => null,
            'vehicle_model_id'   => null,
            'vehicle_type_id'    => VehicleType::factory(),
            'notes'              => null,
            'cancelled_reason'   => null,
            'status'             => Appointment::STATUS_PENDING,
            'source'             => 'phone',
        ];
    }

    public function confirmed(): static
    {
        return $this->state([
            'status'       => Appointment::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);
    }

    public function arrived(): static
    {
        return $this->state([
            'status'       => Appointment::STATUS_ARRIVED,
            'confirmed_at' => now()->subHour(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state([
            'status'           => Appointment::STATUS_CANCELLED,
            'cancelled_reason' => 'Client annulé',
        ]);
    }
}
