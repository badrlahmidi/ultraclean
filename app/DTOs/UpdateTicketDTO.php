<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Http\Requests\UpdateTicketRequest;

/**
 * Data Transfer Object for ticket updates.
 *
 * Mirrors CreateTicketDTO with two intentional differences:
 *  1. services is nullable — null means "don't touch existing lines";
 *     a ServiceLineDTO[] means "replace all lines atomically".
 *  2. vehicle_type_id is excluded — the type is immutable after creation
 *     because it underpins the stored unit prices on each service line.
 *     TicketService::update() reads it directly from the Ticket model.
 */
final readonly class UpdateTicketDTO
{
    /**
     * @param  ServiceLineDTO[]|null  $services      null = leave service lines unchanged
     * @param  int[]                  $assistantIds
     */
    public function __construct(
        public ?string $vehiclePlate,
        public ?int    $vehicleBrandId = null,
        public ?int    $vehicleModelId = null,
        public ?string $vehicleBrandFreeText = null,
        public ?int    $clientId = null,
        public ?int    $assignedTo = null,
        public array   $assistantIds = [],
        public ?string $notes = null,
        public ?int    $estimatedDuration = null,
        public ?string $paymentMode = null,
        public ?array  $services = null,
    ) {}

    /**
     * Build from a validated UpdateTicketRequest.
     *
     * Service lines are mapped to typed ServiceLineDTO[] here so the service
     * layer never receives raw arrays — it only sees fully-typed value objects.
     */
    public static function fromRequest(UpdateTicketRequest $request): self
    {
        // Map only when the key was explicitly submitted (preserves "no-touch" semantics).
        $serviceLines = null;
        if ($request->has('services')) {
            $serviceLines = array_map(
                static fn (array $line) => ServiceLineDTO::fromArray($line),
                $request->validated('services', []),
            );
        }

        $assistants = collect($request->validated('assistant_ids', []))
            ->map(static fn (mixed $id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        return new self(
            vehiclePlate:         $request->validated('vehicle_plate'),
            vehicleBrandId:       $request->validated('vehicle_brand_id'),
            vehicleModelId:       $request->validated('vehicle_model_id'),
            vehicleBrandFreeText: $request->validated('vehicle_brand'),
            clientId:             $request->validated('client_id'),
            assignedTo:           $request->validated('assigned_to'),
            assistantIds:         $assistants,
            notes:                $request->validated('notes'),
            estimatedDuration:    $request->validated('estimated_duration'),
            paymentMode:          $request->validated('payment_mode'),
            services:             $serviceLines,
        );
    }
}
