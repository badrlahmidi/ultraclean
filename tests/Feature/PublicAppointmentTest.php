<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * PublicAppointmentTest — Réservation en ligne (non authentifiée).
 *
 * Vérifie :
 *   - Les routes publiques sont accessibles sans authentification
 *   - L'API de disponibilité marque les créneaux occupés comme indisponibles
 *   - La règle métier « 1 service par heure » est appliquée côté validation
 *   - Un deuxième visiteur ne peut pas réserver le MÊME service à la MÊME heure
 *   - Un autre créneau (ex. 15h) reste disponible
 *   - La confirmation est accessible par ULID
 */
class PublicAppointmentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Un admin doit exister pour servir de `created_by` aux RDV publics
        $this->admin = User::factory()->create([
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->service = Service::create([
            'name'             => 'Lavage complet',
            'description'      => 'Intérieur + extérieur',
            'color'            => '#2563eb',
            'category'         => 'lavage',
            'duration_minutes' => 45,
            'sort_order'       => 1,
            'is_active'        => true,
            'price_type'       => 'fixed',
            'base_price_cents' => 8000,
        ]);
    }

    // ─── Accès public ─────────────────────────────────────────────────────

    public function test_guest_can_view_reservation_form(): void
    {
        $this->get(route('reservations.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/Reservations/Create')
                ->has('services', 1)
                ->where('services.0.name', 'Lavage complet')
            );
    }

    public function test_root_url_redirects_to_reservation_page(): void
    {
        $this->get('/')->assertRedirect(route('reservations.create'));
    }

    // ─── API de disponibilité ─────────────────────────────────────────────

    public function test_availability_endpoint_returns_slots_list(): void
    {
        $date = Carbon::tomorrow()->toDateString();

        $response = $this->getJson(
            route('reservations.availability', ['service_id' => $this->service->id, 'date' => $date])
        );

        $response->assertOk()
            ->assertJsonPath('date', $date)
            ->assertJsonStructure([
                'date',
                'service' => ['id', 'name'],
                'slots' => [['hour', 'label', 'available', 'reason']],
            ]);

        $slots = $response->json('slots');
        $this->assertNotEmpty($slots);

        // Tous les créneaux doivent être libres (aucun RDV existant)
        foreach ($slots as $slot) {
            $this->assertTrue($slot['available'], "Slot at hour {$slot['hour']} should be available");
        }
    }

    public function test_availability_marks_taken_slot_as_unavailable(): void
    {
        $slotStart = Carbon::tomorrow()->setTime(14, 0);

        Appointment::create([
            'service_id'         => $this->service->id,
            'created_by'         => $this->admin->id,
            'scheduled_at'       => $slotStart,
            'estimated_duration' => 45,
            'guest_name'         => 'Premier client',
            'guest_phone'        => '0612345678',
            'status'             => Appointment::STATUS_PENDING,
            'source'             => 'online',
        ]);

        $response = $this->getJson(
            route('reservations.availability', [
                'service_id' => $this->service->id,
                'date'       => $slotStart->toDateString(),
            ])
        );

        $response->assertOk();

        $slots = collect($response->json('slots'));
        $slot14h = $slots->firstWhere('hour', 14);
        $slot15h = $slots->firstWhere('hour', 15);

        $this->assertFalse($slot14h['available'], '14h slot must be marked unavailable');
        $this->assertSame('taken', $slot14h['reason']);
        $this->assertTrue($slot15h['available'], '15h slot must still be available');
    }

    public function test_availability_requires_valid_service_and_date(): void
    {
        $this->getJson(route('reservations.availability', ['service_id' => 99999, 'date' => Carbon::tomorrow()->toDateString()]))
            ->assertStatus(422);

        $this->getJson(route('reservations.availability', ['service_id' => $this->service->id, 'date' => Carbon::yesterday()->toDateString()]))
            ->assertStatus(422);
    }

    // ─── Création d'une réservation (happy path) ──────────────────────────

    public function test_guest_can_create_reservation(): void
    {
        $date = Carbon::tomorrow();

        $response = $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Mohammed Alami',
            'guest_phone'    => '0612345678',
            'guest_email'    => 'mohammed@example.com',
            'vehicle_plate'  => '123-A-45',
            'vehicle_brand'  => 'Renault',
        ]);

        $this->assertDatabaseCount('appointments', 1);
        $appt = Appointment::first();

        $response->assertRedirect(route('reservations.confirmation', ['ulid' => $appt->ulid]));
        $response->assertSessionHas('success');

        $this->assertEquals('pending', $appt->status);
        $this->assertEquals('online', $appt->source);
        $this->assertEquals($this->service->id, $appt->service_id);
        $this->assertEquals('Mohammed Alami', $appt->guest_name);
        $this->assertEquals(14, $appt->scheduled_at->hour);
        $this->assertEquals(45, $appt->estimated_duration);
    }

    public function test_confirmation_page_displays_reservation_details(): void
    {
        $appt = Appointment::create([
            'service_id'         => $this->service->id,
            'created_by'         => $this->admin->id,
            'scheduled_at'       => Carbon::tomorrow()->setTime(14, 0),
            'estimated_duration' => 45,
            'guest_name'         => 'Fatima Zahra',
            'guest_phone'        => '0698765432',
            'status'             => Appointment::STATUS_PENDING,
            'source'             => 'online',
        ]);

        $this->get(route('reservations.confirmation', ['ulid' => $appt->ulid]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/Reservations/Confirmation')
                ->where('appointment.ulid', $appt->ulid)
                ->where('appointment.guest_name', 'Fatima Zahra')
                ->where('appointment.service.name', 'Lavage complet')
            );
    }

    // ─── RÈGLE MÉTIER : 1 service par heure ───────────────────────────────

    public function test_second_reservation_for_same_service_and_hour_is_rejected(): void
    {
        $date = Carbon::tomorrow();

        // Premier visiteur : lavage complet à 14h → OK
        $first = $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Premier visiteur',
            'guest_phone'    => '0611111111',
        ]);
        $first->assertRedirect();
        $this->assertEquals(1, Appointment::count());

        // Deuxième visiteur : MÊME service MÊME heure → rejeté
        $second = $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Deuxième visiteur',
            'guest_phone'    => '0622222222',
        ]);

        $second->assertSessionHasErrors(['scheduled_hour']);
        $this->assertEquals(1, Appointment::count(), 'Second reservation must NOT be persisted');

        // Le message d'erreur mentionne bien 14h et suggère un autre créneau
        $error = session('errors')->get('scheduled_hour')[0] ?? '';
        $this->assertStringContainsString('14h00', $error);
        $this->assertStringContainsString('autre', mb_strtolower($error));
    }

    public function test_different_hour_for_same_service_is_accepted(): void
    {
        $date = Carbon::tomorrow();

        // Visiteur A : 14h
        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Visiteur A',
            'guest_phone'    => '0611111111',
        ])->assertRedirect();

        // Visiteur B : même service, 15h → OK
        $responseB = $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 15,
            'guest_name'     => 'Visiteur B',
            'guest_phone'    => '0622222222',
        ]);

        $responseB->assertRedirect();
        $responseB->assertSessionDoesntHaveErrors();
        $this->assertEquals(2, Appointment::count());
    }

    public function test_different_service_at_same_hour_is_accepted(): void
    {
        $otherService = Service::create([
            'name'             => 'Polish carrosserie',
            'duration_minutes' => 60,
            'sort_order'       => 2,
            'is_active'        => true,
            'price_type'       => 'fixed',
            'base_price_cents' => 12000,
        ]);

        $date = Carbon::tomorrow();

        // Service A à 14h
        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Visiteur A',
            'guest_phone'    => '0611111111',
        ])->assertRedirect();

        // Service B à 14h (autre service) → OK (la règle est PAR service)
        $this->post(route('reservations.store'), [
            'service_id'     => $otherService->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Visiteur B',
            'guest_phone'    => '0622222222',
        ])->assertRedirect();

        $this->assertEquals(2, Appointment::count());
    }

    public function test_cancelled_appointment_frees_the_slot(): void
    {
        $date = Carbon::tomorrow();

        // RDV existant MAIS annulé → ne bloque pas
        Appointment::create([
            'service_id'         => $this->service->id,
            'created_by'         => $this->admin->id,
            'scheduled_at'       => $date->copy()->setTime(14, 0),
            'estimated_duration' => 45,
            'guest_name'         => 'Ancien visiteur',
            'guest_phone'        => '0611111111',
            'status'             => Appointment::STATUS_CANCELLED,
            'source'             => 'online',
        ]);

        $response = $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => $date->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Nouveau visiteur',
            'guest_phone'    => '0622222222',
        ]);

        $response->assertRedirect();
        $this->assertEquals(
            2,
            Appointment::count(),
            'Un RDV annulé ne doit pas bloquer la réservation du même créneau'
        );
    }

    // ─── Validation des champs ────────────────────────────────────────────

    public function test_store_validates_required_fields(): void
    {
        $this->post(route('reservations.store'), [])
            ->assertSessionHasErrors(['service_id', 'scheduled_date', 'scheduled_hour', 'guest_name', 'guest_phone']);
    }

    public function test_store_rejects_past_date(): void
    {
        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => Carbon::yesterday()->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Test',
            'guest_phone'    => '0611111111',
        ])->assertSessionHasErrors(['scheduled_date']);
    }

    public function test_store_rejects_hour_outside_business_hours(): void
    {
        // 05h du matin : avant l'ouverture (08h par défaut)
        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
            'scheduled_hour' => 5,
            'guest_name'     => 'Test',
            'guest_phone'    => '0611111111',
        ])->assertSessionHasErrors(['scheduled_hour']);

        // 22h : après la fermeture (21h par défaut)
        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
            'scheduled_hour' => 22,
            'guest_name'     => 'Test',
            'guest_phone'    => '0611111111',
        ])->assertSessionHasErrors(['scheduled_hour']);
    }

    public function test_store_rejects_invalid_phone(): void
    {
        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Test',
            'guest_phone'    => 'abc-def-ghij',
        ])->assertSessionHasErrors(['guest_phone']);
    }

    public function test_store_rejects_inactive_service(): void
    {
        $this->service->update(['is_active' => false]);

        $this->post(route('reservations.store'), [
            'service_id'     => $this->service->id,
            'scheduled_date' => Carbon::tomorrow()->toDateString(),
            'scheduled_hour' => 14,
            'guest_name'     => 'Test',
            'guest_phone'    => '0611111111',
        ])->assertSessionHasErrors(['service_id']);
    }

    // ─── Scope Appointment::forServiceHour ────────────────────────────────

    public function test_is_service_hour_taken_returns_true_for_overlapping_active_appointment(): void
    {
        $hour = Carbon::tomorrow()->setTime(14, 0);

        Appointment::create([
            'service_id'         => $this->service->id,
            'created_by'         => $this->admin->id,
            'scheduled_at'       => $hour,
            'estimated_duration' => 45,
            'guest_name'         => 'Test',
            'guest_phone'        => '0611111111',
            'status'             => Appointment::STATUS_PENDING,
            'source'             => 'online',
        ]);

        $this->assertTrue(Appointment::isServiceHourTaken($this->service->id, $hour));
        $this->assertFalse(Appointment::isServiceHourTaken($this->service->id, $hour->copy()->addHour()));
    }

    public function test_is_service_hour_taken_ignores_cancelled_and_completed(): void
    {
        $hour = Carbon::tomorrow()->setTime(14, 0);

        foreach ([Appointment::STATUS_CANCELLED, Appointment::STATUS_COMPLETED, Appointment::STATUS_NO_SHOW] as $status) {
            Appointment::create([
                'service_id'         => $this->service->id,
                'created_by'         => $this->admin->id,
                'scheduled_at'       => $hour,
                'estimated_duration' => 45,
                'guest_name'         => 'Test',
                'guest_phone'        => '0611111111',
                'status'             => $status,
                'source'             => 'online',
            ]);
        }

        $this->assertFalse(Appointment::isServiceHourTaken($this->service->id, $hour));
    }
}
