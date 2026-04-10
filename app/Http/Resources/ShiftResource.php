<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ShiftResource — Expose les données de caisse.
 *
 * Exclut : rien de sensible, mais structure la réponse proprement.
 *
 * @mixin \App\Models\Shift
 */
class ShiftResource extends JsonResource
{
    /** Disable default "data" wrapping for Inertia compatibility. */
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'user_id'             => $this->user_id,
            'opened_at'           => $this->opened_at,
            'closed_at'           => $this->closed_at,
            'opening_cash_cents'  => $this->opening_cash_cents,
            'closing_cash_cents'  => $this->closing_cash_cents,
            'expected_cash_cents' => $this->expected_cash_cents,
            'difference_cents'    => $this->difference_cents,
            'notes'               => $this->notes,
            'created_at'          => $this->created_at,

            // Relations conditionnelles
            'user'    => UserResource::make($this->whenLoaded('user')),
            'tickets' => TicketResource::collection($this->whenLoaded('tickets')),
        ];
    }
}
