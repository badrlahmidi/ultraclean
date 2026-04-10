<?php

namespace App\Http\Controllers\Laveur;

use App\Events\TicketStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function index(): Response
    {        // Tickets actifs + tickets prépayés/partiels en attente de lavage
        $tickets = Ticket::with(['vehicleType', 'services', 'client', 'assignedTo', 'washers'])
            ->where(function ($q) {
                $q->whereIn('status', ['pending', 'in_progress'])
                  ->orWhere(function ($q2) {
                      // Prépayés en totalité avant lavage
                      $q2->where('status', 'paid')
                         ->where('is_prepaid', true)
                         ->whereNull('completed_at');
                  })
                  ->orWhere(function ($q3) {
                      // Avance partielle déposée avant lavage (partial + not yet washed)
                      $q3->where('status', 'partial')
                         ->whereNull('completed_at');
                  });
            })
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'pending' THEN 2 WHEN 'paid' THEN 3 WHEN 'partial' THEN 4 ELSE 5 END")
            ->orderBy('created_at')
            ->get();

        $laveurs = User::where('role', 'laveur')
            ->where('is_active', true)
            ->get(['id', 'name']);        return Inertia::render('Laveur/Queue', [
            'tickets'   => $tickets,
            'laveurs'   => $laveurs,
            'serverNow' => now()->toISOString(),
        ]);
    }    /** Le laveur prend en charge un ticket (pending → in_progress). */
    public function start(Request $request, Ticket $ticket): RedirectResponse
    {
        $this->authorize('updateStatus', $ticket);

        $user = auth()->user();

        // Vérifier que le ticket est assigné à ce laveur ou non assigné (auto-attribution)
        if ($ticket->assigned_to && (int) $ticket->assigned_to !== (int) $user->id) {
            // Allow admins & caissiers to start on behalf — but not other laveurs
            abort_unless($user->hasRole(['admin', 'caissier']), 403, 'Ce ticket est assigné à un autre laveur.');
        }

        $ticket->transitionTo(Ticket::STATUS_IN_PROGRESS, [
            'assigned_to' => $user->id,
        ]);

        // Sync ticket_washers : enregistrer started_at du lead
        TicketWasher::updateOrCreate(
            ['ticket_id' => $ticket->id, 'user_id' => $user->id],
            ['role' => TicketWasher::ROLE_LEAD, 'started_at' => now()]
        );

        ActivityLog::log('ticket.started', $ticket, [
            'ticket_number' => $ticket->ticket_number,
            'laveur'        => $user->name,
        ]);

        TicketStatusUpdated::dispatch($ticket, Ticket::STATUS_PENDING);

        return back()->with('success', "Ticket {$ticket->ticket_number} démarré.");
    }    /** Marquer un ticket comme terminé (in_progress → completed). */
    public function complete(Ticket $ticket): RedirectResponse
    {
        $this->authorize('updateStatus', $ticket);

        $ticket->transitionTo(Ticket::STATUS_COMPLETED);

        // Sync ticket_washers : ended_at pour tous les laveurs encore en cours
        TicketWasher::where('ticket_id', $ticket->id)
            ->whereNull('ended_at')
            ->update(['ended_at' => now()]);

        ActivityLog::log('ticket.completed', $ticket, [
            'ticket_number' => $ticket->ticket_number,
        ]);

        TicketStatusUpdated::dispatch($ticket, Ticket::STATUS_IN_PROGRESS);

        return back()->with('success', "Ticket {$ticket->ticket_number} terminé — en attente de paiement.");
    }
}
