<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Ticket;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use League\Csv\Writer;
use SplTempFileObject;

class ReportsController extends Controller
{
    public function index(Request $request): \Inertia\Response
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date'],
        ]);

        $period = $request->query('period', 'month');
        [$from, $to] = $this->resolvePeriod($period, $request);

        $data = $this->gatherData($from, $to);

        return Inertia::render('Admin/Reports/Index', array_merge($data, [
            'filters' => [
                'period' => $period,
                'from'   => $from->toDateString(),
                'to'     => $to->toDateString(),
            ],
        ]));
    }

    public function exportPdf(Request $request): \Illuminate\Http\Response
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date'],
        ]);

        $period = $request->query('period', 'month');
        [$from, $to] = $this->resolvePeriod($period, $request);
        $data = $this->gatherData($from, $to);

        $pdf = Pdf::loadView('reports.export', array_merge($data, [
            'from'         => $from->format('d/m/Y'),
            'to'           => $to->format('d/m/Y'),
            'generated_at' => now()->format('d/m/Y H:i'),
        ]))->setPaper('a4', 'portrait');

        $filename = 'rapport_' . $from->format('Y-m-d') . '_' . $to->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    public function exportCsv(Request $request): \Illuminate\Http\Response
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date'],
        ]);

        $period = $request->query('period', 'month');
        [$from, $to] = $this->resolvePeriod($period, $request);
        $data = $this->gatherData($from, $to);

        $csv = Writer::createFromFileObject(new SplTempFileObject());
        $csv->setDelimiter(';');

        $csv->insertOne(['=== RAPPORT ULTRACLEAN ===']);
        $csv->insertOne(['Periode', $from->format('d/m/Y') . ' -> ' . $to->format('d/m/Y')]);
        $csv->insertOne(['Genere le', now()->format('d/m/Y H:i')]);
        $csv->insertOne([]);

        $csv->insertOne(['--- RESUME ---']);
        $csv->insertOne(['Indicateur', 'Valeur']);
        $csv->insertOne(['Tickets total', $data['stats']['total_tickets']]);
        $csv->insertOne(['Tickets payes', $data['stats']['paid_tickets']]);
        $csv->insertOne(['Tickets annules', $data['stats']['cancelled_tickets']]);
        $csv->insertOne(['En cours / en attente', $data['stats']['pending_tickets']]);
        $csv->insertOne(['CA (MAD)', number_format($data['stats']['revenue'] / 100, 2, '.', '')]);
        $csv->insertOne(['Ticket moyen (MAD)', number_format(($data['stats']['avg_ticket'] ?? 0) / 100, 2, '.', '')]);
        $csv->insertOne([]);

        $csv->insertOne(['--- TENDANCE CA PAR JOUR ---']);
        $csv->insertOne(['Date', 'Tickets', 'CA (MAD)']);
        foreach ($data['revenueTrend'] as $row) {
            $csv->insertOne([
                $row['date'],
                $row['tickets'],
                number_format($row['revenue'] / 100, 2, '.', ''),
            ]);
        }
        $csv->insertOne([]);

        $csv->insertOne(['--- TOP SERVICES ---']);
        $csv->insertOne(['Service', 'Frequence', 'Quantite', 'CA (MAD)']);
        foreach ($data['topServices'] as $s) {
            $csv->insertOne([
                $s->name,
                $s->count,
                $s->qty,
                number_format($s->revenue / 100, 2, '.', ''),
            ]);
        }
        $csv->insertOne([]);

        $csv->insertOne(['--- MODES DE PAIEMENT ---']);
        $csv->insertOne(['Mode', 'Transactions', 'Total (MAD)']);
        foreach ($data['paymentMethods'] as $m) {
            $csv->insertOne([
                $m->method,
                $m->count,
                number_format($m->total / 100, 2, '.', ''),
            ]);
        }
        $csv->insertOne([]);

        $csv->insertOne(['--- TYPES DE VEHICULES ---']);
        $csv->insertOne(['Type', 'Tickets', 'CA (MAD)']);
        foreach ($data['vehicleBreakdown'] as $v) {
            $csv->insertOne([
                $v->name,
                $v->count,
                number_format($v->revenue / 100, 2, '.', ''),
            ]);
        }

        $filename = 'rapport_' . $from->format('Y-m-d') . '_' . $to->format('Y-m-d') . '.csv';

        return response((string) $csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /* ─────────────────────────────────────────── */

    private function gatherData(Carbon $from, Carbon $to): array
    {
        /* ── Tickets dans la période ── */
        $base = Ticket::whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()]);        $stats = [
            'total_tickets'     => (clone $base)->count(),
            'paid_tickets'      => (clone $base)->where('status', 'paid')->count(),
            'cancelled_tickets' => (clone $base)->where('status', 'cancelled')->count(),
            'pending_tickets'   => (clone $base)->whereIn('status', ['pending', 'in_progress', 'completed'])->count(),
            'revenue'           => (clone $base)->where('status', 'paid')->sum('total_cents'),
            'avg_ticket'        => (clone $base)->where('status', 'paid')->avg('total_cents') ?? 0,
        ];

        $revenueTrend = Ticket::where('status', 'paid')
            ->whereBetween('paid_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('day')
            ->select(
                DB::raw('DATE(paid_at) as day'),
                DB::raw('COUNT(*) as tickets'),
                DB::raw('SUM(total_cents) as revenue')
            )
            ->orderBy('day')
            ->get()
            ->map(fn ($r) => [
                'date'    => $r->day,
                'revenue' => (int) $r->revenue,
                'tickets' => (int) $r->tickets,
            ]);

        $statusBreakdown = Ticket::whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('status')
            ->select('status', DB::raw('COUNT(*) as count'))
            ->get()
            ->mapWithKeys(fn ($r) => [$r->status => $r->count]);

        $topServices = DB::table('ticket_services')
            ->join('tickets', 'tickets.id', '=', 'ticket_services.ticket_id')
            ->where('tickets.status', 'paid')
            ->whereBetween('tickets.paid_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('ticket_services.service_name')
            ->select(
                'ticket_services.service_name as name',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(ticket_services.line_total_cents) as revenue'),
                DB::raw('SUM(ticket_services.quantity) as qty')
            )
            ->orderByDesc('count')
            ->limit(8)
            ->get();

        $paymentMethods = DB::table('payments')
            ->join('tickets', 'tickets.id', '=', 'payments.ticket_id')
            ->whereBetween('payments.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('payments.method')
            ->select(
                'payments.method',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(payments.amount_cents) as total')
            )
            ->get();

        $shifts = Shift::with('user')
            ->whereBetween('opened_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->whereNotNull('closed_at')
            ->orderByDesc('opened_at')
            ->limit(20)
            ->get()
            ->map(fn ($s) => [
                'id'                 => $s->id,
                'user'               => $s->user?->name,
                'opened_at'          => $s->opened_at,
                'closed_at'          => $s->closed_at,
                'opening_cash_cents' => $s->opening_cash_cents,
                'closing_cash_cents' => $s->closing_cash_cents,
                'difference_cents'   => $s->difference_cents,
            ]);

        $vehicleBreakdown = Ticket::whereBetween('tickets.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->where('tickets.status', 'paid')
            ->join('vehicle_types', 'vehicle_types.id', '=', 'tickets.vehicle_type_id')
            ->groupBy('vehicle_types.name')
            ->select('vehicle_types.name', DB::raw('COUNT(*) as count'), DB::raw('SUM(tickets.total_cents) as revenue'))
            ->get();

        return compact('stats', 'revenueTrend', 'statusBreakdown', 'topServices', 'paymentMethods', 'shifts', 'vehicleBreakdown');
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
            default  => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()], // month
        };
    }
}
