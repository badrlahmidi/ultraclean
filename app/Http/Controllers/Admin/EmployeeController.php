<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date'],
        ]);

        $period = $request->query('period', 'month');
        [$from, $to] = $this->resolvePeriod($period, $request);        /* ── Stats par laveur — via assigned_to (legacy + lead) ── */
        $washers = User::where('role', 'laveur')
            ->withTrashed()
            ->orderBy('name')
            ->get(['id', 'name', 'is_active', 'created_at', 'deleted_at']);

        $washerStats = DB::table('tickets')
            ->whereBetween('tickets.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->whereNotNull('tickets.assigned_to')
            ->groupBy('tickets.assigned_to')
            ->select(
                'tickets.assigned_to as user_id',
                DB::raw('COUNT(*) as tickets_total'),
                DB::raw("COUNT(CASE WHEN tickets.status IN ('completed','paid') THEN 1 END) as tickets_completed"),
                DB::raw("SUM(CASE WHEN tickets.status = 'paid' THEN tickets.total_cents ELSE 0 END) as revenue_cents"),
                DB::raw("AVG(CASE WHEN tickets.started_at IS NOT NULL AND tickets.completed_at IS NOT NULL
                    THEN TIMESTAMPDIFF(SECOND, tickets.started_at, tickets.completed_at)
                    ELSE NULL END) as avg_duration_seconds"),
                DB::raw("MIN(tickets.started_at) as first_started"),
                DB::raw("MAX(tickets.completed_at) as last_completed")
            )
            ->get()
            ->keyBy('user_id');

        /* ── Stats supplémentaires via ticket_washers (durée précise + rôle assistant) ── */
        $washerPivotStats = DB::table('ticket_washers')
            ->join('tickets', 'tickets.id', '=', 'ticket_washers.ticket_id')
            ->whereBetween('tickets.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->whereNotNull('ticket_washers.started_at')
            ->whereNotNull('ticket_washers.ended_at')
            ->groupBy('ticket_washers.user_id')
            ->select(
                'ticket_washers.user_id',
                DB::raw('COUNT(DISTINCT ticket_washers.ticket_id) as tw_tickets'),
                DB::raw("COUNT(DISTINCT CASE WHEN ticket_washers.role = 'assistant' THEN ticket_washers.ticket_id END) as as_assistant"),
                DB::raw("AVG(TIMESTAMPDIFF(SECOND, ticket_washers.started_at, ticket_washers.ended_at)) as tw_avg_duration_seconds")
            )
            ->get()
            ->keyBy('user_id');

        $result = $washers->map(function (User $washer) use ($washerStats, $washerPivotStats) {
            /** @var \stdClass|null $stats */
            $stats      = $washerStats->get($washer->id);
            /** @var \stdClass|null $pivotStats */
            $pivotStats = $washerPivotStats->get($washer->id);

            $ticketsCompleted   = $stats !== null ? (int) $stats->tickets_completed : 0;
            $ticketsTotal       = $stats !== null ? (int) $stats->tickets_total : 0;
            $revenueCents       = $stats !== null ? (int) $stats->revenue_cents : 0;

                        // Préférer la durée moyenne issue de ticket_washers (started_at/ended_at précis)
            $rawAvgSeconds = $pivotStats !== null
                ? ($pivotStats->tw_avg_duration_seconds ?? ($stats !== null ? ($stats->avg_duration_seconds ?? 0) : 0))
                : ($stats !== null ? ($stats->avg_duration_seconds ?? 0) : 0);
            $avgDurationSeconds = (float) $rawAvgSeconds;
            $avgDurationMinutes = $avgDurationSeconds > 0 ? round($avgDurationSeconds / 60, 1) : null;

            // Tickets en tant qu'assistant
            $asAssistant = $pivotStats !== null ? (int) $pivotStats->as_assistant : 0;

            // Tickets per hour: based on total active time span
            $ticketsPerHour = null;
                        if ($stats !== null && $stats->first_started && $stats->last_completed && $ticketsCompleted > 0) {
                $spanHours = Carbon::parse($stats->first_started)
                    ->diffInMinutes(Carbon::parse($stats->last_completed)) / 60;
                if ($spanHours > 0) {
                    $ticketsPerHour = round($ticketsCompleted / $spanHours, 1);
                }
            }

            return [
                'id'                   => $washer->id,
                'name'                 => $washer->name,
                'is_active'            => $washer->is_active,
                'deleted_at'           => $washer->deleted_at,
                'tickets_total'        => $ticketsTotal,
                'tickets_completed'    => $ticketsCompleted,
                'tickets_as_assistant' => $asAssistant,
                'revenue_cents'        => $revenueCents,
                'avg_duration_minutes' => $avgDurationMinutes,
                'tickets_per_hour'     => $ticketsPerHour,
            ];
        });

        /* ── Tendance par laveur (top 5, par semaine ou jour) ── */
        $trend = DB::table('tickets')
            ->whereBetween('tickets.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->whereNotNull('tickets.assigned_to')
            ->whereIn('tickets.status', ['completed', 'paid'])
            ->join('users', 'users.id', '=', 'tickets.assigned_to')
            ->groupBy('day', 'users.name')
            ->select(
                DB::raw('DATE(tickets.created_at) as day'),
                'users.name',
                DB::raw('COUNT(*) as tickets')
            )
            ->orderBy('day')
            ->get();

        return Inertia::render('Admin/Employees/Index', [
            'washers' => $result->values(),
            'trend'   => $trend,
            'filters' => [
                'period' => $period,
                'from'   => $from->toDateString(),
                'to'     => $to->toDateString(),
            ],
        ]);
    }

    private function resolvePeriod(string $period, Request $request): array
    {
        $now = Carbon::now('Africa/Casablanca');

        return match ($period) {
            'today'  => [$now->copy()->startOfDay(),   $now->copy()->endOfDay()],
            'week'   => [$now->copy()->startOfWeek(),  $now->copy()->endOfWeek()],
            'year'   => [$now->copy()->startOfYear(),  $now->copy()->endOfYear()],
            'custom' => [
                Carbon::parse($request->query('from', $now->toDateString())),
                Carbon::parse($request->query('to',   $now->toDateString())),
            ],
            default  => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
        };
    }
}
