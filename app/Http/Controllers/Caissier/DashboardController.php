<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user  = auth()->user();
        $today = today();
        $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

        $ticketsToday = Ticket::whereDate('created_at', $today);

        $stats = [
            'tickets_today'   => (clone $ticketsToday)->count(),
            'tickets_pending' => Ticket::where('status', 'pending')->count(),
            'tickets_wip'     => Ticket::where('status', 'in_progress')->count(),
            'revenue_today'   => (clone $ticketsToday)->where('status', 'paid')->sum('total_cents'),
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
