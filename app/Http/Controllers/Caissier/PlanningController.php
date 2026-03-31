<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class PlanningController extends Controller
{
    public function index(): Response
    {
        $with = ['client', 'vehicleBrand', 'assignedTo', 'services.service'];

        $today = today();

        /* En attente — créés aujourd'hui */
        $pending = Ticket::with($with)
            ->where('status', Ticket::STATUS_PENDING)
            ->whereDate('created_at', $today)
            ->oldest()
            ->get();

        /* En cours */
        $inProgress = Ticket::with($with)
            ->where('status', 'in_progress')
            ->whereDate('created_at', $today)
            ->oldest()
            ->get();

        /* Terminés aujourd'hui (limités à 30) */
        $done = Ticket::with($with)
            ->where('status', 'completed')
            ->whereDate('created_at', $today)
            ->latest('updated_at')
            ->limit(30)
            ->get();

        /*
         * En retard :
         *   - due_at dépassé
         *   - statut pas encore terminé / annulé
         *   - peut chevaucher pending / in_progress (ils apparaissent dans les deux colonnes)
         */
        $overdue = Ticket::with($with)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->oldest('due_at')
            ->get();

        $washers = User::where('role', User::ROLE_LAVEUR)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar']);

        return Inertia::render('Caissier/Planning', [
            'columns' => [
                'pending'     => $pending,
                'in_progress' => $inProgress,
                'done'        => $done,
                'overdue'     => $overdue,
            ],
            'washers' => $washers,
            'now'     => now()->toIso8601String(),
        ]);
    }
}
