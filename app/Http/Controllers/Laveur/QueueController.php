<?php

namespace App\Http\Controllers\Laveur;

use App\Events\TicketStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function index(): Response
    {
        // Tickets actifs triés par priorité
        $tickets = Ticket::with(['vehicleType', 'services', 'client', 'assignedTo'])
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderByRaw("FIELD(status, 'in_progress', 'pending')")
            ->orderBy('created_at')
            ->get();

        $laveurs = User::where('role', 'laveur')
            ->where('is_active', true)
            ->get(['id', 'name']);

        return Inertia::render('Laveur/Queue', [
            'tickets' => $tickets,
            'laveurs' => $laveurs,
        ]);
    }

    /** Le laveur prend en charge un ticket (pending → in_progress). */
    public function start(Request $request, Ticket $ticket): RedirectResponse
    {
        $user = auth()->user();

        $ticket->transitionTo(Ticket::STATUS_IN_PROGRESS, [
            'assigned_to' => $user->id,
        ]);        ActivityLog::log('ticket.started', $ticket, [
            'ticket_number' => $ticket->ticket_number,
            'laveur'        => $user->name,
        ]);

        TicketStatusUpdated::dispatch($ticket, Ticket::STATUS_PENDING);

        return back()->with('success', "Ticket {$ticket->ticket_number} démarré.");
    }

    /** Marquer un ticket comme terminé (in_progress → completed). */
    public function complete(Ticket $ticket): RedirectResponse
    {
        $ticket->transitionTo(Ticket::STATUS_COMPLETED);        ActivityLog::log('ticket.completed', $ticket, [
            'ticket_number' => $ticket->ticket_number,
        ]);

        TicketStatusUpdated::dispatch($ticket, Ticket::STATUS_IN_PROGRESS);

        return back()->with('success', "Ticket {$ticket->ticket_number} terminé — en attente de paiement.");
    }
}
