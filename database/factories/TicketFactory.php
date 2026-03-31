<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Ticket>
 */
class TicketFactory extends Factory
{
    protected $model = Ticket::class;    public function definition(): array
    {
        return [
            'ulid'            => (string) Str::ulid(),
            'ticket_number'   => 'TK-' . now()->format('Ymd') . '-' . fake()->unique()->numberBetween(1000, 9999),
            'status'          => Ticket::STATUS_PENDING,
            'vehicle_type_id' => VehicleType::factory(),
            'vehicle_plate'   => strtoupper(fake()->bothify('??-####-??')),
            'subtotal_cents'  => 5000,
            'discount_cents'  => 0,
            'total_cents'     => 5000,
            'created_by'      => User::factory(),
        ];
    }

    public function pending(): static
    {
        return $this->state(['status' => Ticket::STATUS_PENDING]);
    }

    public function inProgress(): static
    {
        return $this->state(['status' => Ticket::STATUS_IN_PROGRESS, 'started_at' => now()]);
    }

    public function completed(): static
    {
        return $this->state([
            'status'       => Ticket::STATUS_COMPLETED,
            'started_at'   => now()->subMinutes(20),
            'completed_at' => now(),
        ]);
    }

    public function paid(): static
    {
        return $this->state([
            'status'       => Ticket::STATUS_PAID,
            'started_at'   => now()->subMinutes(25),
            'completed_at' => now()->subMinutes(5),
            'paid_at'      => now(),
        ]);
    }

    public function withTotal(int $cents): static
    {
        return $this->state([
            'subtotal_cents' => $cents,
            'total_cents'    => $cents,
        ]);
    }
}
