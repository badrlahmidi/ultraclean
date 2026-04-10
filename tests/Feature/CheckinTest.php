<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CheckinTest — Valide le flux complet de création d'un ticket (check-in).
 *
 * Couvre :
 *  - Auth obligatoire
 *  - Création minimale (plaque + service)
 *  - Création avec client existant
 *  - Création avec laveur assigné (due_at calculé)
 *  - Création multi-laveur (lead + assistants)
 *  - Validation : plaque obligatoire
 *  - Validation : au moins un service obligatoire
 *  - Redirect vers Show après création
 *  - Ticket créé avec statut pending
 *  - Ticket numéro auto-généré
 */
class CheckinTest extends TestCase
{
    use RefreshDatabase;    private User $caissier;
    private User $laveur;
    private User $assistant;
    private VehicleType $vehicleType;
    private Service $service;
    private Service $serviceB; // second service for multi-line total tests

    protected function setUp(): void
    {
        parent::setUp();

        $this->caissier   = User::factory()->caissier()->create();
        $this->laveur     = User::factory()->laveur()->create();
        $this->assistant  = User::factory()->laveur()->create();
        $this->vehicleType = VehicleType::factory()->create(['name' => 'Citadine']);
        $this->service    = Service::factory()->create([
            'name'            => 'Lavage Standard',
            'base_price_cents'=> 5000,
            'duration_minutes'=> 20,
            'price_type'      => 'fixed',
            'is_active'       => true,
        ]);
        // Second service used for multi-line / total tests (3000 MAD)
        $this->serviceB = Service::factory()->create([
            'name'            => 'Aspiration Intérieure',
            'base_price_cents'=> 3000,
            'duration_minutes'=> 10,
            'price_type'      => 'fixed',
            'is_active'       => true,
        ]);
    }

    // ── Auth ─────────────────────────────────────────────────────────────

    public function test_unauthenticated_redirected_to_login(): void
    {
        $this->post(route('caissier.tickets.store'), [])
             ->assertRedirect(route('login'));
    }

    public function test_caissier_can_access_create_page(): void
    {
        $this->actingAs($this->caissier)
             ->get(route('caissier.tickets.create'))
             ->assertOk()
             ->assertInertia(fn ($page) => $page->component('Caissier/Tickets/Create'));
    }

    // ── Création minimale ────────────────────────────────────────────────

