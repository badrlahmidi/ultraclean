<?php

namespace Tests\Feature;

use App\Models\StockProduct;
use App\Models\StockMovement;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockProductTest extends TestCase
{
    use RefreshDatabase;

    // ─── addStock ────────────────────────────────────────────────────────

    public function test_add_stock_creates_movement_and_increments_quantity(): void
    {
        $product = StockProduct::factory()->withQuantity(10.0)->create();

        $movement = $product->addStock(5.0, 'Réapprovisionnement test', 'REF-001');

        $this->assertInstanceOf(StockMovement::class, $movement);
        $this->assertEquals('in', $movement->type);
        $this->assertEquals(5.0, $movement->quantity);
        $this->assertEquals('REF-001', $movement->reference);

        $this->assertEquals(15.0, $product->fresh()->current_quantity);
    }

    public function test_add_stock_with_user_id_stores_it(): void
    {
        $user    = User::factory()->create();
        $product = StockProduct::factory()->create();
        $movement = $product->addStock(3.0, null, null, $user->id);

        $this->assertEquals($user->id, $movement->user_id);
    }

    // ─── consumeStock ────────────────────────────────────────────────────

    public function test_consume_stock_creates_out_movement_and_decrements_quantity(): void
    {
        $ticket  = Ticket::factory()->completed()->create();
        $product = StockProduct::factory()->withQuantity(20.0)->create();

        $movement = $product->consumeStock(8.0, 'TK-20260331-0001', $ticket->id);

        $this->assertEquals('out', $movement->type);
        $this->assertEquals(8.0, $movement->quantity);
        $this->assertEquals('TK-20260331-0001', $movement->reference);
        $this->assertEquals(12.0, $product->fresh()->current_quantity);
    }

    public function test_consume_stock_can_go_negative(): void
    {
        $product = StockProduct::factory()->withQuantity(1.0)->create();

        $product->consumeStock(5.0);

        // Autorisé — stock négatif déclenche une alerte UI mais n'est pas bloqué
        $this->assertEquals(-4.0, $product->fresh()->current_quantity);
    }

    // ─── adjustStock ─────────────────────────────────────────────────────

    public function test_adjust_stock_sets_exact_quantity(): void
    {
        $product = StockProduct::factory()->withQuantity(10.0)->create();

        $movement = $product->adjustStock(7.5, 'Inventaire mensuel');

        $this->assertEquals('adjustment', $movement->type);
        $this->assertEquals(7.5, $product->fresh()->current_quantity);
    }

    public function test_adjust_stock_records_absolute_difference(): void
    {
        $product = StockProduct::factory()->withQuantity(10.0)->create();
        $movement = $product->adjustStock(6.0);

        // La quantité enregistrée dans le mouvement est la valeur absolue de la diff
        $this->assertEquals(4.0, $movement->quantity);
    }

    // ─── isLowStock ──────────────────────────────────────────────────────

    public function test_is_low_stock_returns_true_when_at_minimum(): void
    {
        $product = StockProduct::factory()->create([
            'current_quantity' => 2.0,
            'min_quantity'     => 2.0,
        ]);

        $this->assertTrue($product->isLowStock());
    }

    public function test_is_low_stock_returns_true_when_below_minimum(): void
    {
        $product = StockProduct::factory()->create([
            'current_quantity' => 1.0,
            'min_quantity'     => 5.0,
        ]);

        $this->assertTrue($product->isLowStock());
    }

    public function test_is_low_stock_returns_false_when_above_minimum(): void
    {
        $product = StockProduct::factory()->create([
            'current_quantity' => 10.0,
            'min_quantity'     => 2.0,
        ]);

        $this->assertFalse($product->isLowStock());
    }

    // ─── scopeLowStock ───────────────────────────────────────────────────

    public function test_scope_low_stock_returns_only_low_stock_active_products(): void
    {
        StockProduct::factory()->lowStock()->create();       // low stock, active
        StockProduct::factory()->withQuantity(50.0)->create(); // normal stock
        StockProduct::factory()->lowStock()->create(['is_active' => false]); // inactive

        $lowStockProducts = StockProduct::lowStock()->get();

        $this->assertCount(1, $lowStockProducts);
    }

    // ─── categoryLabel ───────────────────────────────────────────────────

    public function test_category_label_returns_readable_name(): void
    {
        $this->assertEquals('Produit chimique', StockProduct::categoryLabel('produit_chimique'));
        $this->assertEquals('Consommable',      StockProduct::categoryLabel('consommable'));
        $this->assertEquals('Outil / Matériel', StockProduct::categoryLabel('outil'));
        $this->assertEquals('Autre',            StockProduct::categoryLabel('autre'));
    }

    public function test_category_label_falls_back_to_ucfirst(): void
    {
        $this->assertEquals('Unknown', StockProduct::categoryLabel('unknown'));
    }

    // ─── Movements relation ──────────────────────────────────────────────

    public function test_movements_relation_is_ordered_latest_first(): void
    {
        $product = StockProduct::factory()->withQuantity(100.0)->create();

        $product->addStock(1.0, 'First');
        $product->addStock(2.0, 'Second');
        $product->addStock(3.0, 'Third');

        $movements = $product->movements()->get();
        $this->assertEquals('Third', $movements->first()->note);
    }
}
