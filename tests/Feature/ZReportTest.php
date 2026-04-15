<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\TicketProduct;
use App\Models\TicketService;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * ZReportTest — Audit du rapport Z de fin de shift.
 *
 * Vérifie :
 * - l'accès sécurisé (caissier propriétaire ou admin)
 * - la présence des nouvelles données : recette services, recette produits,
 *   prépayés, remises, dépenses
 * - les calculs de CA net
 */
class ZReportTest extends TestCase
{
    use RefreshDatabase;

    private User $caissier;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->caissier = User::factory()->create([
            'role'      => 'caissier',
            'is_active' => true,
        ]);

        $this->admin = User::factory()->create([
            'role'      => 'admin',
            'is_active' => true,
        ]);
    }

    private function createClosedShift(User $user): Shift
    {
        return Shift::create([
            'user_id'              => $user->id,
            'opened_at'            => now()->subHours(8),
            'closed_at'            => now(),
            'opening_cash_cents'   => 50000,
            'closing_cash_cents'   => 80000,
            'expected_cash_cents'  => 80000,
            'difference_cents'     => 0,
            'is_open'              => false,
        ]);
    }

    // ─── Accès ────────────────────────────────────────────────────────────

    public function test_unauthenticated_user_is_redirected(): void
    {
        $shift = $this->createClosedShift($this->caissier);
        $this->get(route('caissier.shift.rapport', $shift))->assertRedirect(route('login'));
    }

    public function test_caissier_can_view_own_shift_rapport(): void
    {
        $shift = $this->createClosedShift($this->caissier);
        $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift))
            ->assertOk();
    }

    public function test_admin_can_view_any_shift_rapport(): void
    {
        $shift = $this->createClosedShift($this->caissier);
        $this->actingAs($this->admin)
            ->get(route('caissier.shift.rapport', $shift))
            ->assertOk();
    }

    public function test_caissier_cannot_view_other_caissier_shift(): void
    {
        $other   = User::factory()->create(['role' => 'caissier', 'is_active' => true]);
        $shift   = $this->createClosedShift($other);

        $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift))
            ->assertForbidden();
    }

    // ─── Données présentes ────────────────────────────────────────────────

    public function test_zreport_includes_services_and_products_revenue(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $shift       = $this->createClosedShift($this->caissier);

        $ticket = Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'shift_id'        => $shift->id,
            'created_by'      => $this->caissier->id,
            'subtotal_cents'  => 8000,
            'total_cents'     => 8000,
            'discount_cents'  => 0,
            'paid_at'         => now(),
        ]);

        TicketService::create([
            'ticket_id'        => $ticket->id,
            'service_name'     => 'Lavage complet',
            'unit_price_cents' => 5000,
            'quantity'         => 1,
            'discount_cents'   => 0,
            'line_total_cents' => 5000,
        ]);

        TicketProduct::create([
            'ticket_id'           => $ticket->id,
            'sellable_product_id' => 1,
            'product_name'        => 'Désodorisant',
            'unit_price_cents'    => 3000,
            'quantity'            => 1,
            'discount_cents'      => 0,
            'line_total_cents'    => 3000,
        ]);

        $response = $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(5000, $props['services_revenue']);
        $this->assertEquals(3000, $props['products_revenue']);
    }

    public function test_zreport_includes_prepaid_count(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $shift       = $this->createClosedShift($this->caissier);

        Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'shift_id'        => $shift->id,
            'created_by'      => $this->caissier->id,
            'is_prepaid'      => true,
            'total_cents'     => 5000,
            'subtotal_cents'  => 5000,
            'discount_cents'  => 0,
            'paid_at'         => now(),
        ]);

        $response = $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(1, $props['prepaid_count']);
    }

    public function test_zreport_includes_total_discounts(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $shift       = $this->createClosedShift($this->caissier);

        Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'shift_id'        => $shift->id,
            'created_by'      => $this->caissier->id,
            'subtotal_cents'  => 10000,
            'discount_cents'  => 2000,
            'total_cents'     => 8000,
            'paid_at'         => now(),
        ]);

        $response = $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(2000, $props['total_discounts']);
    }

    public function test_zreport_calculates_net_revenue_correctly(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $shift       = $this->createClosedShift($this->caissier);

        // Paiement espèces
        $ticket = Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'shift_id'        => $shift->id,
            'created_by'      => $this->caissier->id,
            'total_cents'     => 6000,
            'subtotal_cents'  => 6000,
            'discount_cents'  => 0,
            'paid_at'         => now(),
        ]);

        Payment::create([
            'ticket_id'           => $ticket->id,
            'processed_by'        => $this->caissier->id,
            'method'              => 'cash',
            'amount_cents'        => 6000,
            'amount_cash_cents'   => 6000,
            'amount_card_cents'   => 0,
            'amount_mobile_cents' => 0,
            'amount_wire_cents'   => 0,
            'change_given_cents'  => 0,
        ]);

        // Dépense
        Expense::create([
            'shift_id'     => $shift->id,
            'user_id'      => $this->caissier->id,
            'amount_cents' => 1000,
            'category'     => 'carburant',
            'label'        => 'Essence',
            'paid_with'    => 'cash',
            'date'         => today(),
        ]);

        $response = $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        // CA net = espèces collectées - dépenses (6000 - 1000 = 5000)
        $this->assertEquals(5000, $props['net_revenue']);
        $this->assertEquals(1000, $props['expenses_total']);
    }

    public function test_zreport_zero_values_when_no_tickets(): void
    {
        $shift = $this->createClosedShift($this->caissier);

        $response = $this->actingAs($this->caissier)
            ->get(route('caissier.shift.rapport', $shift));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['services_revenue']);
        $this->assertEquals(0, $props['products_revenue']);
        $this->assertEquals(0, $props['prepaid_count']);
        $this->assertEquals(0, $props['total_discounts']);
        $this->assertEquals(0, $props['net_revenue']);
    }
}
