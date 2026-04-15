<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * TicketResource — Contrôle les champs exposés via Inertia.
 *
 * Exclut : shift_id interne, payment_provider, payment_reference (sensible),
 *          ticket_template_id (interne), total_paused_seconds (technique).
 *
 * @mixin \App\Models\Ticket
 */
class TicketResource extends JsonResource
{
    /**
     * Disable default "data" wrapping — Inertia v2 resolves Responsable via
     * toResponse()->getData(), which would nest all fields under a "data" key.
     */
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'ulid'                 => $this->ulid,
            'ticket_number'        => $this->ticket_number,
            'status'               => $this->status,

            // Véhicule
            'vehicle_plate'        => $this->vehicle_plate,
            'vehicle_brand'        => $this->vehicle_brand,
            'vehicle_type_id'      => $this->vehicle_type_id,
            'vehicle_brand_id'     => $this->vehicle_brand_id,
            'vehicle_model_id'     => $this->vehicle_model_id,

            // Relations FK (IDs)
            'client_id'            => $this->client_id,
            'created_by'           => $this->created_by,
            'assigned_to'          => $this->assigned_to,
            'paid_by'              => $this->paid_by,            // Montants
            'subtotal_cents'       => $this->subtotal_cents,
            'discount_cents'       => $this->discount_cents,
            'total_cents'          => $this->total_cents,
            'balance_due_cents'    => $this->balance_due_cents ?? 0,

            // Fidélité
            'loyalty_points_earned' => $this->loyalty_points_earned,
            'loyalty_points_used'   => $this->loyalty_points_used,

            // Timing
            'estimated_duration'   => $this->estimated_duration,
            'due_at'               => $this->due_at,
            'started_at'           => $this->started_at,
            'completed_at'         => $this->completed_at,
            'paid_at'              => $this->paid_at,
            'paused_at'            => $this->paused_at,
            'payment_mode'         => $this->payment_mode,
            'is_prepaid'           => (bool) $this->is_prepaid,

            // Texte
            'notes'                => $this->notes,
            'cancelled_reason'     => $this->cancelled_reason,
            'pause_reason'         => $this->pause_reason,

            // Timestamps
            'created_at'           => $this->created_at,
            'updated_at'           => $this->updated_at,

            // Relations chargées (conditionnelles)
            'vehicleType'          => $this->whenLoaded('vehicleType'),
            'vehicleBrand'         => $this->whenLoaded('vehicleBrand'),
            'vehicleModel'         => $this->whenLoaded('vehicleModel'),
            'creator'              => UserResource::make($this->whenLoaded('creator')),
            'assignedTo'           => UserResource::make($this->whenLoaded('assignedTo')),
            'paidBy'               => UserResource::make($this->whenLoaded('paidBy')),
            'client'               => ClientResource::make($this->whenLoaded('client')),
            'shift'                => $this->whenLoaded('shift'),            'services'             => $this->whenLoaded('services'),
            'products'             => $this->whenLoaded('products'),
            'washers'              => $this->whenLoaded('washers'),
            'payment'              => $this->whenLoaded('payment'),

            // Computed aggregates — safe strict-mode check via getAttributes()
            'tickets_count'        => $this->when(
                array_key_exists('tickets_count', $this->resource->getAttributes()),
                fn () => $this->resource->tickets_count
            ),
        ];
    }
}