    public function test_minimal_checkin_creates_pending_ticket(): void
    {
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'    => 'AB-1234-CD',
                'vehicle_type_id'  => $this->vehicleType->id,
                'services'         => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
                'estimated_duration' => 20,
            ]
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $ticket = Ticket::where('vehicle_plate', 'AB-1234-CD')->first();
        $this->assertNotNull($ticket);
        $this->assertEquals('pending', $ticket->status);
        $this->assertNotEmpty($ticket->ticket_number);
    }

    // ── Client existant ──────────────────────────────────────────────────

    public function test_checkin_with_existing_client_links_correctly(): void
    {
        $client = Client::factory()->create(['name' => 'Ahmed Benali']);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'WW-0001-WW',
                'vehicle_type_id'    => $this->vehicleType->id,
                'client_id'          => $client->id,
                'estimated_duration' => 15,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'WW-0001-WW')->first();
        $this->assertNotNull($ticket);
        $this->assertEquals($client->id, $ticket->client_id);
    }

    // ── Laveur assigné ───────────────────────────────────────────────────

    public function test_checkin_with_washer_assigns_lead_and_computes_due_at(): void
    {
        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'ZZ-9999-ZZ',
                'vehicle_type_id'    => $this->vehicleType->id,
                'assigned_to'        => $this->laveur->id,
                'estimated_duration' => 30,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'ZZ-9999-ZZ')->first();
        $this->assertNotNull($ticket);
        $this->assertEquals($this->laveur->id, $ticket->assigned_to);
        $this->assertNotNull($ticket->due_at);
        $this->assertTrue($ticket->due_at->gt(now()));

        // Lead enregistré dans ticket_washers
        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id'   => $this->laveur->id,
            'role'      => 'lead',
        ]);
    }

    // ── Multi-laveur : lead + assistants ─────────────────────────────────

    public function test_checkin_with_lead_and_assistant_creates_pivot_rows(): void
    {
        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'ML-2000-ML',
                'vehicle_type_id'    => $this->vehicleType->id,
                'assigned_to'        => $this->laveur->id,
                'assistant_ids'      => [$this->assistant->id],
                'estimated_duration' => 25,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'ML-2000-ML')->first();
        $this->assertNotNull($ticket);

        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id'   => $this->laveur->id,
            'role'      => 'lead',
        ]);

        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id'   => $this->assistant->id,
            'role'      => 'assistant',
        ]);
    }

    public function test_lead_not_duplicated_as_assistant(): void
    {
        // Si le lead se retrouve aussi dans assistant_ids → ne doit PAS créer 2 lignes
        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'DUP-001',
                'vehicle_type_id'    => $this->vehicleType->id,
                'assigned_to'        => $this->laveur->id,
                'assistant_ids'      => [$this->laveur->id], // doublon lead
                'estimated_duration' => 20,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'DUP-001')->first();
        $this->assertNotNull($ticket);

        // Une seule ligne pour le laveur
        $count = \App\Models\TicketWasher::where('ticket_id', $ticket->id)
            ->where('user_id', $this->laveur->id)
            ->count();

        $this->assertEquals(1, $count);
    }    // ── Validation ───────────────────────────────────────────────────────

    /**
     * vehicle_plate is intentionally NULLABLE (walk-in vehicles may skip plate entry).
     * Tickets must still be creatable without a plate.
     */
    public function test_missing_vehicle_plate_is_allowed(): void
    {
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 20,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        // No validation error expected for missing plate
        $response->assertSessionMissing('errors');
        $this->assertDatabaseHas('tickets', ['vehicle_plate' => null]);
    }

    public function test_missing_services_fails_validation(): void
    {
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'XX-1111-XX',
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 20,
                'services'           => [],
            ]
        );

        $response->assertSessionHasErrors('services');
    }    // ── Total calculé ─────────────────────────────────────────────────────

    /**
     * Two distinct services: 5000 + 3000 = 8000 centimes.
     * Each line submits the canonical server price so validatePrices() passes.
     */
    public function test_ticket_total_cents_calculated_correctly(): void
    {
        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'TOT-001',
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 20,
                'services'           => [
                    [
                        'service_id'       => $this->service->id,   // base = 5000
                        'unit_price_cents' => 5000,
                        'quantity'         => 1,
                        'discount_cents'   => 0,
                    ],
                    [
                        'service_id'       => $this->serviceB->id,  // base = 3000
                        'unit_price_cents' => 3000,
                        'quantity'         => 1,
                        'discount_cents'   => 0,
                    ],
                ],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'TOT-001')->first();
        $this->assertNotNull($ticket, 'Ticket should have been created');
        $this->assertEquals(8000, $ticket->total_cents);
    }

    // ── Price-injection security (F-01 / Phase A audit fix) ──────────────

    /**
     * SECURITY: Submitting a tampered unit_price_cents must return 422.
     * The server rejects any price that does not match PricingService::resolveUnitPrice().
     */
    public function test_tampered_price_is_rejected_with_422(): void
    {
        // service has base_price_cents = 5000; attacker submits 1 centime
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'HACK-001',
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 20,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 1, // ← tampered price
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        // Must receive validation error — ticket must NOT be created
        $response->assertSessionHasErrors('services');
        $this->assertDatabaseMissing('tickets', ['vehicle_plate' => 'HACK-001']);
    }

    /**
     * SECURITY: Zero-price for a free service (base_price_cents = 0) is allowed.
     * This ensures the guard does not block legitimate free services.
     */
    public function test_zero_price_for_free_service_is_accepted(): void
    {
        $freeService = Service::factory()->create([
            'name'             => 'Café offert',
            'base_price_cents' => 0,
            'price_type'       => 'fixed',
            'is_active'        => true,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'FREE-001',
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 5,
                'services'           => [[
                    'service_id'       => $freeService->id,
                    'unit_price_cents' => 0, // correct canonical price
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $response->assertSessionMissing('errors');
        $this->assertDatabaseHas('tickets', ['vehicle_plate' => 'FREE-001']);
    }

    /**
     * SECURITY: Tampered price on UPDATE must also be rejected.
     * syncServiceLines() shares the same validatePrices() guard.
     */
    public function test_tampered_price_on_update_is_rejected(): void
    {
        // First create a valid ticket
        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'UPD-HACK',
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 20,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'UPD-HACK')->firstOrFail();

        // Now try to update with a tampered price
        $response = $this->actingAs($this->caissier)->put(
            route('caissier.tickets.update', $ticket->ulid),
            [
                'services' => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 1, // ← tampered
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $response->assertSessionHasErrors('services');
        // Total must still be original 5000
        $this->assertEquals(5000, $ticket->fresh()->total_cents);
    }

    // ── Numéro de ticket ──────────────────────────────────────────────────

    public function test_ticket_number_is_unique_across_tickets(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($this->caissier)->post(
                route('caissier.tickets.store'),
                [
                    'vehicle_plate'      => "UNIQ-{$i}",
                    'vehicle_type_id'    => $this->vehicleType->id,
                    'estimated_duration' => 20,
                    'services'           => [[
                        'service_id'       => $this->service->id,
                        'unit_price_cents' => 5000,
                        'quantity'         => 1,
                        'discount_cents'   => 0,
                    ]],
                ]
            );
        }

        $numbers = Ticket::pluck('ticket_number')->toArray();
        $this->assertEquals(count($numbers), count(array_unique($numbers)));
    }

    // ── Redirect ──────────────────────────────────────────────────────────

    public function test_store_redirects_to_show_page(): void
    {
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.store'),
            [
                'vehicle_plate'      => 'RED-1234',
                'vehicle_type_id'    => $this->vehicleType->id,
                'estimated_duration' => 20,
                'services'           => [[
                    'service_id'       => $this->service->id,
                    'unit_price_cents' => 5000,
                    'quantity'         => 1,
                    'discount_cents'   => 0,
                ]],
            ]
        );

        $ticket = Ticket::where('vehicle_plate', 'RED-1234')->first();
        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
    }
}
