<?php

namespace Tests\Unit;

use App\Models\Ticket;
use App\Models\TicketProduct;
use App\Models\TicketService;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * TicketRecalculateTotalsTest — Unit-level audit of Ticket::recalculateTotals().
 *
 * Couvre :
 *  - recalculateTotals() avec services uniquement
 *  - recalculateTotals() avec produits uniquement
 *  - recalculateTotals() avec services + produits combinés
 *  - recalculateTotals() avec remise % intelligente (appliquée sur subtotal services+produits)
 *  - recalculateTotals() avec remise fixe
 *  - recalculateTotals() — remise ne peut pas rendre le total négatif
 *  - recalculateTotals() avec produits gratuits (is_free = true) : exclus du total
 *  - recalculateTotals() sans lignes — total = 0
 */
class TicketRecalculateTotalsTest extends TestCase
{
    use RefreshDatabase;

    private Ticket $ticket;

    protected function setUp(): void
    {
        parent::setUp();

        $vehicleType = VehicleType::factory()->create();
        $caissier    = User::factory()->caissier()->create();

        $this->ticket = Ticket::factory()->create([
            'vehicle_type_id' => $vehicleType->id,
            'created_by'      => $caissier->id,
            'subtotal_cents'  => 0,
            'discount_cents'  => 0,
            'total_cents'     => 0,
            'discount_type'   => null,
            'discount_value'  => null,
        ]);
    }

    // ─── Services only ────────────────────────────────────────────────────

    public function test_services_only_computes_correct_subtotal(): void
    {
        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Lavage extérieur',
            'unit_price_cents' => 5000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 5000,
        ]);

        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Aspiration',
            'unit_price_cents' => 3000,
            'quantity'         => 2,
            'discount_cents'   => 0,
            'line_total_cents' => 6000,
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertEquals(11000, $fresh->subtotal_cents);
        $this->assertEquals(0,     $fresh->discount_cents);
        $this->assertEquals(11000, $fresh->total_cents);
    }

    // ─── Products only ────────────────────────────────────────────────────

    public function test_products_only_computes_correct_subtotal(): void
    {
        TicketProduct::create([
            'ticket_id'           => $this->ticket->id,
            'sellable_product_id' => 1,
            'product_name'        => 'Désodorisant',
            'unit_price_cents'    => 2000,
            'quantity'            => 1,
            'discount_cents'      => 0,
            'line_total_cents'    => 2000,
            'is_free'             => false,
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertEquals(2000, $fresh->subtotal_cents);
        $this->assertEquals(0,    $fresh->discount_cents);
        $this->assertEquals(2000, $fresh->total_cents);
    }

    // ─── Services + Products combined ────────────────────────────────────

    public function test_services_and_products_combined(): void
    {
        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Lavage complet',
            'unit_price_cents' => 6000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 6000,
        ]);

        TicketProduct::create([
            'ticket_id'           => $this->ticket->id,
            'sellable_product_id' => 1,
            'product_name'        => 'Cire premium',
            'unit_price_cents'    => 4000,
            'quantity'            => 1,
            'discount_cents'      => 0,
            'line_total_cents'    => 4000,
            'is_free'             => false,
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertEquals(10000, $fresh->subtotal_cents);
        $this->assertEquals(0,     $fresh->discount_cents);
        $this->assertEquals(10000, $fresh->total_cents);
    }

    // ─── Percent discount ─────────────────────────────────────────────────

    public function test_percent_discount_applied_on_combined_subtotal(): void
    {
        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Lavage',
            'unit_price_cents' => 8000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 8000,
        ]);

        TicketProduct::create([
            'ticket_id'           => $this->ticket->id,
            'sellable_product_id' => 1,
            'product_name'        => 'Produit',
            'unit_price_cents'    => 2000,
            'quantity'            => 1,
            'discount_cents'      => 0,
            'line_total_cents'    => 2000,
            'is_free'             => false,
        ]);

        // 10% discount on 10000 subtotal → discount = 1000 → total = 9000
        $this->ticket->update([
            'discount_type'  => 'percent',
            'discount_value' => 10,
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertEquals(10000, $fresh->subtotal_cents);
        $this->assertEquals(1000,  $fresh->discount_cents);  // 10% of 10000
        $this->assertEquals(9000,  $fresh->total_cents);
    }

    // ─── Fixed discount ───────────────────────────────────────────────────

    public function test_fixed_discount_applied_correctly(): void
    {
        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Service',
            'unit_price_cents' => 10000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 10000,
        ]);

        // Fixed discount of 30 MAD → 3000 cents
        $this->ticket->update([
            'discount_type'  => 'fixed',
            'discount_value' => 30,  // MAD
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertEquals(10000, $fresh->subtotal_cents);
        $this->assertEquals(3000,  $fresh->discount_cents);  // 30 MAD in cents
        $this->assertEquals(7000,  $fresh->total_cents);
    }

    // ─── Discount cannot make total negative ──────────────────────────────

    public function test_discount_cannot_make_total_negative(): void
    {
        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Service',
            'unit_price_cents' => 5000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 5000,
        ]);

        // Fixed discount larger than subtotal
        $this->ticket->update([
            'discount_type'  => 'fixed',
            'discount_value' => 200,  // 200 MAD > 50 MAD subtotal
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertGreaterThanOrEqual(0, $fresh->total_cents);
        $this->assertEquals(0, $fresh->total_cents);
    }

    // ─── Free products are excluded from total ────────────────────────────

    public function test_free_products_excluded_from_total(): void
    {
        TicketService::create([
            'ticket_id'        => $this->ticket->id,
            'service_name'     => 'Lavage',
            'unit_price_cents' => 5000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 5000,
        ]);

        TicketProduct::create([
            'ticket_id'           => $this->ticket->id,
            'sellable_product_id' => 1,
            'product_name'        => 'Cadeau client',
            'unit_price_cents'    => 3000,
            'quantity'            => 1,
            'discount_cents'      => 0,
            'line_total_cents'    => 0,   // is_free = true → 0
            'is_free'             => true,
        ]);

        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        // is_free product has line_total = 0, so subtotal = service only = 5000
        $this->assertEquals(5000, $fresh->subtotal_cents);
        $this->assertEquals(5000, $fresh->total_cents);
    }

    // ─── No lines ─────────────────────────────────────────────────────────

    public function test_no_lines_gives_zero_total(): void
    {
        $this->ticket->recalculateTotals();
        $fresh = $this->ticket->fresh();

        $this->assertEquals(0, $fresh->subtotal_cents);
        $this->assertEquals(0, $fresh->discount_cents);
        $this->assertEquals(0, $fresh->total_cents);
    }
}
