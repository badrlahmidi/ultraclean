<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ClientResource — Contrôle les champs exposés via Inertia.
 *
 * Exclut : deleted_at (soft delete interne), ulid (usage interne QR).
 *
 * @mixin \App\Models\Client
 */
class ClientResource extends JsonResource
{
    /** Disable default "data" wrapping for Inertia compatibility. */
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'ulid'             => $this->ulid,
            'name'             => $this->name,
            'phone'            => $this->phone,
            'email'            => $this->email,
            'vehicle_plate'    => $this->vehicle_plate,
            'notes'            => $this->notes,
            'is_active'        => $this->is_active,
            'is_company'       => $this->is_company,
            'ice'              => $this->ice,

            // Fidélité
            'loyalty_tier'      => $this->loyalty_tier,
            'loyalty_points'    => $this->loyalty_points,
            'total_visits'      => $this->total_visits,
            'total_spent_cents' => $this->total_spent_cents,
            'last_visit_date'   => $this->last_visit_date,

            // Computed (helpers)
            'tier_label'         => $this->when(method_exists($this->resource, 'tierLabel'), fn () => $this->tierLabel()),
            'visits_to_next_tier'=> $this->when(method_exists($this->resource, 'visitsToNextTier'), fn () => $this->visitsToNextTier()),
            'points_value_cents' => $this->when(method_exists($this->resource, 'pointsValueCents'), fn () => $this->pointsValueCents()),

            // Timestamps
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,            // Relations conditionnelles
            'tickets'           => TicketResource::collection($this->whenLoaded('tickets')),
            'appointments'      => $this->whenLoaded('appointments'),

            // Computed aggregates (withCount / withMax) — safe strict-mode check via getAttributes()
            'tickets_count'     => $this->when(
                array_key_exists('tickets_count', $this->resource->getAttributes()),
                fn () => $this->resource->tickets_count
            ),
        ];
    }
}
