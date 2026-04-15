<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
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
{    /* ── Tab aliases (alternative rapide — même page, onglet pré-sélectionné) ── */

    public function indexTickets(Request $r): \Inertia\Response  { return $this->indexWithTab($r, 'tickets');  }
    public function indexCaisse(Request $r): \Inertia\Response   { return $this->indexWithTab($r, 'caisse');   }
    public function indexVehicles(Request $r): \Inertia\Response { return $this->indexWithTab($r, 'vehicles'); }
    public function indexShifts(Request $r): \Inertia\Response   { return $this->indexWithTab($r, 'shifts');   }

    private function indexWithTab(Request $r, string $tab): \Inertia\Response
    {
        $r->merge(['tab' => $tab]);
        return $this->index($r);
    }

    public function index(Request $request): \Inertia\Response
    {        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date_format:Y-m-d'],
            'to'     => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $period = $request->query('period', 'month');
        [$from, $to] = $this->resolvePeriod($period, $request);

        $data = $this->gatherData($from, $to);

        return Inertia::render('Admin/Reports/Index', array_merge($data, [
            'filters' => [
                'period'    => $period,
                'from'      => $from->toDateString(),
                'to'        => $to->toDateString(),
                'activeTab' => $request->query('tab', 'tickets'),
            ],
        ]));
    }    public function exportPdf(Request $request): \Illuminate\Http\Response
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date_format:Y-m-d'],
            'to'     => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
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
    }    public function exportCsv(Request $request): \Illuminate\Http\Response
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month,year,custom'],
            'from'   => ['nullable', 'date_format:Y-m-d'],
            'to'     => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
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
        $csv->insertOne(['Tickets prepaye', $data['prepaidStats']['count']]);
        $csv->insertOne(['CA (MAD)', number_format($data['stats']['revenue'] / 100, 2, '.', '')]);
        $csv->insertOne(['Ticket moyen (MAD)', number_format(($data['stats']['avg_ticket'] ?? 0) / 100, 2, '.', '')]);
        $csv->insertOne(['Remises totales (MAD)', number_format($data['totalDiscounts'] / 100, 2, '.', '')]);
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

        $csv->insertOne(['--- TOP PRODUITS ---']);
        $csv->insertOne(['Produit', 'Frequence', 'Quantite', 'CA (MAD)']);
        foreach ($data['topProducts'] as $p) {
            $csv->insertOne([
                $p->name,
                $p->count,
                $p->qty,
                number_format($p->revenue / 100, 2, '.', ''),
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
        $csv->insertOne([]);        $csv->insertOne(['--- TYPES DE VEHICULES ---']);
        $csv->insertOne(['Type', 'Tickets', 'CA (MAD)']);
        foreach ($data['vehicleBreakdown'] as $v) {
            $csv->insertOne([
                $v->name,
                $v->count,
                number_format($v->revenue / 100, 2, '.', ''),
            ]);
        }
        $csv->insertOne([]);

        $csv->insertOne(['--- DEPENSES ---']);
        $csv->insertOne(['CA brut (MAD)', number_format($data['stats']['revenue'] / 100, 2, '.', '')]);
        $csv->insertOne(['dont Recette Services (MAD)', number_format($data['servicesRevenue'] / 100, 2, '.', '')]);
        $csv->insertOne(['dont Recette Produits (MAD)', number_format($data['productsRevenue'] / 100, 2, '.', '')]);
        $csv->insertOne(['Remises accordees (MAD)', number_format($data['totalDiscounts'] / 100, 2, '.', '')]);
        $csv->insertOne(['Prepaye (nb)', $data['prepaidStats']['count']]);
        $csv->insertOne(['Prepaye (CA MAD)', number_format($data['prepaidStats']['revenue'] / 100, 2, '.', '')]);
        $csv->insertOne(['Total depenses (MAD)', number_format($data['expensesTotal'] / 100, 2, '.', '')]);
        $csv->insertOne(['CA net (MAD)', number_format($data['netRevenue'] / 100, 2, '.', '')]);
        $csv->insertOne([]);

        $csv->insertOne(['--- DEPENSES PAR CATEGORIE ---']);
        $csv->insertOne(['Categorie', 'Nb', 'Total (MAD)']);
        foreach ($data['expensesByCategory'] as $c) {
            $csv->insertOne([
                $c['category'],
                $c['count'],
                number_format($c['total'] / 100, 2, '.', ''),
            ]);
        }
        $csv->insertOne([]);

        $csv->insertOne(['--- DETAIL DEPENSES ---']);
        $csv->insertOne(['Date', 'Categorie', 'Libelle', 'Montant (MAD)', 'Mode', 'Operateur']);
        foreach ($data['expensesList'] as $e) {
            $csv->insertOne([
                $e['date'],
                $e['category'],
                $e['label'],
                number_format($e['amount_cents'] / 100, 2, '.', ''),
                $e['paid_with'],
                $e['user'] ?? '',
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
        $base = Ticket::whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()]);

        $stats = [
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
            ->get()            ->map(fn ($r) => [
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

        // ── Top produits vendus ───────────────────────────────────────────
        $topProducts = DB::table('ticket_products')
            ->join('tickets', 'tickets.id', '=', 'ticket_products.ticket_id')
            ->where('tickets.status', 'paid')
            ->whereBetween('tickets.paid_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->groupBy('ticket_products.product_name')
            ->select(
                'ticket_products.product_name as name',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(ticket_products.line_total_cents) as revenue'),
                DB::raw('SUM(ticket_products.quantity) as qty')
            )
            ->orderByDesc('revenue')
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
            ->get()            ->map(fn (Shift $s) => [
                'id'                 => $s->id,
                'user'               => $s->user instanceof \App\Models\User ? $s->user->name : null,
                'opened_at'          => $s->opened_at,
                'closed_at'          => $s->closed_at,
                'opening_cash_cents' => $s->opening_cash_cents,
                'closing_cash_cents' => $s->closing_cash_cents,
                'difference_cents'   => $s->difference_cents,
            ]);        $vehicleBreakdown = Ticket::whereBetween('tickets.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->where('tickets.status', 'paid')
            ->join('vehicle_types', 'vehicle_types.id', '=', 'tickets.vehicle_type_id')
            ->groupBy('vehicle_types.name')
            ->select('vehicle_types.name', DB::raw('COUNT(*) as count'), DB::raw('SUM(tickets.total_cents) as revenue'))
            ->get();

        // ── Dépenses ──────────────────────────────────────────────────────
        $expenseBase = Expense::whereBetween('date', [$from->copy()->startOfDay(), $to->copy()->endOfDay()]);

        $expensesTotal = (clone $expenseBase)->sum('amount_cents');

        $expensesByCategory = (clone $expenseBase)
            ->groupBy('category')
            ->select('category', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount_cents) as total'))
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'category' => $r->category,
                'count'    => (int) $r->count,
                'total'    => (int) $r->total,
            ]);

        $expensesList = (clone $expenseBase)
            ->with('user:id,name')
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Expense $e) => [
                'id'           => $e->id,
                'date'         => $e->date?->toDateString(),
                'label'        => $e->label,
                'category'     => $e->category,
                'amount_cents' => $e->amount_cents,
                'paid_with'    => $e->paid_with,
                'user'         => $e->user?->name,
            ]);

        $netRevenue = $stats['revenue'] - $expensesTotal;

        // ── Dépenses par méthode de paiement ─────────────────────────────
        $expensesByMethod = (clone $expenseBase)
            ->groupBy('paid_with')
            ->select('paid_with', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount_cents) as total'))
            ->get()
            ->map(fn ($r) => [
                'method' => $r->paid_with,
                'count'  => (int) $r->count,
                'total'  => (int) $r->total,
            ]);

        // ── Séparation Recette Services / Produits ────────────────────────
        $servicesRevenue = (int) DB::table('ticket_services')
            ->join('tickets', 'tickets.id', '=', 'ticket_services.ticket_id')
            ->where('tickets.status', 'paid')
            ->whereBetween('tickets.paid_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->sum('ticket_services.line_total_cents');

        $productsRevenue = (int) DB::table('ticket_products')
            ->join('tickets', 'tickets.id', '=', 'ticket_products.ticket_id')
            ->where('tickets.status', 'paid')
            ->whereBetween('tickets.paid_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->sum('ticket_products.line_total_cents');

        // ── Statistiques Prépayé ──────────────────────────────────────────
        $prepaidStats = [
            'count'   => (clone $base)->where('status', 'paid')->where('is_prepaid', true)->count(),
            'revenue' => (int) (clone $base)->where('status', 'paid')->where('is_prepaid', true)->sum('total_cents'),
        ];

        // ── Total des remises accordées ───────────────────────────────────
        $totalDiscounts = (int) (clone $base)
            ->where('status', 'paid')
            ->sum('discount_cents');

        // ── POS (Point de Vente) — ventes express ─────────────────────────
        $posStats = [
            'total_sales'     => 0,
            'revenue'         => 0,
            'avg_sale'        => 0,
            'total_discounts' => 0,
        ];
        $posTopProducts  = collect();
        $posPaymentMethods = collect();
        $posRevenueTrend   = collect();

        try {
            $posBase = \App\Models\SaleOrder::whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
                ->where('status', 'paid');

            $posStats = [
                'total_sales'     => (clone $posBase)->count(),
                'revenue'         => (int) (clone $posBase)->sum('total_cents'),
                'avg_sale'        => (int) ((clone $posBase)->avg('total_cents') ?? 0),
                'total_discounts' => (int) (clone $posBase)->sum('discount_cents'),
            ];

            $posTopProducts = DB::table('sale_order_lines')
                ->join('sale_orders', 'sale_orders.id', '=', 'sale_order_lines.sale_order_id')
                ->where('sale_orders.status', 'paid')
                ->whereBetween('sale_orders.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
                ->groupBy('sale_order_lines.product_name')
                ->select(
                    'sale_order_lines.product_name as name',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('SUM(sale_order_lines.line_total_cents) as revenue'),
                    DB::raw('SUM(sale_order_lines.quantity) as qty')
                )
                ->orderByDesc('revenue')
                ->limit(10)
                ->get();

            $posPaymentMethods = (clone $posBase)
                ->groupBy('payment_method')
                ->select('payment_method as method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_cents) as total'))
                ->get();

            $posRevenueTrend = (clone $posBase)
                ->groupBy(DB::raw('DATE(created_at)'))
                ->select(
                    DB::raw('DATE(created_at) as day'),
                    DB::raw('COUNT(*) as sales'),
                    DB::raw('SUM(total_cents) as revenue')
                )
                ->orderBy('day')
                ->get()
                ->map(fn ($r) => [
                    'date'    => $r->day,
                    'revenue' => (int) $r->revenue,
                    'sales'   => (int) $r->sales,
                ]);
        } catch (\Throwable) {
            // sale_orders table may not exist in older environments
        }

        return compact(
            'stats', 'revenueTrend', 'statusBreakdown', 'topServices', 'topProducts',
            'paymentMethods', 'shifts', 'vehicleBreakdown',
            'expensesTotal', 'expensesByCategory', 'expensesList', 'expensesByMethod', 'netRevenue',
            'servicesRevenue', 'productsRevenue', 'prepaidStats', 'totalDiscounts',
            'posStats', 'posTopProducts', 'posPaymentMethods', 'posRevenueTrend'
        );
    }    private function resolvePeriod(string $period, Request $request): array
    {
        $now = Carbon::now('Africa/Casablanca');

        return match ($period) {
            'today'  => [$now->copy()->startOfDay(),   $now->copy()->endOfDay()],
            'week'   => [$now->copy()->startOfWeek(),  $now->copy()->endOfWeek()],
            'year'   => [$now->copy()->startOfYear(),  $now->copy()->endOfYear()],
            'custom' => [
                Carbon::createFromFormat('Y-m-d', $request->query('from', $now->toDateString()), 'Africa/Casablanca')->startOfDay(),
                Carbon::createFromFormat('Y-m-d', $request->query('to',   $now->toDateString()), 'Africa/Casablanca')->endOfDay(),
            ],
            default  => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()], // month
        };
    }
}
