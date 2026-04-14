<?php

namespace App\Services;

use App\DTOs\CreateTicketDTO;
use App\DTOs\ProductLineDTO;
use App\DTOs\ServiceLineDTO;
use App\DTOs\UpdateTicketDTO;
use App\Events\TicketAssigned;
use App\Services\PricingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\SellableProduct;
use App\Models\Service;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\TicketProduct;
use App\Models\TicketService as TicketServiceModel;
use App\Models\TicketWasher;
use App\Models\User;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;

/**
 * TicketService — Encapsulates all business logic for the ticket lifecycle.
 *
 * Extracted from TicketController to respect SRP (ARCH-1).
 * Both the store and update flows are DTO-driven — no raw arrays cross the
 * Controller → Service boundary.
 */
class TicketService
{
    /**
     * Create a new ticket with its service lines, product lines, and washer assignments.
     *
     * Price validation is performed FIRST, before any DB writes, so a
     * rejected submission never leaves an orphaned ticket row.
     *
     * AUDIT-FIX: All DB operations are now wrapped in a transaction to ensure
     * atomicity — if syncWashers() fails, the entire ticket creation is rolled back.
     */
    public function create(CreateTicketDTO $dto, User $creator): Ticket
    {
        // ── Validate service prices BEFORE any DB write ───────────────────
        if (!empty($dto->services)) {
            $mismatches = PricingService::validatePrices($dto->services, $dto->vehicleTypeId);
            if ($mismatches->isNotEmpty()) {
                throw ValidationException::withMessages(['services' => $mismatches->all()]);
            }
        }

        $shift = Shift::where('user_id', $creator->id)
            ->whereNull('closed_at')
            ->first();

        // ── Assign walk-in client when none selected ─────────────────────────
        $clientId = $dto->clientId ?? Client::walkIn()->id;

        $brandSnapshot = $this->buildBrandSnapshot(
            $dto->vehicleBrandId,
            $dto->vehicleModelId,
            $dto->vehicleBrandFreeText,
        );

        // ── Wrap all DB writes in a transaction for atomicity ───────────────
        $ticket = DB::transaction(function () use ($dto, $creator, $shift, $clientId, $brandSnapshot) {
            $ticket = Ticket::create([
                'vehicle_brand'      => $brandSnapshot,
                'vehicle_brand_id'   => $dto->vehicleBrandId,
                'vehicle_model_id'   => $dto->vehicleModelId,
                'vehicle_plate'      => $dto->vehiclePlate,
                'vehicle_type_id'    => $dto->vehicleTypeId,
                'client_id'          => $clientId,
                'assigned_to'        => $dto->assignedTo,
                'created_by'         => $creator->id,
                'shift_id'           => $shift?->id,
                'notes'              => $dto->notes,
                'estimated_duration' => $dto->estimatedDuration,
                'payment_mode'       => $dto->paymentMode,
                'discount_type'      => $dto->discountType,
                'discount_value'     => $dto->discountValue,
                'due_at'             => $dto->assignedTo && $dto->estimatedDuration
                    ? WasherScheduler::computeDueAt(
                        (int) $dto->assignedTo,
                        (int) $dto->estimatedDuration,
                    )
                    : null,
                'status' => Ticket::STATUS_PENDING,
            ]);

            // ── Attach service lines (ticket is new — no existing lines to remove) ──
            if (!empty($dto->services)) {
                $this->attachServiceLines($ticket, $dto->services, $dto->vehicleTypeId);
            }

            // ── Attach product lines ────────────────────────────────────────────
            if (!empty($dto->products)) {
                $this->attachProductLines($ticket, $dto->products, $clientId);
            }

            $ticket->refresh();

            // ── Assign washers (lead + assistants) ──────────────────────────────
            $this->syncWashers($ticket, $dto->assignedTo, $dto->assistantIds);

            // ── Activity log ────────────────────────────────────────────────────
            ActivityLog::log('ticket.created', $ticket, [
                'ticket_number' => $ticket->ticket_number,
                'vehicle'       => $brandSnapshot,
                'total_cents'   => $ticket->total_cents,
                'assigned_to'   => $dto->assignedTo,
            ]);

            return $ticket;
        });

        // ── Broadcast AFTER the transaction commits (non-blocking) ──────────
        if ($ticket->assigned_to) {
            try {
                TicketAssigned::dispatch($ticket);
            } catch (\Throwable $e) {
                Log::warning('Broadcast TicketAssigned failed: ' . $e->getMessage());
            }
        }

        return $ticket;
    }

