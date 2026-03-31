<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Inertia\Inertia;
use Inertia\Response;

class PublicTicketController extends Controller
{
    public function show(string $ulid): Response
    {
        $ticket = Ticket::where('ulid', $ulid)
            ->with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'services.service'])
            ->firstOrFail();

        // Only expose public-safe fields
        return Inertia::render('Client/Portal', [
            'ticket' => [
                'ulid'           => $ticket->ulid,
                'ticket_number'  => $ticket->ticket_number,
                'status'         => $ticket->status,
                'vehicle_plate'  => $ticket->vehicle_plate,
                'vehicle_brand'  => $ticket->vehicleBrand?->name ?? $ticket->vehicle_brand,
                'vehicle_model'  => $ticket->vehicleModel?->name ?? null,
                'vehicle_type'   => $ticket->vehicleType?->name ?? null,
                'services'       => $ticket->services->map(fn ($ts) => [
                    'name'  => $ts->service?->name ?? '—',
                    'price' => $ts->unit_price_cents,
                ]),
                'total_cents'    => $ticket->total_cents,
                'created_at'     => $ticket->created_at,
                'started_at'     => $ticket->started_at,
                'completed_at'   => $ticket->completed_at,
                'paid_at'        => $ticket->paid_at,
                'notes'          => $ticket->notes,
            ],
        ]);
    }
}
