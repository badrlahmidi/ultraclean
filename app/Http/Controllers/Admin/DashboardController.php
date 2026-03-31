<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Service;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = today();

        // --- Tickets aujourd'hui ---
        $ticketsToday = Ticket::whereDate('created_at', $today);

        $stats = [
            'tickets_today'    => (clone $ticketsToday)->count(),
            'tickets_pending'  => Ticket::where('status', 'pending')->count(),
            'tickets_wip'      => Ticket::where('status', 'in_progress')->count(),
            'revenue_today'    => (clone $ticketsToday)->where('status', 'paid')->sum('total_cents'),
            'revenue_month'    => Ticket::whereMonth('created_at', $today->month)
                                        ->whereYear('created_at', $today->year)
                                        ->where('status', 'paid')
                                        ->sum('total_cents'),
            'active_users'     => User::where('is_active', true)->count(),
            'active_shifts'    => Shift::whereNull('closed_at')->count(),
        ];

        // Répartition par statut aujourd'hui
        $statusBreakdown = Ticket::whereDate('created_at', $today)
            ->groupBy('status')
            ->select('status', DB::raw('count(*) as count'))
            ->pluck('count', 'status');

        // Chiffre d'affaires 7 derniers jours
        $revenueTrend = Ticket::where('status', 'paid')
            ->where('paid_at', '>=', now()->subDays(7))
            ->groupBy(DB::raw('DATE(paid_at)'))
            ->select(DB::raw('DATE(paid_at) as date'), DB::raw('SUM(total_cents) as total'))
            ->orderBy('date')
            ->get();

        // Top services du mois
        $topServices = DB::table('ticket_services')
            ->join('tickets', 'tickets.id', '=', 'ticket_services.ticket_id')
            ->where('tickets.status', 'paid')
            ->whereMonth('tickets.paid_at', $today->month)
            ->groupBy('ticket_services.service_name')
            ->select('ticket_services.service_name', DB::raw('count(*) as count'), DB::raw('SUM(ticket_services.line_total_cents) as revenue'))
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats'          => $stats,
            'statusBreakdown'=> $statusBreakdown,
            'revenueTrend'   => $revenueTrend,
            'topServices'    => $topServices,
        ]);
    }
}
