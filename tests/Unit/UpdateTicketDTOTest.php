<?php

namespace Tests\Unit;

use App\DTOs\ProductLineDTO;
use App\DTOs\ServiceLineDTO;
use App\DTOs\UpdateTicketDTO;
use App\Http\Requests\UpdateTicketRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * UpdateTicketDTOTest — Audit du mapping UpdateTicketDTO::fromRequest().
 *
 * Vérifie :
 *  - les products sont null quand la clé est absente (no-touch semantics)
 *  - les products sont mappés en ProductLineDTO[] quand soumis
 *  - products=[] vide vide les lignes produits (full-replacement semantics)
 *  - les champs de chaque ProductLineDTO sont correctement castés
 *  - les services sont null quand la clé est absente
 *  - les services et products sont indépendants (l'un peut être null, l'autre défini)
 *  - is_free par défaut à false quand absent
 */
class UpdateTicketDTOTest extends TestCase
{
    use RefreshDatabase;

    private User $caissier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->caissier = User::factory()->caissier()->create();
    }

    /**
     * Helper : build a minimal validated UpdateTicketRequest from an array.
     */
    private function makeRequest(array $data): UpdateTicketRequest
    {
        $request = UpdateTicketRequest::create('/tickets/1', 'PUT', $data);
        $request->setContainer(app());
        $request->setRedirector(app(\Illuminate\Routing\Redirector::class));
        $request->merge($data);

        // Manually set validated data (bypasses middleware/auth for unit testing)
        $request->request->replace($data);
        $request->query->replace([]);

        return $request;
    }

    // ─── products absent (no-touch) ───────────────────────────────────────

    public function test_products_null_when_key_not_submitted(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        $this->assertNull($dto->products);
    }

    // ─── products submitted ───────────────────────────────────────────────

    public function test_products_mapped_to_product_line_dtos(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'products'      => [
                [
                    'sellable_product_id' => 5,
                    'unit_price_cents'    => 3000,
                    'quantity'            => 2,
                    'discount_cents'      => 500,
                    'is_free'             => false,
                ],
            ],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        $this->assertIsArray($dto->products);
        $this->assertCount(1, $dto->products);
        $this->assertInstanceOf(ProductLineDTO::class, $dto->products[0]);
        $this->assertEquals(5,     $dto->products[0]->sellableProductId);
        $this->assertEquals(3000,  $dto->products[0]->unitPriceCents);
        $this->assertEquals(2.0,   $dto->products[0]->quantity);
        $this->assertEquals(500,   $dto->products[0]->discountCents);
        $this->assertFalse($dto->products[0]->isFree);
    }

    public function test_is_free_defaults_to_false_when_absent(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'products'      => [
                [
                    'sellable_product_id' => 3,
                    'unit_price_cents'    => 1000,
                    'quantity'            => 1,
                ],
            ],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        $this->assertFalse($dto->products[0]->isFree);
        $this->assertEquals(0, $dto->products[0]->discountCents);
    }

    public function test_is_free_true_maps_correctly(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'products'      => [
                [
                    'sellable_product_id' => 7,
                    'unit_price_cents'    => 2000,
                    'quantity'            => 1,
                    'is_free'             => true,
                ],
            ],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        $this->assertTrue($dto->products[0]->isFree);
    }

    // ─── empty products array = clear all lines ───────────────────────────

    public function test_empty_products_array_means_clear_all(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'products'      => [],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        // Key was submitted, but array is empty → replace = clear
        $this->assertIsArray($dto->products);
        $this->assertCount(0, $dto->products);
    }

    // ─── multiple products ────────────────────────────────────────────────

    public function test_multiple_products_all_mapped(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'products'      => [
                [
                    'sellable_product_id' => 1,
                    'unit_price_cents'    => 1000,
                    'quantity'            => 1,
                ],
                [
                    'sellable_product_id' => 2,
                    'unit_price_cents'    => 2500,
                    'quantity'            => 3,
                    'is_free'             => true,
                ],
                [
                    'sellable_product_id' => 3,
                    'unit_price_cents'    => 800,
                    'quantity'            => 2,
                    'discount_cents'      => 100,
                ],
            ],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        $this->assertCount(3, $dto->products);
        $this->assertEquals(1,    $dto->products[0]->sellableProductId);
        $this->assertEquals(2,    $dto->products[1]->sellableProductId);
        $this->assertTrue($dto->products[1]->isFree);
        $this->assertEquals(3,    $dto->products[2]->sellableProductId);
        $this->assertEquals(100,  $dto->products[2]->discountCents);
    }

    // ─── services and products are independent ────────────────────────────

    public function test_services_null_products_submitted(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'products'      => [
                [
                    'sellable_product_id' => 1,
                    'unit_price_cents'    => 500,
                    'quantity'            => 1,
                ],
            ],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        // Services key was NOT in the request → null (no-touch)
        $this->assertNull($dto->services);
        // Products key WAS in the request → mapped array
        $this->assertCount(1, $dto->products);
    }

    public function test_services_submitted_products_absent(): void
    {
        $request = $this->makeRequest([
            'vehicle_plate' => 'AB-123-CD',
            'services'      => [
                [
                    'service_id'        => 1,
                    'unit_price_cents'  => 5000,
                    'quantity'          => 1,
                    'discount_cents'    => 0,
                ],
            ],
        ]);

        $dto = UpdateTicketDTO::fromRequest($request);

        // Products key was NOT in the request → null (no-touch)
        $this->assertNull($dto->products);
        // Services key WAS in the request → mapped array
        $this->assertIsArray($dto->services);
        $this->assertCount(1, $dto->services);
        $this->assertInstanceOf(ServiceLineDTO::class, $dto->services[0]);
    }
}
