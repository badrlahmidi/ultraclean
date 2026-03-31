<?php

namespace App\Http\Controllers\Laveur;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StatsController extends Controller
{
    public function index(Request $request): Response
    {
        $user   = auth()->user();
        $period = $request->query('period', 'week');

        $from = match ($period) {
            'today'  => now()->startOfDay(),
            'week'   => now()->startOfWeek(),
            'month'  => now()->startOfMonth(),
            'year'   => now()->startOfYear(),
            default  => now()->startOfWeek(),
        };

        // Tickets completed or paid by this laveur in period
        $baseQuery = Ticket::where('assigned_to', $user->id)
            ->whereIn('status', ['completed', 'paid'])
            ->where('completed_at', '>=', $from);

        // KPIs
        $totalTickets = (clone $baseQuery)->count();
        $totalRevenue = (clone $baseQuery)->sum('total_cents');

        // Avg duration minutes (completed_at - started_at)
        $avgDuration = (clone $baseQuery)
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->selectRaw("AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at) / 60.0) as avg_min")
            ->value('avg_min');

        // Best day (most tickets)
        $byDay = (clone $baseQuery)
            ->selectRaw("date(completed_at) as day, COUNT(*) as count, SUM(total_cents) as revenue")
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        // All-time rank among active laveurs
        $rankData = DB::table('tickets')
            ->whereIn('status', ['completed', 'paid'])
            ->whereNotNull('assigned_to')
            ->selectRaw('assigned_to, COUNT(*) as cnt')
            ->groupBy('assigned_to')
            ->orderByDesc('cnt')
            ->get();

        $rank = null;
        $total = $rankData->count();
        foreach ($rankData as $i => $r) {
            if ($r->assigned_to == $user->id) {
                $rank = $i + 1;
                break;
            }
        }

        // Recent tickets
        $recentTickets = Ticket::where('assigned_to', $user->id)
            ->whereIn('status', ['completed', 'paid', 'in_progress'])
            ->with(['vehicleType', 'vehicleBrand'])
            ->orderByDesc('completed_at')
            ->limit(10)
            ->get(['id', 'ticket_number', 'status', 'vehicle_plate', 'vehicle_brand',
                   'vehicle_brand_id', 'total_cents', 'started_at', 'completed_at']);

        return Inertia::render('Laveur/Stats', [
            'period'        => $period,
            'kpis'          => [
                'total_tickets'   => $totalTickets,
                'total_revenue'   => (int) $totalRevenue,
                'avg_duration'    => $avgDuration ? round($avgDuration, 1) : null,
                'rank'            => $rank,
                'rank_total'      => $total,
            ],
            'dailyTrend'    => $byDay,
            'recentTickets' => $recentTickets,
        ]);
    }
}
