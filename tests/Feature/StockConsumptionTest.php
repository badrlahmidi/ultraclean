<?php

namespace Tests\Feature;

use App\Actions\ProcessPaymentAction;
use App\DTOs\ProcessPaymentDTO;
use App\Exceptions\InsufficientStockException;
use App\Models\Service;
use App\Models\StockProduct;
use App\Models\Ticket;
use App\Models\TicketService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * StockConsumptionTest — Tests for stock validation during payment.
 *
 * AUDIT-FIX: Added tests for the new stock validation logic.
 */
class StockConsumptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_proceeds_with_warning_when_stock_insufficient_and_strict_mode_disabled(): void
    {
        config(['stock.strict_mode' => false]);

        $caissier = User::factory()->caissier()->create();
        $this->actingAs($caissier);

        // Create a product with low stock
        $product = StockProduct::factory()->create([
            'current_quantity' => 1,
            'min_quantity' => 5,
        ]);

        // Create a service that requires the product
        $service = Service::factory()->create();
        $service->stockProducts()->attach($product->id, ['quantity_per_use' => 5]);

        // Create a completed ticket with this service
        $ticket = Ticket::factory()->completed()->create();
        TicketService::create([
            'ticket_id' => $ticket->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'unit_price_cents' => 5000,
            'quantity' => 1,
            'discount_cents' => 0,
        ]);

        $dto = new ProcessPaymentDTO(
            method: 'cash',
            amountCashCents: $ticket->total_cents,
            amountCardCents: 0,
            amountMobileCents: 0,
            amountWireCents: 0,
            note: null,
        );

        $action = new ProcessPaymentAction();
        $result = $action->execute($ticket, $dto, $caissier->id);

        // Payment should succeed
        $this->assertEquals('paid', $result['target_status']);

        // Ticket should have warning flag
        $ticket->refresh();
        $this->assertTrue($ticket->has_stock_warning);
    }

    public function test_payment_fails_when_stock_insufficient_and_strict_mode_enabled(): void
    {
        config(['stock.strict_mode' => true]);

        $caissier = User::factory()->caissier()->create();
        $this->actingAs($caissier);

        // Create a product with low stock
        $product = StockProduct::factory()->create([
            'current_quantity' => 1,
            'min_quantity' => 5,
        ]);

        // Create a service that requires the product
        $service = Service::factory()->create();
        $service->stockProducts()->attach($product->id, ['quantity_per_use' => 5]);

        // Create a completed ticket with this service
        $ticket = Ticket::factory()->completed()->create();
        TicketService::create([
            'ticket_id' => $ticket->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'unit_price_cents' => 5000,
            'quantity' => 1,
            'discount_cents' => 0,
        ]);

        $dto = new ProcessPaymentDTO(
            method: 'cash',
            amountCashCents: $ticket->total_cents,
            amountCardCents: 0,
            amountMobileCents: 0,
            amountWireCents: 0,
            note: null,
        );

        $action = new ProcessPaymentAction();

        $this->expectException(InsufficientStockException::class);
        $action->execute($ticket, $dto, $caissier->id);
    }

    public function test_payment_consumes_stock_when_sufficient(): void
    {
        config(['stock.strict_mode' => false]);

        $caissier = User::factory()->caissier()->create();
        $this->actingAs($caissier);

        // Create a product with sufficient stock
        $product = StockProduct::factory()->create([
            'current_quantity' => 10,
            'min_quantity' => 5,
        ]);

        // Create a service that requires the product
        $service = Service::factory()->create();
        $service->stockProducts()->attach($product->id, ['quantity_per_use' => 2]);

        // Create a completed ticket with this service
        $ticket = Ticket::factory()->completed()->create();
        TicketService::create([
            'ticket_id' => $ticket->id,
            'service_id' => $service->id,
            'service_name' => $service->name,
            'unit_price_cents' => 5000,
            'quantity' => 1,
            'discount_cents' => 0,
        ]);

        $dto = new ProcessPaymentDTO(
            method: 'cash',
            amountCashCents: $ticket->total_cents,
            amountCardCents: 0,
            amountMobileCents: 0,
            amountWireCents: 0,
            note: null,
        );

        $action = new ProcessPaymentAction();
        $result = $action->execute($ticket, $dto, $caissier->id);

        // Payment should succeed
        $this->assertEquals('paid', $result['target_status']);

        // Stock should be decremented
        $product->refresh();
        $this->assertEquals(8, $product->current_quantity);

        // Ticket should NOT have warning flag
        $ticket->refresh();
        $this->assertFalse($ticket->has_stock_warning);
    }
}
