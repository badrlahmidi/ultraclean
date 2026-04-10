<?php

namespace Tests\Unit;

use App\Actions\ProcessPaymentAction;
use App\DTOs\CreateTicketDTO;
use App\DTOs\ProcessPaymentDTO;
use App\DTOs\ServiceLineDTO;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Service;
use App\Models\ServiceVehiclePrice;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Services\PricingService;
use App\Services\TicketService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceArchitectureTest extends TestCase
{
    use RefreshDatabase;

    // ─── DTO Tests ──────────────────────────────────────────────────────

    public function test_service_line_dto_from_array(): void
    {
        $dto = ServiceLineDTO::fromArray([
            'service_id'      => 1,
            'unit_price_cents' => 5000,
            'quantity'         => 2,
            'discount_cents'   => 500,
            'price_variant_id' => 3,
        ]);

        $this->assertSame(1, $dto->serviceId);
        $this->assertSame(5000, $dto->unitPriceCents);
        $this->assertSame(2, $dto->quantity);
        $this->assertSame(500, $dto->discountCents);
        $this->assertSame(3, $dto->priceVariantId);
    }

    public function test_service_line_dto_defaults(): void
    {
        $dto = ServiceLineDTO::fromArray([
            'service_id'       => 1,
            'unit_price_cents' => 3000,
        ]);

        $this->assertSame(1, $dto->quantity);
        $this->assertSame(0, $dto->discountCents);
        $this->assertNull($dto->priceVariantId);
    }

    public function test_create_ticket_dto_immutable(): void
    {
        $dto = new CreateTicketDTO(
            vehiclePlate: 'ABC-123',
            services:     [new ServiceLineDTO(1, 5000)],
            clientId:     42,
            notes:        'Test note',
        );

        $this->assertSame('ABC-123', $dto->vehiclePlate);
        $this->assertCount(1, $dto->services);
        $this->assertSame(42, $dto->clientId);
        $this->assertSame('Test note', $dto->notes);
        $this->assertNull($dto->assignedTo);
    }

    public function test_process_payment_dto_construction(): void
    {
        $dto = new ProcessPaymentDTO(
            method:         'mixed',
            amountCashCents: 3000,
            amountCardCents: 2000,
        );

        $this->assertSame('mixed', $dto->method);
        $this->assertSame(3000, $dto->amountCashCents);
        $this->assertSame(2000, $dto->amountCardCents);
        $this->assertSame(0, $dto->amountMobileCents);
        $this->assertSame(0, $dto->amountWireCents);
        $this->assertNull($dto->note);
    }

    // ─── PricingService Tests ───────────────────────────────────────────

    public function test_pricing_service_resolve_fixed_price(): void
    {
        $service = Service::factory()->create([
            'price_type'      => 'fixed',
            'base_price_cents' => 5000,
        ]);

        $price = PricingService::resolveUnitPrice($service->id);
        $this->assertSame(5000, $price);
    }    public function test_pricing_service_resolve_variant_price(): void
    {
        $service     = Service::factory()->create(['price_type' => 'variant', 'base_price_cents' => 0]);
        $vehicleType = VehicleType::factory()->create();

        ServiceVehiclePrice::create([
            'service_id'      => $service->id,
            'vehicle_type_id' => $vehicleType->id,
            'price_cents'     => 7500,
        ]);

        $price = PricingService::resolveUnitPrice($service->id, $vehicleType->id);
        $this->assertSame(7500, $price);
    }

    public function test_pricing_service_fallback_to_base_price(): void
    {
        $service = Service::factory()->create([
            'price_type'       => 'variant',
            'base_price_cents' => 3000,
        ]);

        // No vehicle type price exists, fallback to base
        $price = PricingService::resolveUnitPrice($service->id, 9999);
        $this->assertSame(3000, $price);
    }

    public function test_pricing_service_line_total(): void
    {
        $this->assertSame(9500, PricingService::lineTotal(5000, 2, 500));
        $this->assertSame(5000, PricingService::lineTotal(5000, 1, 0));
        $this->assertSame(0, PricingService::lineTotal(1000, 1, 2000)); // Never negative
    }

    public function test_pricing_service_subtotal(): void
    {
        $lines = [
            new ServiceLineDTO(1, 5000, 2, 500),   // 9500
            new ServiceLineDTO(2, 3000, 1, 0),      // 3000
        ];

        $this->assertSame(12500, PricingService::subtotal($lines));
    }

    public function test_pricing_service_validate_prices_ok(): void
    {
        $service = Service::factory()->create([
            'price_type'       => 'fixed',
            'base_price_cents' => 5000,
        ]);

        $lines = [new ServiceLineDTO($service->id, 5000)];
        $mismatches = PricingService::validatePrices($lines);

        $this->assertTrue($mismatches->isEmpty());
    }

    public function test_pricing_service_validate_prices_mismatch(): void
    {
        $service = Service::factory()->create([
            'price_type'       => 'fixed',
            'base_price_cents' => 5000,
        ]);

        $lines = [new ServiceLineDTO($service->id, 9999)]; // Wrong price
        $mismatches = PricingService::validatePrices($lines);

        $this->assertCount(1, $mismatches);
        $this->assertStringContainsString('9999', $mismatches->first());
    }    public function test_pricing_service_build_price_grid(): void
    {
        $service     = Service::factory()->create(['price_type' => 'variant']);
        $vehicleType = VehicleType::factory()->create();
        ServiceVehiclePrice::create([
            'service_id'      => $service->id,
            'vehicle_type_id' => $vehicleType->id,
            'price_cents'     => 8000,
        ]);

        $services = Service::with('prices')->get();
        $grid = PricingService::buildPriceGrid($services);

        $this->assertArrayHasKey($service->id, $grid);
        $this->assertSame(8000, $grid[$service->id][$vehicleType->id]);
    }

    // ─── TicketService Tests ────────────────────────────────────────────

    public function test_ticket_service_creates_ticket(): void
    {
        $creator = User::factory()->create(['role' => 'caissier']);
        $service = Service::factory()->create(['base_price_cents' => 5000, 'price_type' => 'fixed']);

        $dto = new CreateTicketDTO(
            vehiclePlate: 'TEST-001',
            services:     [new ServiceLineDTO($service->id, 5000)],
        );

        $ticket = app(TicketService::class)->create($dto, $creator);

        $this->assertInstanceOf(Ticket::class, $ticket);
        $this->assertSame('TEST-001', $ticket->vehicle_plate);
        $this->assertSame(Ticket::STATUS_PENDING, $ticket->status);
        $this->assertSame($creator->id, $ticket->created_by);
        $this->assertNotNull($ticket->ticket_number);
        $this->assertNotNull($ticket->ulid);
    }

    public function test_ticket_service_attaches_service_lines(): void
    {
        $creator = User::factory()->create(['role' => 'caissier']);
        $svc1    = Service::factory()->create(['base_price_cents' => 3000, 'price_type' => 'fixed']);
        $svc2    = Service::factory()->create(['base_price_cents' => 2000, 'price_type' => 'fixed']);

        $dto = new CreateTicketDTO(
            vehiclePlate: 'TEST-002',
            services: [
                new ServiceLineDTO($svc1->id, 3000, 1),
                new ServiceLineDTO($svc2->id, 2000, 2),
            ],
        );

        $ticket = app(TicketService::class)->create($dto, $creator);

        $this->assertCount(2, $ticket->services);
        $this->assertSame(7000, $ticket->total_cents); // 3000 + 2*2000
    }

    public function test_ticket_service_assigns_washers(): void
    {
        $creator   = User::factory()->create(['role' => 'caissier']);
        $lead      = User::factory()->create(['role' => 'laveur']);
        $assistant = User::factory()->create(['role' => 'laveur']);
        $service   = Service::factory()->create(['base_price_cents' => 5000, 'price_type' => 'fixed']);

        $dto = new CreateTicketDTO(
            vehiclePlate: 'TEST-003',
            services:     [new ServiceLineDTO($service->id, 5000)],
            assignedTo:   $lead->id,
            assistantIds: [$assistant->id],
        );

        $ticket = app(TicketService::class)->create($dto, $creator);

        $this->assertSame($lead->id, $ticket->assigned_to);
        // Count via TicketWasher model (not BelongsToMany, since TicketWasher extends Model not Pivot)
        $this->assertSame(2, TicketWasher::where('ticket_id', $ticket->id)->count());
    }

    public function test_ticket_service_builds_brand_snapshot(): void
    {
        $creator = User::factory()->create(['role' => 'caissier']);
        $service = Service::factory()->create(['base_price_cents' => 5000, 'price_type' => 'fixed']);
        $brand   = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $model   = VehicleModel::factory()->create(['name' => 'Corolla', 'brand_id' => $brand->id]);

        $dto = new CreateTicketDTO(
            vehiclePlate:  'TEST-004',
            services:      [new ServiceLineDTO($service->id, 5000)],
            vehicleBrandId: $brand->id,
            vehicleModelId: $model->id,
        );

        $ticket = app(TicketService::class)->create($dto, $creator);

        $this->assertSame('Toyota Corolla', $ticket->vehicle_brand);
    }

    // ─── ProcessPaymentAction Tests ─────────────────────────────────────

    public function test_process_payment_action_cash(): void
    {
        $operator = User::factory()->create(['role' => 'caissier']);
        $this->actingAs($operator);

        $service = Service::factory()->create(['base_price_cents' => 5000, 'price_type' => 'fixed']);
        $ticket  = Ticket::factory()->create([
            'status'      => Ticket::STATUS_COMPLETED,
            'total_cents' => 5000,
        ]);

        $dto = new ProcessPaymentDTO(method: 'cash');

        $result = app(ProcessPaymentAction::class)->execute($ticket, $dto, $operator->id);

        $this->assertInstanceOf(Payment::class, $result['payment']);
        $this->assertSame(0, $result['change_cents']);
        $this->assertStringContainsString('Espèces', $result['message']);

        $ticket->refresh();
        $this->assertSame(Ticket::STATUS_PAID, $ticket->status);
    }

    public function test_process_payment_action_insufficient_amount(): void
    {
        $operator = User::factory()->create(['role' => 'caissier']);
        $this->actingAs($operator);

        $ticket = Ticket::factory()->create([
            'status'      => Ticket::STATUS_COMPLETED,
            'total_cents' => 10000,
        ]);

        $dto = new ProcessPaymentDTO(
            method:         'mixed',
            amountCashCents: 3000,
            amountCardCents: 2000,
        );

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        app(ProcessPaymentAction::class)->execute($ticket, $dto, $operator->id);
    }    public function test_process_payment_action_card(): void
    {
        $operator = User::factory()->create(['role' => 'caissier']);
        $this->actingAs($operator);

        $ticket = Ticket::factory()->create([
            'status'      => Ticket::STATUS_COMPLETED,
            'total_cents' => 5000,
        ]);

        $dto = new ProcessPaymentDTO(method: 'card');

        $result = app(ProcessPaymentAction::class)->execute($ticket, $dto, $operator->id);

        $this->assertInstanceOf(Payment::class, $result['payment']);
        $this->assertSame(5000, $result['payment']->amount_cents);
        $this->assertSame(0, $result['change_cents']);
        $this->assertStringContainsString('Carte', $result['message']);

        $ticket->refresh();
        $this->assertSame(Ticket::STATUS_PAID, $ticket->status);
    }

    public function test_process_payment_action_with_change(): void
    {
        $operator = User::factory()->create(['role' => 'caissier']);
        $this->actingAs($operator);

        $ticket = Ticket::factory()->create([
            'status'      => Ticket::STATUS_COMPLETED,
            'total_cents' => 4500,
        ]);

        // Cash payment: system sets full amount to total_cents, so change is 0
        // For actual change, use mixed with overpayment
        $dto = new ProcessPaymentDTO(
            method:          'mixed',
            amountCashCents:  5000,
        );

        $result = app(ProcessPaymentAction::class)->execute($ticket, $dto, $operator->id);

        $this->assertSame(500, $result['change_cents']);
        $this->assertStringContainsString('Rendu', $result['message']);
    }

    public function test_process_payment_awards_loyalty_points(): void
    {
        $operator = User::factory()->create(['role' => 'caissier']);
        $this->actingAs($operator);

        $client = Client::factory()->create(['loyalty_points' => 0]);

        $ticket = Ticket::factory()->create([
            'status'      => Ticket::STATUS_COMPLETED,
            'total_cents' => 10000, // 100 MAD = 10 points
            'client_id'   => $client->id,
        ]);

        $dto = new ProcessPaymentDTO(method: 'cash');

        $result = app(ProcessPaymentAction::class)->execute($ticket, $dto, $operator->id);

        $this->assertSame(10, $result['points_earned']);
        $this->assertStringContainsString('fidélité', $result['message']);
    }
}
