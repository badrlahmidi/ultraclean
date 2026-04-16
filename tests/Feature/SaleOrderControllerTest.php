<?php

namespace Tests\Feature;

use App\Models\SaleOrder;
use App\Models\SellableProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * SaleOrderControllerTest — Tests HTTP du contrôleur POS.
 *
 * Vérifie :
 *   - Accès authentifié uniquement
 *   - RBAC : seuls caissier et admin peuvent accéder
 *   - Liste, création, store, show et annulation
 *   - Validation de la requête de création
 */
class SaleOrderControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $caissier;
    private User $admin;
    private User $laveur;
    private SellableProduct $product;

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

        $this->laveur = User::factory()->create([
            'role'      => 'laveur',
            'is_active' => true,
        ]);

        $this->product = SellableProduct::create([
            'name'                 => 'Désodorisant',
            'sku'                  => 'DESO-001',
            'selling_price_cents'  => 1500,
            'purchase_price_cents' => 500,
            'current_stock'        => 100.0,
            'alert_threshold'      => 5.0,
            'unit'                 => 'unité',
            'is_active'            => true,
        ]);
    }

    // ─── Authentification ──────────────────────────────────────────────────

    public function test_unauthenticated_user_cannot_access_pos_index(): void
    {
        $this->get(route('caissier.pos.index'))
            ->assertRedirect(route('login'));
    }

    public function test_unauthenticated_user_cannot_access_pos_create(): void
    {
        $this->get(route('caissier.pos.create'))
            ->assertRedirect(route('login'));
    }

    public function test_laveur_cannot_access_pos(): void
    {
        $this->actingAs($this->laveur)
            ->get(route('caissier.pos.index'))
            ->assertForbidden();
    }

    // ─── Index ────────────────────────────────────────────────────────────

    public function test_caissier_can_view_pos_index(): void
    {
        $this->actingAs($this->caissier)
            ->get(route('caissier.pos.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Caissier/POS/Index'));
    }

    public function test_admin_can_view_pos_index(): void
    {
        $this->actingAs($this->admin)
            ->get(route('caissier.pos.index'))
            ->assertOk();
    }

    public function test_pos_index_returns_sales_and_stats(): void
    {
        $response = $this->actingAs($this->caissier)
            ->get(route('caissier.pos.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('sales')
                ->has('stats')
                ->has('filters')
            );
    }

    // ─── Create ───────────────────────────────────────────────────────────

    public function test_caissier_can_view_pos_create_page(): void
    {
        $this->actingAs($this->caissier)
            ->get(route('caissier.pos.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Caissier/POS/Create')
                ->has('sellableProducts')
            );
    }

    // ─── Store ────────────────────────────────────────────────────────────

    public function test_caissier_can_create_sale(): void
    {
        $response = $this->actingAs($this->caissier)
            ->post(route('caissier.pos.store'), [
                'products' => [
                    [
                        'sellable_product_id' => $this->product->id,
                        'unit_price_cents'    => 1500,
                        'quantity'            => 2,
                        'discount_cents'      => 0,
                        'is_free'             => false,
                    ],
                ],
                'payment_method' => 'cash',
            ]);

        $this->assertDatabaseCount('sale_orders', 1);
        $sale = SaleOrder::first();
        $response->assertRedirect(route('caissier.pos.show', $sale->ulid));

        $this->assertEquals('paid', $sale->status);
        $this->assertEquals(3000, $sale->total_cents);
    }

    public function test_store_validates_products_required(): void
    {
        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.store'), [
                'payment_method' => 'cash',
            ])
            ->assertSessionHasErrors(['products']);
    }

    public function test_store_validates_payment_method_required(): void
    {
        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.store'), [
                'products' => [
                    [
                        'sellable_product_id' => $this->product->id,
                        'unit_price_cents'    => 1500,
                        'quantity'            => 1,
                        'discount_cents'      => 0,
                        'is_free'             => false,
                    ],
                ],
            ])
            ->assertSessionHasErrors(['payment_method']);
    }

    public function test_store_validates_payment_method_value(): void
    {
        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.store'), [
                'products' => [
                    [
                        'sellable_product_id' => $this->product->id,
                        'unit_price_cents'    => 1500,
                        'quantity'            => 1,
                        'discount_cents'      => 0,
                        'is_free'             => false,
                    ],
                ],
                'payment_method' => 'bitcoin',
            ])
            ->assertSessionHasErrors(['payment_method']);
    }

    public function test_store_validates_product_id_exists(): void
    {
        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.store'), [
                'products' => [
                    [
                        'sellable_product_id' => 99999,
                        'unit_price_cents'    => 1500,
                        'quantity'            => 1,
                        'discount_cents'      => 0,
                        'is_free'             => false,
                    ],
                ],
                'payment_method' => 'cash',
            ])
            ->assertSessionHasErrors(['products.0.sellable_product_id']);
    }

    // ─── Show ─────────────────────────────────────────────────────────────

    public function test_caissier_can_view_sale_detail(): void
    {
        $sale = $this->createPaidSale();

        $this->actingAs($this->caissier)
            ->get(route('caissier.pos.show', $sale->ulid))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Caissier/POS/Show')
                ->has('sale')
            );
    }

    public function test_show_returns_404_for_unknown_ulid(): void
    {
        $this->actingAs($this->caissier)
            ->get(route('caissier.pos.show', 'nonexistent-ulid'))
            ->assertNotFound();
    }

    // ─── Cancel ───────────────────────────────────────────────────────────

    public function test_caissier_can_cancel_sale(): void
    {
        $sale = $this->createPaidSale();

        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.cancel', $sale->ulid), [
                'reason' => 'Erreur de caisse',
            ])
            ->assertRedirect(route('caissier.pos.show', $sale->ulid));

        $this->assertEquals('cancelled', $sale->fresh()->status);
    }

    public function test_cancel_requires_reason(): void
    {
        $sale = $this->createPaidSale();

        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.cancel', $sale->ulid), [])
            ->assertSessionHasErrors(['reason']);
    }

    public function test_cancel_already_cancelled_sale_returns_error(): void
    {
        $sale = $this->createPaidSale();

        // First cancellation
        $this->actingAs($this->caissier)
            ->post(route('caissier.pos.cancel', $sale->ulid), ['reason' => 'Première']);

        // Second cancellation should fail gracefully
        $response = $this->actingAs($this->caissier)
            ->post(route('caissier.pos.cancel', $sale->ulid), ['reason' => 'Deuxième']);

        $response->assertSessionHasErrors();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private function createPaidSale(): SaleOrder
    {
        return app(\App\Services\SaleOrderService::class)->create([
            'client_id'   => null,
            'products'    => [
                [
                    'sellable_product_id' => $this->product->id,
                    'unit_price_cents'    => 1500,
                    'quantity'            => 1,
                    'discount_cents'      => 0,
                    'is_free'             => false,
                ],
            ],
            'discount_type'  => null,
            'discount_value' => null,
            'payment_method' => 'cash',
            'notes'          => null,
        ], $this->caissier);
    }
}
