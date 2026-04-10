<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Setting;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\User;
use App\Models\VehicleType;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * AppointmentConversionTest — Convert-to-ticket flow robustness.
 *
 * Covers:
 *  - Successful conversion from confirmed/arrived status
 *  - Rejection of non-convertible statuses
 *  - Ticket fields copied correctly
 *  - ActivityLog entry created
 *  - Role-aware redirects (admin vs caissier)
 *  - Authorization (laveur forbidden, guest redirected)
 *  - State machine integrity (two-step transition)
 *  - Shift association
 */
class AppointmentConversionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $caissier;
    private User $laveur;
    private VehicleType $vehicleType;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::create(2026, 4, 5, 10, 0, 0));

        $this->admin       = User::factory()->admin()->create();
        $this->caissier    = User::factory()->caissier()->create();
        $this->laveur      = User::factory()->laveur()->create();
        $this->vehicleType = VehicleType::factory()->create();

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

    // ── Helper ─────────────────────────────────────────────────────────

    private function makeAppointment(string $status = 'confirmed', array $extra = []): Appointment
    {
        $states = match ($status) {
            'confirmed' => ['confirmed'],
            'arrived'   => ['arrived'],
            default     => [],
        };

        $factory = Appointment::factory()
            ->for(Client::factory(), 'client')
            ->state(array_merge([
                'assigned_to'     => $this->laveur->id,
                'created_by'      => $this->admin->id,
                'vehicle_type_id' => $this->vehicleType->id,
                'vehicle_plate'   => 'AB-1234-CD',
                'vehicle_brand'   => 'Toyota',
                'notes'           => 'Test notes',
            ], $extra));

        foreach ($states as $state) {
            $factory = $factory->$state();
        }

        if (!in_array($status, ['pending', 'confirmed', 'arrived', 'cancelled'])) {
            return $factory->state(['status' => $status])->create();
        }

        return $factory->create();
    }

    // ── Admin conversion ───────────────────────────────────────────────

    public function test_admin_can_convert_confirmed_appointment(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect(route('admin.appointments.show', $appt->id));
        $response->assertSessionHas('success');

        $appt->refresh();
        $this->assertNotNull($appt->ticket_id);
        $this->assertEquals(Appointment::STATUS_IN_PROGRESS, $appt->status);

        $ticket = Ticket::find($appt->ticket_id);
        $this->assertNotNull($ticket);
        $this->assertEquals(Ticket::STATUS_PENDING, $ticket->status);
    }

    public function test_admin_can_convert_arrived_appointment(): void
    {
        $appt = $this->makeAppointment('arrived');

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect(route('admin.appointments.show', $appt->id));
        $response->assertSessionHas('success');

        $appt->refresh();
        $this->assertNotNull($appt->ticket_id);
        $this->assertEquals(Appointment::STATUS_IN_PROGRESS, $appt->status);
    }

    public function test_ticket_fields_are_copied_from_appointment(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $appt->refresh();
        $ticket = Ticket::find($appt->ticket_id);

        $this->assertEquals($appt->vehicle_plate, $ticket->vehicle_plate);
        $this->assertEquals($appt->vehicle_brand, $ticket->vehicle_brand);
        $this->assertEquals($appt->vehicle_type_id, $ticket->vehicle_type_id);
        $this->assertEquals($appt->client_id, $ticket->client_id);
        $this->assertEquals($appt->assigned_to, $ticket->assigned_to);
        $this->assertEquals($appt->estimated_duration, $ticket->estimated_duration);
        $this->assertEquals($appt->notes, $ticket->notes);
        $this->assertEquals($this->admin->id, $ticket->created_by);
    }

    public function test_conversion_creates_activity_log(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $this->assertDatabaseHas('activity_logs', [
            'action'       => 'appointment.converted',
            'subject_type' => Appointment::class,
            'subject_id'   => $appt->id,
            'user_id'      => $this->admin->id,
        ]);
    }

    // ── Rejection ──────────────────────────────────────────────────────

    public function test_cannot_convert_pending_appointment(): void
    {
        $appt = $this->makeAppointment('pending');

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('tickets', ['client_id' => $appt->client_id]);
    }

    public function test_cannot_convert_in_progress_appointment(): void
    {
        $appt = $this->makeAppointment('in_progress');

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_cannot_convert_completed_appointment(): void
    {
        $appt = $this->makeAppointment('completed');

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_cannot_convert_cancelled_appointment(): void
    {
        $appt = $this->makeAppointment('cancelled');

        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }

    public function test_cannot_convert_already_converted_appointment(): void
    {
        $appt = $this->makeAppointment('confirmed');

        // First conversion succeeds
        $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $ticketCount = Ticket::count();

        // Second attempt should fail
        $response = $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertEquals($ticketCount, Ticket::count(), 'No extra ticket should be created');
    }

    // ── Caissier access ────────────────────────────────────────────────

    public function test_caissier_can_convert_via_caissier_route(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $response = $this->actingAs($this->caissier)
            ->post(route('caissier.appointments.convert', $appt->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $appt->refresh();
        $this->assertNotNull($appt->ticket_id);

        $ticket = Ticket::find($appt->ticket_id);
        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
    }

    public function test_caissier_shift_is_linked_to_ticket(): void
    {
        $shift = Shift::create([
            'user_id'            => $this->caissier->id,
            'opened_at'          => now(),
            'closed_at'          => null,
            'opening_cash_cents' => 0,
        ]);

        $appt = $this->makeAppointment('arrived');

        $this->actingAs($this->caissier)
            ->post(route('caissier.appointments.convert', $appt->id));

        $appt->refresh();
        $ticket = Ticket::find($appt->ticket_id);
        $this->assertEquals($shift->id, $ticket->shift_id);
    }

    // ── Authorization ──────────────────────────────────────────────────

    public function test_laveur_cannot_convert_via_admin_route(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $response = $this->actingAs($this->laveur)
            ->post(route('admin.appointments.convert', $appt->id));

        $response->assertStatus(403);
    }

    public function test_laveur_cannot_convert_via_caissier_route(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $response = $this->actingAs($this->laveur)
            ->post(route('caissier.appointments.convert', $appt->id));

        $response->assertStatus(403);
    }

    public function test_guest_cannot_convert_appointment(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $response = $this->post(route('admin.appointments.convert', $appt->id));

        $response->assertRedirect(route('login'));
    }

    // ── State machine integrity ────────────────────────────────────────

    public function test_confirmed_transitions_through_arrived_to_in_progress(): void
    {
        $appt = $this->makeAppointment('confirmed');

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $appt->refresh();
        $this->assertEquals(Appointment::STATUS_IN_PROGRESS, $appt->status);
        $this->assertNotNull($appt->confirmed_at);
    }

    public function test_arrived_transitions_directly_to_in_progress(): void
    {
        $appt = $this->makeAppointment('arrived');

        $this->actingAs($this->admin)
            ->post(route('admin.appointments.convert', $appt->id));

        $appt->refresh();
        $this->assertEquals(Appointment::STATUS_IN_PROGRESS, $appt->status);
    }
}
