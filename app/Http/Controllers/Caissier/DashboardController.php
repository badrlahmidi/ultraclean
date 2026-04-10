<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Shift;
use App\Models\Ticket;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user  = auth()->user();
        $today = today();
        $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

        // CA du jour = somme des paiements encaissés aujourd'hui (date paiement, pas date ticket)
        $revenueToday = Payment::whereDate('created_at', $today)->sum('amount_cents');

        // CA du shift actif = somme des paiements encaissés PENDANT le shift
        // (pas basé sur tickets.shift_id, car un ticket peut être créé dans un
        //  shift précédent puis encaissé dans le shift courant)
        $revenueShift = null;
        $expensesShift = 0;
        if ($shift) {
            $revenueShift = (int) Payment::where('processed_by', $user->id)
                ->where('created_at', '>=', $shift->opened_at)
                ->sum('amount_cents');

            // Dépenses du shift (Phase 2 — 0 si table absente)
            try {
                $expensesShift = (int) Expense::where('shift_id', $shift->id)->sum('amount_cents');
            } catch (\Throwable) {
                $expensesShift = 0;
            }
        }

        $ticketsToday = Ticket::whereDate('created_at', $today);

        $stats = [
            'tickets_today'   => (clone $ticketsToday)->count(),
            'tickets_pending' => Ticket::where('status', 'pending')->count(),
            'tickets_wip'     => Ticket::where('status', 'in_progress')->count(),
            // CA cohérent : basé sur date de paiement, pas de création du ticket
            'revenue_today'   => $revenueToday,
            // CA spécifique au shift ouvert (null si aucun shift)
            'revenue_shift'   => $revenueShift,
            'expenses_shift'  => $expensesShift,
            'net_shift'       => $revenueShift !== null ? $revenueShift - $expensesShift : null,
        ];

        $recentTickets = Ticket::with(['vehicleType', 'services'])
            ->whereDate('created_at', $today)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return Inertia::render('Caissier/Dashboard', [
            'stats'         => $stats,
            'recentTickets' => $recentTickets,
            'activeShift'   => $shift,
        ]);
    }
}
