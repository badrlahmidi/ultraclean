<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\Ticket;
use App\Services\WasherScheduler;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class PublicTicketController extends Controller
{
    public function show(string $ulid): Response
    {
        $ticket = Ticket::where('ulid', $ulid)
            ->with(['vehicleType', 'vehicleBrand', 'vehicleModel', 'services.service', 'washers'])
            ->firstOrFail();

        // Only expose public-safe fields
        return Inertia::render('Client/Portal', [
            'settings' => [
                'portal_show_team'  => (bool) Setting::get('portal_show_team', '1'),
                'portal_show_price' => (bool) Setting::get('portal_show_price', '1'),
            ],            'ticket' => [
                'ulid'           => $ticket->ulid,
                'ticket_number'  => $ticket->ticket_number,
                'status'         => $ticket->status,
                'vehicle_plate'  => $ticket->vehicle_plate,
                'vehicle_brand'  => $ticket->vehicleBrand instanceof \App\Models\VehicleBrand
                    ? $ticket->vehicleBrand->name
                    : $ticket->vehicle_brand,
                'vehicle_model'  => $ticket->vehicleModel instanceof \App\Models\VehicleModel
                    ? $ticket->vehicleModel->name
                    : null,
                'vehicle_type'   => $ticket->vehicleType instanceof \App\Models\VehicleType
                    ? $ticket->vehicleType->name
                    : null,                'services'       => $ticket->services->map(function ($ts) {
                    /** @var \App\Models\TicketService $ts */
                    /** @var \App\Models\Service|null $svc */
                    $svc = $ts->service;
                    return [
                        'name'  => $svc->name ?? '—',
                        'price' => $ts->unit_price_cents,
                    ];
                }),
                'total_cents'    => $ticket->total_cents,
                'created_at'     => $ticket->created_at,
                'started_at'     => $ticket->started_at,
                'completed_at'   => $ticket->completed_at,
                'paid_at'        => $ticket->paid_at,
                'notes'          => $ticket->notes,
                // Champs enrichis Sprint 8
                'due_at'         => $this->resolveDueAt($ticket),
                'progress_pct'   => $this->computeProgressPct($ticket),                'washers'        => $ticket->washers->map(function ($w) {
                    /** @var \App\Models\User $w */
                    return [
                        'name' => $w->name,
                        'role' => $w->pivot->role ?? 'lead',
                    ];
                }),
            ],
        ]);
    }

    /** Heure de fin estimée via WasherScheduler (null si non applicable). */
    private function resolveDueAt(Ticket $ticket): ?string
    {
        if (! $ticket->assigned_to) {
            return null;
        }
        if (! in_array($ticket->status, ['pending', 'in_progress'])) {
            return null;
        }
        try {
            return WasherScheduler::feasibilityCheck($ticket->assigned_to, 0)['due_at'];
        } catch (\Throwable $e) {
            Log::warning('[PublicTicketController] Scheduler failed', [
                'ticket_id' => $ticket->id,
                'error'     => $e->getMessage(),
            ]);
            return null;
        }
    }

    /** Progression % : 10 (pending) → 10-89 (in_progress, temps écoulé) → 90 (completed) → 100 (paid). */
    private function computeProgressPct(Ticket $ticket): int
    {
        return match ($ticket->status) {
            'pending'  => 10,
            'paid'     => 100,
            'completed' => 90,
            'in_progress' => $this->elapsedPct($ticket),
            default    => 0,
        };
    }    private function elapsedPct(Ticket $ticket): int
    {
        $estimated = (int) ($ticket->estimated_duration ?? 0);
        if ($estimated <= 0 || ! $ticket->started_at) {
            return 50;
        }
        $elapsedMin = ((int) $ticket->started_at->diffInSeconds(now())
                      - (int) ($ticket->total_paused_seconds ?? 0)) / 60;
        return max(10, min(89, (int) round(10 + ($elapsedMin / $estimated) * 79)));
    }

    /**
     * Génère une URL signée pour le suivi public d'un ticket.
     * Validité : 7 jours (largement suffisant pour le cycle de vie d'un lavage).
     */
    public static function signedUrl(string $ulid): string
    {
        return URL::signedRoute('ticket.public', ['ulid' => $ulid], now()->addDays(7));
    }
}
