<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Setting;
use App\Models\Ticket;
use App\Models\User;
use App\Models\VehicleType;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AppointmentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $laveur;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::create(2026, 4, 6, 10, 0, 0)); // Monday — open business day

        $this->admin  = User::factory()->admin()->create();
        $this->laveur = User::factory()->laveur()->create();

        Setting::set('opening_time',  '08:00');
        Setting::set('closing_time',  '21:00');
        Setting::set('business_days', [1, 2, 3, 4, 5, 6]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── Convert: appointment status becomes in_progress ─────────────────

    #[Test]
    public function it_converts_confirmed_appointment_to_ticket_and_appointment_becomes_in_progress(): void
    {
        $vehicleType = VehicleType::factory()->create();

        $appointment = Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'created_by'         => $this->admin->id,
            'vehicle_type_id'    => $vehicleType->id,
            'estimated_duration' => 30,
        ]);

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appointment->id))
            ->assertRedirect();

        $appointment->refresh();

        $this->assertSame(Appointment::STATUS_IN_PROGRESS, $appointment->status);
        $this->assertNotNull($appointment->ticket_id);

        $ticket = Ticket::find($appointment->ticket_id);
        $this->assertNotNull($ticket);
        $this->assertSame($appointment->vehicle_type_id, $ticket->vehicle_type_id);
    }

    // ── findConflicts scope ──────────────────────────────────────────────

    #[Test]
    public function it_detects_conflicts_with_findConflicts_scope(): void
    {
        $vehicleType = VehicleType::factory()->create();

        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'created_by'         => $this->admin->id,
            'vehicle_type_id'    => $vehicleType->id,
            'scheduled_at'       => Carbon::create(2026, 4, 5, 10, 0, 0),
            'estimated_duration' => 30,
        ]);

        // 10:15‑10:45 overlaps the 10:00‑10:30 appointment
        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::create(2026, 4, 5, 10, 15, 0),
            30
        );
        $this->assertCount(1, $conflicts);

        // 11:00‑11:30 does not overlap
        $noConflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::create(2026, 4, 5, 11, 0, 0),
            30
        );
        $this->assertCount(0, $noConflicts);
    }

    // ── State machine transitions ────────────────────────────────────────

    #[Test]
    public function it_allows_valid_state_machine_transitions(): void
    {
        $appointment = Appointment::factory()->create([
            'status'     => Appointment::STATUS_PENDING,
            'created_by' => $this->admin->id,
        ]);

        $appointment->transitionTo(Appointment::STATUS_CONFIRMED);
        $this->assertSame(Appointment::STATUS_CONFIRMED, $appointment->fresh()->status);
        $this->assertNotNull($appointment->fresh()->confirmed_at);

        $appointment->transitionTo(Appointment::STATUS_ARRIVED);
        $this->assertSame(Appointment::STATUS_ARRIVED, $appointment->fresh()->status);

        $appointment->transitionTo(Appointment::STATUS_IN_PROGRESS);
        $this->assertSame(Appointment::STATUS_IN_PROGRESS, $appointment->fresh()->status);

        $appointment->transitionTo(Appointment::STATUS_COMPLETED);
        $this->assertSame(Appointment::STATUS_COMPLETED, $appointment->fresh()->status);

        $this->expectException(\RuntimeException::class);
        $appointment->transitionTo(Appointment::STATUS_CANCELLED);
    }

    // ── markNoShow HTTP endpoint ─────────────────────────────────────────

    #[Test]
    public function it_marks_appointment_as_no_show(): void
    {
        $appointment = Appointment::factory()->create([
            'status'     => Appointment::STATUS_PENDING,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.no-show', $appointment->id))
            ->assertRedirect();

        $this->assertSame(Appointment::STATUS_NO_SHOW, $appointment->fresh()->status);
    }

    #[Test]
    public function it_cannot_mark_in_progress_appointment_as_no_show(): void
    {
        $appointment = Appointment::factory()->create([
            'status'     => Appointment::STATUS_IN_PROGRESS,
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.no-show', $appointment->id))
            ->assertRedirect();

        // Invalid transition — status unchanged
        $this->assertSame(Appointment::STATUS_IN_PROGRESS, $appointment->fresh()->status);
    }

    // ── Feasibility JSON API ─────────────────────────────────────────────

    #[Test]
    public function it_checks_feasibility_api(): void
    {
        $vehicleType = VehicleType::factory()->create();

        $appointment = Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'created_by'         => $this->admin->id,
            'vehicle_type_id'    => $vehicleType->id,
            'estimated_duration' => 30,
        ]);

        $this->actingAs($this->admin)
            ->getJson(route('admin.appointments.feasibility', $appointment->id))
            ->assertOk()
            ->assertJsonStructure(['washer_id', 'queue_minutes', 'due_at', 'overflow', 'warning'])            ->assertJsonFragment([
                'washer_id'     => $this->laveur->id,
                'queue_minutes' => 30,   // The 30-min confirmed appointment (tomorrow 10:00) is within the 24h horizon
                'overflow'      => false, // due_at = today 11:00 → same open day, no overflow
            ]);
    }
}
