<?php

namespace App\DTOs;

use App\Http\Requests\StoreTicketRequest;

/**
 * Data Transfer Object for ticket creation.
 *
 * Encapsulates validated data from StoreTicketRequest into a typed,
 * immutable structure that can be passed between layers (Controller → Service).
 */
final readonly class CreateTicketDTO
{
    /**
     * @param  array<int, ServiceLineDTO>  $services
     * @param  array<int, ProductLineDTO>  $products
     * @param  array<int, int>             $assistantIds
     */
    public function __construct(
        public ?string $vehiclePlate,
        public array   $services,
        public array   $products = [],
        public ?int    $vehicleBrandId = null,
        public ?int    $vehicleModelId = null,
        public ?string $vehicleBrandFreeText = null,
        public ?int    $vehicleTypeId = null,
        public ?int    $clientId = null,
        public ?int    $assignedTo = null,
        public array   $assistantIds = [],
        public ?string $notes = null,
        public ?int    $estimatedDuration = null,
        public ?string $paymentMode = null,
        public ?string $discountType = null,
        public ?float  $discountValue = null,
    ) {}

    /**
     * Build from a validated StoreTicketRequest.
     */
    public static function fromRequest(StoreTicketRequest $request): self
    {
        $serviceLines = array_map(
            fn (array $line) => ServiceLineDTO::fromArray($line),
            $request->validated('services', []),
        );

        $productLines = array_map(
            fn (array $line) => ProductLineDTO::fromArray($line),
            $request->validated('products', []),
        );

        $assistants = collect($request->validated('assistant_ids', []))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        return new self(
            vehiclePlate:        $request->validated('vehicle_plate'),
            services:            $serviceLines,
            products:            $productLines,
            vehicleBrandId:      $request->validated('vehicle_brand_id'),
            vehicleModelId:      $request->validated('vehicle_model_id'),
            vehicleBrandFreeText: $request->validated('vehicle_brand'),
            vehicleTypeId:       $request->validated('vehicle_type_id'),
            clientId:            $request->validated('client_id'),
            assignedTo:          $request->validated('assigned_to'),
            assistantIds:        $assistants,
            notes:               $request->validated('notes'),
            estimatedDuration:   $request->validated('estimated_duration'),
            paymentMode:         $request->validated('payment_mode'),
            discountType:        $request->validated('discount_type'),
            discountValue:       $request->validated('discount_value'),
        );
    }
}

