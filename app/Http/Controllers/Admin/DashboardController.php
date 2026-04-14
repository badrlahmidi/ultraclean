<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Shift;
use App\Models\StockProduct;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = today();

        // Cache the heavy stats for 60 seconds so repeated page loads don't
        // hammer the database on every request.
        $cacheKey = 'admin_dashboard_' . $today->format('Y-m-d');

        $payload = Cache::remember($cacheKey, 60, function () use ($today) {
            // ── KPI stats ────────────────────────────────────────────────────
            $ticketsToday = Ticket::whereDate('created_at', $today);

            // Single GROUP BY query for live ticket counts instead of separate count() calls.
            $statusCounts = Ticket::whereIn('status', ['pending', 'in_progress'])
                ->groupBy('status')
                ->pluck(DB::raw('count(*)'), 'status');

            $stats = [
                'tickets_today'   => (clone $ticketsToday)->count(),
                'tickets_pending' => (int) ($statusCounts['pending'] ?? 0),
                'tickets_wip'     => (int) ($statusCounts['in_progress'] ?? 0),
                'revenue_today'   => (clone $ticketsToday)->where('status', 'paid')->sum('total_cents'),
                'revenue_month'   => Ticket::whereMonth('created_at', $today->month)
                                          ->whereYear('created_at', $today->year)
                                          ->where('status', 'paid')
                                          ->sum('total_cents'),
                'active_users'    => User::where('is_active', true)->count(),
                'active_shifts'   => Shift::whereNull('closed_at')->count(),
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

            // ── Widgets P3.4 ──────────────────────────────────────────────────

            // RDV du jour (hors annulés / no_show)
            $appointmentsToday = Appointment::whereDate('scheduled_at', $today)
                ->whereNotIn('status', ['cancelled', 'no_show'])
                ->with('client:id,name,phone,vehicle_plate')
                ->orderBy('scheduled_at')
                ->limit(8)
                ->get(['id', 'scheduled_at', 'status', 'client_id', 'vehicle_plate', 'estimated_duration']);

            // Alertes stock bas
            $stockAlertItems = StockProduct::where('is_active', true)
                ->whereRaw('current_quantity <= min_quantity')
                ->orderByRaw('current_quantity / NULLIF(min_quantity, 1)')
                ->limit(5)
                ->get(['id', 'name', 'current_quantity', 'min_quantity', 'unit']);

            // Factures en brouillon à émettre
            $invoicesDraft = Invoice::where('status', 'draft')
                ->with('client:id,name')
                ->latest()
                ->limit(5)
                ->get(['id', 'invoice_number', 'client_id', 'total_cents', 'created_at']);

            return compact(
                'stats', 'statusBreakdown', 'revenueTrend', 'topServices',
                'appointmentsToday', 'stockAlertItems', 'invoicesDraft'
            );
        });

        // Recent activity is intentionally not cached — it should always be fresh.
        $recentActivity = ActivityLog::with('user:id,name,role')
            ->latest()
            ->limit(8)
            ->get(['id', 'action', 'user_id', 'subject_type', 'created_at']);

        return Inertia::render('Admin/Dashboard', array_merge($payload, [
            'recentActivity' => $recentActivity,
        ]));
    }
}
