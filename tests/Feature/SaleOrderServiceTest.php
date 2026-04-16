<?php

namespace Tests\Feature;

use App\Models\SaleOrder;
use App\Models\SaleOrderLine;
use App\Models\SellableProduct;
use App\Models\Shift;
use App\Models\User;
use App\Services\SaleOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * SaleOrderServiceTest — Tests unitaires du service POS.
 *
 * Vérifie :
 *   - Création d'une vente avec calcul correct des totaux
 *   - Décrémentation du stock lors de la création
 *   - Remise en pourcentage et fixe
 *   - Annulation avec restitution de stock
 *   - Liaison au shift actif
 */
class SaleOrderServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $caissier;
    private SellableProduct $product;
    private SaleOrderService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->caissier = User::factory()->create([
            'role'      => 'caissier',
            'is_active' => true,
        ]);

        $this->product = SellableProduct::create([
            'name'                 => 'Shampoing voiture',
            'sku'                  => 'SHAMP-001',
            'selling_price_cents'  => 2500,
            'purchase_price_cents' => 1000,
            'current_stock'        => 50.0,
            'alert_threshold'      => 5.0,
            'unit'                 => 'unité',
            'is_active'            => true,
        ]);

        $this->service = app(SaleOrderService::class);
    }

    // ─── Création ──────────────────────────────────────────────────────────

    public function test_creates_sale_order_with_correct_totals(): void
    {
        $sale = $this->service->create([
            'client_id'      => null,
            'products'       => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 2,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'     => null,
            'discount_value'    => null,
            'payment_method'    => 'cash',
            'payment_reference' => null,
            'notes'             => null,
        ], $this->caissier);

        $this->assertInstanceOf(SaleOrder::class, $sale);
        $this->assertEquals(5000, $sale->subtotal_cents);
        $this->assertEquals(0, $sale->discount_cents);
        $this->assertEquals(5000, $sale->total_cents);
        $this->assertEquals('paid', $sale->status);
        $this->assertEquals('cash', $sale->payment_method);
        $this->assertNotNull($sale->sale_number);
        $this->assertStringStartsWith('VTE-', $sale->sale_number);
        $this->assertNotNull($sale->ulid);
    }

    public function test_creates_sale_order_line_with_correct_total(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 3,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'card',
        ], $this->caissier);

        $this->assertCount(1, $sale->lines);
        $line = $sale->lines->first();
        $this->assertEquals(7500, $line->line_total_cents);
        $this->assertEquals(3, $line->quantity);
        $this->assertEquals(2500, $line->unit_price_cents);
    }

    // ─── Stock ────────────────────────────────────────────────────────────

    public function test_decrements_stock_on_sale_creation(): void
    {
        $initialStock = $this->product->current_stock;

        $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 3,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
        ], $this->caissier);

        $this->product->refresh();
        $this->assertEquals($initialStock - 3, $this->product->current_stock);
    }

    public function test_decrements_stock_for_free_items_too(): void
    {
        $initialStock = $this->product->current_stock;

        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => true,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
        ], $this->caissier);

        // Free item: total is 0 but stock is still consumed
        $this->assertEquals(0, $sale->total_cents);
        $this->product->refresh();
        $this->assertEquals($initialStock - 1, $this->product->current_stock);
    }

    // ─── Remises ──────────────────────────────────────────────────────────

    public function test_applies_percent_discount(): void
    {
        $sale = $this->service->create([
            'client_id'      => null,
            'products'       => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 10000,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => 'percent',
            'discount_value' => 20,
            'payment_method' => 'cash',
        ], $this->caissier);

        $this->assertEquals(10000, $sale->subtotal_cents);
        $this->assertEquals(2000, $sale->discount_cents);
        $this->assertEquals(8000, $sale->total_cents);
    }

    public function test_applies_fixed_discount(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 10000,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => 'fixed',
            'discount_value' => 30, // 30 MAD = 3000 cents
            'payment_method' => 'cash',
        ], $this->caissier);

        $this->assertEquals(10000, $sale->subtotal_cents);
        $this->assertEquals(3000, $sale->discount_cents);
        $this->assertEquals(7000, $sale->total_cents);
    }

    public function test_total_is_never_negative_with_large_discount(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 1000,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => 'fixed',
            'discount_value' => 200, // 200 MAD > 10 MAD price
            'payment_method' => 'cash',
        ], $this->caissier);

        $this->assertEquals(0, $sale->total_cents);
    }

    // ─── Shift ────────────────────────────────────────────────────────────

    public function test_links_sale_to_active_shift(): void
    {
        $shift = Shift::create([
            'user_id'            => $this->caissier->id,
            'opened_at'          => now(),
            'opening_cash_cents' => 10000,
            'is_open'            => true,
        ]);

        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
        ], $this->caissier);

        $this->assertEquals($shift->id, $sale->shift_id);
    }

    public function test_sale_shift_id_is_null_when_no_active_shift(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'mobile',
        ], $this->caissier);

        $this->assertNull($sale->shift_id);
    }

    // ─── Annulation ───────────────────────────────────────────────────────

    public function test_cancel_changes_status_to_cancelled(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 2,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
        ], $this->caissier);

        $cancelled = $this->service->cancel($sale, 'Test annulation', $this->caissier);

        $this->assertEquals('cancelled', $cancelled->status);
        $this->assertEquals('Test annulation', $cancelled->cancelled_reason);
        $this->assertNotNull($cancelled->cancelled_at);
    }

    public function test_cancel_restores_stock(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 5,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
        ], $this->caissier);

        $stockAfterSale = $this->product->fresh()->current_stock;

        $this->service->cancel($sale, 'Erreur de saisie', $this->caissier);

        $this->product->refresh();
        $this->assertEquals($stockAfterSale + 5, $this->product->current_stock);
    }

    public function test_cancel_already_cancelled_sale_throws(): void
    {
        $sale = $this->service->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
        ], $this->caissier);

        $this->service->cancel($sale, 'Première annulation', $this->caissier);

        $this->expectException(\RuntimeException::class);
        $this->service->cancel($sale->fresh(), 'Deuxième annulation', $this->caissier);
    }

    // ─── Numérotation ─────────────────────────────────────────────────────

    public function test_sale_numbers_are_unique_and_sequential(): void
    {
        $sale1 = $this->service->create([
            'client_id'   => null,
            'products'    => [['sellable_product_id' => $this->product->id, 'unit_price_cents' => 100, 'quantity' => 1, 'discount_cents' => 0, 'is_free' => false]],
            'discount_type' => null, 'discount_value' => null, 'payment_method' => 'cash',
        ], $this->caissier);

        $sale2 = $this->service->create([
            'client_id'   => null,
            'products'    => [['sellable_product_id' => $this->product->id, 'unit_price_cents' => 100, 'quantity' => 1, 'discount_cents' => 0, 'is_free' => false]],
            'discount_type' => null, 'discount_value' => null, 'payment_method' => 'card',
        ], $this->caissier);

        $this->assertNotEquals($sale1->sale_number, $sale2->sale_number);
        $this->assertStringStartsWith('VTE-', $sale1->sale_number);
        $this->assertStringStartsWith('VTE-', $sale2->sale_number);
    }
}
