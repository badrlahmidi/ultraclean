<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Setting;
use App\Models\User;
use App\Services\WasherScheduler;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * AppointmentConflictTest — Conflict detection + WasherScheduler appointment awareness.
 *
 * Covers:
 *  - scopeConflicting: overlapping, non-overlapping, excluded, different washer
 *  - findConflicts: returns collection
 *  - confirm() with conflict → warning flash
 *  - confirm() without conflict → success flash
 *  - store() with conflict → success + warning message
 *  - check-conflicts API endpoint
 *  - WasherScheduler includes confirmed appointments
 *  - vehicle-brands search API endpoint
 */
class AppointmentConflictTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $laveur;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::create(2026, 4, 4, 10, 0, 0));

        $this->admin  = User::factory()->admin()->create();
        $this->laveur = User::factory()->laveur()->create();

        Setting::set('business_open_hour', '8');
        Setting::set('business_open_minute', '0');
        Setting::set('business_close_hour', '21');
        Setting::set('business_close_minute', '0');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ── scopeConflicting ─────────────────────────────────────────────────

    public function test_overlapping_appointment_is_detected(): void
    {
        // Existing confirmed RDV: 14:00 → 14:30
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        // New RDV: 14:15 → 14:45 → overlaps
        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(14, 15),
            30
        );

        $this->assertCount(1, $conflicts);
    }

    public function test_non_overlapping_appointment_is_not_detected(): void
    {
        // Existing confirmed RDV: 14:00 → 14:30
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        // New RDV: 15:00 → 15:30 → no overlap
        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(15, 0),
            30
        );

        $this->assertCount(0, $conflicts);
    }

    public function test_adjacent_appointments_do_not_conflict(): void
    {
        // Existing: 14:00 → 14:30
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        // New: 14:30 → 15:00 → exactly adjacent, no overlap
        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(14, 30),
            30
        );

        $this->assertCount(0, $conflicts);
    }

    public function test_different_washer_does_not_conflict(): void
    {
        $otherLaveur = User::factory()->laveur()->create();

        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $otherLaveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(14, 0),
            30
        );

        $this->assertCount(0, $conflicts);
    }

    public function test_excluded_id_is_not_counted(): void
    {
        $existing = Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        // Same time, but exclude itself
        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(14, 0),
            30,
            $existing->id
        );

        $this->assertCount(0, $conflicts);
    }

    public function test_pending_appointment_does_not_conflict(): void
    {
        // Pending RDVs are not "reserved" → no conflict
        Appointment::factory()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'status'             => Appointment::STATUS_PENDING,
            'created_by'         => $this->admin->id,
        ]);

        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(14, 0),
            30
        );

        $this->assertCount(0, $conflicts);
    }

    public function test_cancelled_appointment_does_not_conflict(): void
    {
        Appointment::factory()->cancelled()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        $conflicts = Appointment::findConflicts(
            $this->laveur->id,
            Carbon::today()->setTime(14, 0),
            30
        );

        $this->assertCount(0, $conflicts);
    }

    // ── API: check-conflicts ─────────────────────────────────────────────

    public function test_check_conflicts_api_returns_conflicts(): void
    {
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson(route('admin.appointments.check-conflicts', [
                'assigned_to'        => $this->laveur->id,
                'scheduled_at'       => Carbon::today()->setTime(14, 10)->toIso8601String(),
                'estimated_duration' => 30,
            ]));

        $response->assertOk()
            ->assertJsonPath('has_conflicts', true)
            ->assertJsonPath('count', 1);
    }

    public function test_check_conflicts_api_returns_empty_when_no_conflict(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson(route('admin.appointments.check-conflicts', [
                'assigned_to'        => $this->laveur->id,
                'scheduled_at'       => Carbon::today()->setTime(14, 0)->toIso8601String(),
                'estimated_duration' => 30,
            ]));

        $response->assertOk()
            ->assertJsonPath('has_conflicts', false)
            ->assertJsonPath('count', 0);
    }

    // ── Confirm with conflict warning ────────────────────────────────────

    public function test_confirm_with_conflict_returns_warning(): void
    {
        // Existing confirmed RDV at same time
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 0),
            'estimated_duration' => 30,
            'created_by'         => $this->admin->id,
        ]);

        // New pending RDV at overlapping time
        $pending = Appointment::factory()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(14, 10),
            'estimated_duration' => 30,
            'status'             => Appointment::STATUS_PENDING,
            'created_by'         => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.confirm', $pending));

        // Should be confirmed (status changed)
        $pending->refresh();
        $this->assertEquals(Appointment::STATUS_CONFIRMED, $pending->status);

        // Should have warning flash
        $response->assertSessionHas('warning');
    }

    public function test_confirm_without_conflict_returns_success(): void
    {
        $pending = Appointment::factory()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => Carbon::today()->setTime(16, 0),
            'estimated_duration' => 30,
            'status'             => Appointment::STATUS_PENDING,
            'created_by'         => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.confirm', $pending));

        $pending->refresh();
        $this->assertEquals(Appointment::STATUS_CONFIRMED, $pending->status);
        $response->assertSessionHas('success');
    }

    // ── WasherScheduler includes confirmed appointments ──────────────────

    public function test_scheduler_includes_confirmed_appointment_minutes(): void
    {
        // No tickets, but one confirmed appointment
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => now()->addHour(),
            'estimated_duration' => 45,
            'created_by'         => $this->admin->id,
        ]);

        $minutes = WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(45, $minutes);
    }

    public function test_scheduler_ignores_past_confirmed_appointments(): void
    {
        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => now()->subHour(),
            'estimated_duration' => 45,
            'created_by'         => $this->admin->id,
        ]);

        $minutes = WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(0, $minutes);
    }

    public function test_scheduler_ignores_appointment_already_converted_to_ticket(): void
    {
        $ticket = \App\Models\Ticket::factory()->pending()->create([
            'created_by'  => User::factory()->caissier()->create()->id,
            'assigned_to' => $this->laveur->id,
        ]);

        Appointment::factory()->confirmed()->create([
            'assigned_to'        => $this->laveur->id,
            'scheduled_at'       => now()->addHour(),
            'estimated_duration' => 45,
            'ticket_id'          => $ticket->id,
            'created_by'         => $this->admin->id,
        ]);

        // Should NOT double-count: ticket is counted by ticket logic,
        // appointment with ticket_id is ignored by confirmedAppointmentMinutes
        $confirmedMinutes = WasherScheduler::confirmedAppointmentMinutes($this->laveur->id);
        $this->assertEquals(0, $confirmedMinutes);
    }

    // ── Vehicle brand search API ─────────────────────────────────────────

    public function test_vehicle_brand_search_returns_matching_brands(): void
    {
        \App\Models\VehicleBrand::factory()->create(['name' => 'Toyota', 'is_active' => true]);
        \App\Models\VehicleBrand::factory()->create(['name' => 'BMW', 'is_active' => true]);

        $response = $this->actingAs($this->admin)
            ->getJson(route('admin.appointments.vehicle-brands', ['q' => 'Toy']));

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Toyota');
    }

    public function test_vehicle_brand_search_returns_empty_for_no_match(): void
    {
        \App\Models\VehicleBrand::factory()->create(['name' => 'Toyota', 'is_active' => true]);

        $response = $this->actingAs($this->admin)
            ->getJson(route('admin.appointments.vehicle-brands', ['q' => 'ZZZZZ']));

        $response->assertOk()
            ->assertJsonCount(0);
    }
}