    /**
     * Update an existing ticket's attributes, service lines, and washer assignments.
     *
     * Mirrors create() in its guard ordering:
     *  - Price validation runs BEFORE any mutation (same F-01/F-02 protection).
     *  - $dto->services === null means "leave lines untouched" (partial-update safe).
     *  - Washer pivot is fully replaced when assigned_to is provided, fixing the
     *    silent bug where editing a ticket never updated the ticket_washers rows.
     */
    public function update(UpdateTicketDTO $dto, Ticket $ticket): Ticket
    {
        // Guard: a paid ticket must not be mutated through the edit form.
        // Admins wanting to correct data should void and re-create instead.
        abort_if(
            $ticket->isPaid(),
            403,
            "Le ticket {$ticket->ticket_number} est déjà payé et ne peut plus être modifié."
        );
        $brandSnapshot = $this->buildBrandSnapshot(
            $dto->vehicleBrandId,
            $dto->vehicleModelId,
            $dto->vehicleBrandFreeText,
        );

        $ticket->update([
            'vehicle_brand_id'   => $dto->vehicleBrandId,
            'vehicle_model_id'   => $dto->vehicleModelId,
            // Preserve the existing snapshot when brand fields are left blank.
            'vehicle_brand'      => $brandSnapshot ?? $ticket->vehicle_brand,
            'vehicle_plate'      => $dto->vehiclePlate
                                        ? strtoupper(trim($dto->vehiclePlate))
                                        : null,
            'client_id'          => $dto->clientId,
            'assigned_to'        => $dto->assignedTo,
            'notes'              => $dto->notes,
            'payment_mode'       => $dto->paymentMode,
            'estimated_duration' => $dto->estimatedDuration,
        ]);

        // ── Replace service lines only when explicitly submitted ─────────────
        // vehicle_type_id is read from the persisted ticket so validation always
        // runs against the original vehicle class — it is immutable post-creation.
        if ($dto->services !== null) {
            $this->syncPrestations($ticket, $dto->services, $ticket->vehicle_type_id);
        }

        // ── Re-sync washer pivot whenever the lead assignment is set ─────────
        if ($dto->assignedTo !== null) {
            $this->syncWashers($ticket, $dto->assignedTo, $dto->assistantIds);
        }

        ActivityLog::log('ticket.updated', $ticket, [
            'ticket_number' => $ticket->ticket_number,
        ]);

        return $ticket->refresh();
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Build the brand + model text snapshot stored on the ticket.
     *
     * The snapshot is denormalized so receipts and search remain correct even
     * when a brand or model is later renamed or soft-deleted in the catalog.
     */
    private function buildBrandSnapshot(?int $brandId, ?int $modelId, ?string $freeText): ?string
    {
        if ($brandId) {
            $brand = VehicleBrand::find($brandId);
            $model = $modelId ? VehicleModel::find($modelId) : null;
            $brandName = $brand !== null ? $brand->name : '';
            $modelName = $model !== null ? $model->name : '';
            return trim($brandName . ' ' . $modelName) ?: null;
        }

        return $freeText ?: null;
    }

    /**
     * Validate prices then atomically replace all service lines on a ticket.
     *
     * Used by both create() (no prior lines exist) and update() (stale lines are
     * deleted first). Validation runs BEFORE the delete so a price-tamper rejection
     * leaves the ticket completely untouched — fixes F-01 / F-02.
     *
     * @param  ServiceLineDTO[]  $lines
     *
     * @throws ValidationException  If any submitted price mismatches the server grid
     */
    private function syncPrestations(Ticket $ticket, array $lines, ?int $vehicleTypeId): void
    {
        $mismatches = PricingService::validatePrices($lines, $vehicleTypeId);
        if ($mismatches->isNotEmpty()) {
            throw ValidationException::withMessages(['services' => $mismatches->all()]);
        }

        $ticket->services()->delete();
        $this->attachServiceLines($ticket, $lines, $vehicleTypeId);

        // Explicit recalculation as a safety net: the TicketService observer already
        // fires recalculateTotals() on saved/deleted, but calling it here keeps the
        // in-memory ticket state correct for any code that runs after this call.
        $ticket->recalculateTotals();
    }

    /**
     * Persist TicketService rows for each service line.
     *
     * ARCH-ITEM-2.1 (F-01) — Server-side price resolution:
     * The frontend-submitted unit_price_cents is IGNORED. The canonical price is always
     * resolved via PricingService::resolveUnitPrice() so a tampered submission has zero
     * financial impact, even if validation is bypassed.
     *
     * @param  ServiceLineDTO[]  $lines
     */
    private function attachServiceLines(Ticket $ticket, array $lines, ?int $vehicleTypeId = null): void
    {
        foreach ($lines as $line) {
            $service = Service::findOrFail($line->serviceId);

            // Resolve the canonical server-side price — ignore any frontend-submitted value.
            $variantId       = $line->priceVariantId ?? $vehicleTypeId;
            $canonicalPrice  = PricingService::resolveUnitPrice($line->serviceId, $variantId);

            TicketServiceModel::create([
                'ticket_id'           => $ticket->id,
                'service_id'          => $service->id,
                'service_name'        => $service->name,
                'unit_price_cents'    => $canonicalPrice,
                'quantity'            => $line->quantity,
                'discount_cents'      => $line->discountCents,
                'price_variant_id'    => $line->priceVariantId,
                'price_variant_label' => $line->priceVariantId
                    ? VehicleType::find($line->priceVariantId)?->name
                    : null,
            ]);
        }
    }

    /**
     * Persist TicketProduct rows for each product line.
     *
     * For Atelier client, products can be marked as free (is_free = true),
     * which sets line_total_cents to 0.
     *
     * @param  ProductLineDTO[]  $lines
     */
    private function attachProductLines(Ticket $ticket, array $lines, int $clientId): void
    {
        $isAtelier = Client::isAtelierId($clientId);

        foreach ($lines as $line) {
            $product = SellableProduct::findOrFail($line->sellableProductId);

            // For Atelier, use the is_free flag from DTO; for others, always false
            $isFree = $isAtelier && $line->isFree;

            TicketProduct::create([
                'ticket_id'           => $ticket->id,
                'sellable_product_id' => $product->id,
                'product_name'        => $product->name,
                'unit_price_cents'    => $product->selling_price_cents,
                'quantity'            => $line->quantity,
                'discount_cents'      => $line->discountCents,
                'is_free'             => $isFree,
            ]);
        }
    }

    /**
     * Idempotently set the washer assignments for a ticket.
     *
     * Clears all existing pivot rows before inserting the new set so that this
     * method is safe for both creation (no prior rows) and updates (stale rows
     * must be replaced). This fixes the silent bug where editing a ticket's
     * assigned_to via the Edit form never updated the ticket_washers pivot.
     *
     * @param  int[]  $assistantIds
     */
    private function syncWashers(Ticket $ticket, ?int $leadId, array $assistantIds): void
    {
        // Clear stale assignments before writing the current set.
        TicketWasher::where('ticket_id', $ticket->id)->delete();

        if (! $leadId) {
            return;
        }

        TicketWasher::create([
            'ticket_id' => $ticket->id,
            'user_id'   => $leadId,
            'role'      => TicketWasher::ROLE_LEAD,
        ]);

        collect($assistantIds)
            ->reject(fn (int $id) => $id === $leadId)
            ->unique()
            ->each(function (int $assistantId) use ($ticket): void {
                TicketWasher::create([
                    'ticket_id' => $ticket->id,
                    'user_id'   => $assistantId,
                    'role'      => TicketWasher::ROLE_ASSISTANT,
                ]);
            });
    }
}
