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
 * ReportsControllerTest — Audit des rapports admin.
 *
 * Vérifie :
 * - l'accès aux rapports (admin seulement)
 * - la présence des nouvelles données : recette services, recette produits,
 *   prépayés, remises, top produits
 * - l'export CSV contenant les sections attendues
 */
class ReportsControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role'      => 'admin',
            'is_active' => true,
        ]);
    }

    // ─── Accès ────────────────────────────────────────────────────────────

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get(route('admin.reports.index'))->assertRedirect(route('login'));
    }

    public function test_admin_can_access_reports(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.reports.index'))
            ->assertOk();
    }

    // ─── Données présentes ────────────────────────────────────────────────

    public function test_reports_index_returns_services_and_products_revenue(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $caissier    = User::factory()->create(['role' => 'caissier', 'is_active' => true]);

        // Ticket payé avec services
        $ticket = Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'created_by'      => $caissier->id,
            'subtotal_cents'  => 8000,
            'total_cents'     => 8000,
            'discount_cents'  => 0,
            'paid_at'         => now(),
        ]);

        TicketService::create([
            'ticket_id'        => $ticket->id,
            'service_name'     => 'Lavage extérieur',
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

        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['period' => 'month']));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(5000, $props['servicesRevenue']);
        $this->assertEquals(3000, $props['productsRevenue']);
    }

    public function test_reports_index_returns_prepaid_stats(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $caissier    = User::factory()->create(['role' => 'caissier', 'is_active' => true]);

        Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'created_by'      => $caissier->id,
            'is_prepaid'      => true,
            'total_cents'     => 6000,
            'subtotal_cents'  => 6000,
            'discount_cents'  => 0,
            'paid_at'         => now(),
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['period' => 'month']));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(1, $props['prepaidStats']['count']);
        $this->assertEquals(6000, $props['prepaidStats']['revenue']);
    }

    public function test_reports_index_returns_total_discounts(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $caissier    = User::factory()->create(['role' => 'caissier', 'is_active' => true]);

        Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'created_by'      => $caissier->id,
            'subtotal_cents'  => 10000,
            'discount_cents'  => 1500,
            'total_cents'     => 8500,
            'paid_at'         => now(),
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['period' => 'month']));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(1500, $props['totalDiscounts']);
    }

    public function test_reports_index_returns_top_products(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $caissier    = User::factory()->create(['role' => 'caissier', 'is_active' => true]);

        $ticket = Ticket::factory()->paid()->create([
            'vehicle_type_id' => $vehicleType->id,
            'created_by'      => $caissier->id,
            'total_cents'     => 2000,
            'subtotal_cents'  => 2000,
            'discount_cents'  => 0,
            'paid_at'         => now(),
        ]);

        TicketProduct::create([
            'ticket_id'           => $ticket->id,
            'sellable_product_id' => 1,
            'product_name'        => 'Cire premium',
            'unit_price_cents'    => 2000,
            'quantity'            => 1,
            'discount_cents'      => 0,
            'line_total_cents'    => 2000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['period' => 'month']));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertNotEmpty($props['topProducts']);
        $this->assertEquals('Cire premium', $props['topProducts'][0]->name ?? $props['topProducts'][0]['name'] ?? null);
    }

    // ─── Export CSV ────────────────────────────────────────────────────────

    public function test_csv_export_contains_products_section(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.export.csv', ['period' => 'month']));

        $response->assertOk();
        $this->assertStringContainsString('TOP PRODUITS', $response->getContent());
    }

    public function test_csv_export_contains_prepaid_and_discounts(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.export.csv', ['period' => 'month']));

        $response->assertOk();
        $content = $response->getContent();
        $this->assertStringContainsString('Tickets prepaye', $content);
        $this->assertStringContainsString('Remises totales', $content);
        $this->assertStringContainsString('Recette Services', $content);
        $this->assertStringContainsString('Recette Produits', $content);
    }

    public function test_csv_export_contains_services_products_revenue(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.export.csv', ['period' => 'month']));

        $response->assertOk();
        $this->assertStringContainsString('dont Recette Services', $response->getContent());
        $this->assertStringContainsString('dont Recette Produits', $response->getContent());
    }

    // ─── Filtre période ────────────────────────────────────────────────────

    public function test_custom_period_filter_works(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.reports.index', [
                'period' => 'custom',
                'from'   => now()->subDays(7)->toDateString(),
                'to'     => now()->toDateString(),
            ]))
            ->assertOk();
    }

    public function test_reports_index_excludes_non_paid_tickets_from_revenue(): void
    {
        $vehicleType = VehicleType::factory()->create();
        $caissier    = User::factory()->create(['role' => 'caissier', 'is_active' => true]);

        // Ticket annulé — ne doit PAS compter dans les revenus
        Ticket::factory()->create([
            'status'          => 'cancelled',
            'vehicle_type_id' => $vehicleType->id,
            'created_by'      => $caissier->id,
            'total_cents'     => 5000,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['period' => 'month']));

        $response->assertOk();

        $props = $response->original->getData()['page']['props'];

        $this->assertEquals(0, $props['stats']['revenue']);
        $this->assertEquals(0, $props['totalDiscounts']);
    }
}
