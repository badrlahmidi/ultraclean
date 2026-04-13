<?php

namespace Tests\Feature;

use App\DTOs\CreateTicketDTO;
use App\DTOs\ServiceLineDTO;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use App\Models\VehicleType;
use App\Services\TicketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * TicketCreationFlowTest — Tests for atomic ticket creation.
 *
 * AUDIT-FIX: Added tests to verify transaction rollback behavior.
 */
class TicketCreationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_ticket_creation_is_atomic(): void
    {
        $caissier = User::factory()->caissier()->create();
        $laveur = User::factory()->laveur()->create();
        $vehicleType = VehicleType::factory()->create();
        $service = Service::factory()->create(['base_price_cents' => 5000]);

        $dto = new CreateTicketDTO(
            vehiclePlate: 'TEST-123',
            services: [
                new ServiceLineDTO(
                    serviceId: $service->id,
                    unitPriceCents: 5000,
                    quantity: 1,
                    discountCents: 0,
                    priceVariantId: null,
                ),
            ],
            vehicleTypeId: $vehicleType->id,
            assignedTo: $laveur->id,
            assistantIds: [],
            notes: 'Test ticket',
        );

        $ticketService = app(TicketService::class);
        $ticket = $ticketService->create($dto, $caissier);

        // Verify ticket was created
        $this->assertDatabaseHas('tickets', [
            'id' => $ticket->id,
            'vehicle_plate' => 'TEST-123',
        ]);

        // Verify service line was attached
        $this->assertDatabaseHas('ticket_services', [
            'ticket_id' => $ticket->id,
            'service_id' => $service->id,
        ]);

        // Verify washer was assigned
        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id' => $laveur->id,
            'role' => TicketWasher::ROLE_LEAD,
        ]);
    }

    public function test_ticket_creation_with_multiple_assistants(): void
    {
        $caissier = User::factory()->caissier()->create();
        $lead = User::factory()->laveur()->create();
        $assistant1 = User::factory()->laveur()->create();
        $assistant2 = User::factory()->laveur()->create();
        $vehicleType = VehicleType::factory()->create();
        $service = Service::factory()->create(['base_price_cents' => 5000]);

        $dto = new CreateTicketDTO(
            vehiclePlate: 'MULTI-123',
            services: [
                new ServiceLineDTO(
                    serviceId: $service->id,
                    unitPriceCents: 5000,
                    quantity: 1,
                    discountCents: 0,
                    priceVariantId: null,
                ),
            ],
            vehicleTypeId: $vehicleType->id,
            assignedTo: $lead->id,
            assistantIds: [$assistant1->id, $assistant2->id],
        );

        $ticketService = app(TicketService::class);
        $ticket = $ticketService->create($dto, $caissier);

        // Verify all washers were assigned
        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id' => $lead->id,
            'role' => TicketWasher::ROLE_LEAD,
        ]);

        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id' => $assistant1->id,
            'role' => TicketWasher::ROLE_ASSISTANT,
        ]);

        $this->assertDatabaseHas('ticket_washers', [
            'ticket_id' => $ticket->id,
            'user_id' => $assistant2->id,
            'role' => TicketWasher::ROLE_ASSISTANT,
        ]);

        // Total 3 washers assigned
        $this->assertEquals(3, TicketWasher::where('ticket_id', $ticket->id)->count());
    }

    public function test_ticket_creation_validates_prices(): void
    {
        $caissier = User::factory()->caissier()->create();
        $vehicleType = VehicleType::factory()->create();
        $service = Service::factory()->create([
            'base_price_cents' => 5000,
            'price_type' => 'fixed',
        ]);

        // Submit with tampered price
        $dto = new CreateTicketDTO(
            vehiclePlate: 'TAMPER-123',
            services: [
                new ServiceLineDTO(
                    serviceId: $service->id,
                    unitPriceCents: 1000, // Tampered: should be 5000
                    quantity: 1,
                    discountCents: 0,
                    priceVariantId: null,
                ),
            ],
            vehicleTypeId: $vehicleType->id,
        );

        $ticketService = app(TicketService::class);

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $ticketService->create($dto, $caissier);

        // Ensure no ticket was created (transaction rolled back)
        $this->assertDatabaseMissing('tickets', [
            'vehicle_plate' => 'TAMPER-123',
        ]);
    }
}
