<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Expense;
use App\Models\Shift;
use App\Services\ShiftService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function index(): Response
    {
        $user  = auth()->user();
        $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

        $history = Shift::with('user')
            ->where('user_id', $user->id)
            ->whereNotNull('closed_at')
            ->orderByDesc('opened_at')
            ->limit(10)
            ->get();

        // ── Per-method payment breakdown for the active shift ──────────────
        // Filter by time window (payments.created_at >= shift.opened_at) rather
        // than tickets.shift_id, so payments on older tickets are included.
        $paymentBreakdown = null;
        if ($shift) {
            $paymentBreakdown = DB::table('payments')
                ->join('tickets', 'tickets.id', '=', 'payments.ticket_id')
                ->where('payments.processed_by', $shift->user_id)
                ->where('payments.created_at', '>=', $shift->opened_at)
                ->selectRaw("
                    COALESCE(SUM(payments.amount_cash_cents),   0) as cash_cents,
                    COALESCE(SUM(payments.amount_card_cents),   0) as card_cents,
                    COALESCE(SUM(payments.amount_mobile_cents), 0) as mobile_cents,
                    COALESCE(SUM(payments.amount_wire_cents),   0) as wire_cents,
                    COALESCE(SUM(CASE WHEN payments.method = 'credit' THEN tickets.total_cents ELSE 0 END), 0) as credit_deferred_cents,
                    COUNT(CASE WHEN payments.method = 'credit' THEN 1 END)  as credit_count,
                    COUNT(DISTINCT tickets.id)                              as ticket_count,
                    COUNT(CASE WHEN tickets.status = 'paid' THEN 1 END)     as paid_count,
                    COALESCE(SUM(CASE WHEN tickets.status = 'paid' THEN tickets.total_cents ELSE 0 END), 0) as paid_revenue_cents,
                    COALESCE(SUM(CASE WHEN tickets.status = 'partial' THEN tickets.balance_due_cents ELSE 0 END), 0) as pending_balance_cents
                ")
                ->first();
        }

        return Inertia::render('Caissier/Shift/Index', [
            'activeShift'      => $shift,
            'paymentBreakdown' => $paymentBreakdown,
            'history'          => $history,
        ]);
    }

    public function history(Request $request): Response
    {
        $user = auth()->user();

        // Admins see all shifts; caissiers only see their own
        $query = Shift::with('user')
            ->whereNotNull('closed_at')
            ->orderByDesc('opened_at');

        if ($user->role === 'caissier') {
            $query->where('user_id', $user->id);
        }

        $shifts = $query->paginate(20)->through(function (Shift $s) {
            // Tickets in this shift
            /** @var \stdClass|null $ticketStats */
            $ticketStats = DB::table('tickets')
                ->where('shift_id', $s->id)
                ->selectRaw("COUNT(*) as total, COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid, SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END) as revenue")
                ->first();

            $durationMinutes = $s->opened_at && $s->closed_at
                ? round($s->opened_at->diffInMinutes($s->closed_at))
                : null;

            return [
                'id'                   => $s->id,
                'user'                 => $s->user instanceof \App\Models\User ? $s->user->name : null,
                'opened_at'            => $s->opened_at,
                'closed_at'            => $s->closed_at,
                'duration_minutes'     => $durationMinutes,
                'opening_cash_cents'   => $s->opening_cash_cents,
                'closing_cash_cents'   => $s->closing_cash_cents,
                'expected_cash_cents'  => $s->expected_cash_cents,
                'difference_cents'     => $s->difference_cents,
                'notes'                => $s->notes,
                'tickets_total'        => $ticketStats !== null ? (int) $ticketStats->total : 0,
                'tickets_paid'         => $ticketStats !== null ? (int) $ticketStats->paid : 0,
                'revenue_cents'        => $ticketStats !== null ? (int) $ticketStats->revenue : 0,
            ];
        });

        // Aggregate totals across all visible shifts
        $totalsQuery = Shift::whereNotNull('closed_at');
        if ($user->role === 'caissier') {
            $totalsQuery->where('user_id', $user->id);
        }
        $totals = $totalsQuery->selectRaw(
            'COUNT(*) as shift_count,
             SUM(closing_cash_cents) as total_closing,
             SUM(expected_cash_cents) as total_expected,
             SUM(difference_cents) as total_difference'
        )->first();

        return Inertia::render('Caissier/Shift/History', [
            'shifts' => $shifts,
            'totals' => $totals,
        ]);
    }

    /** Ouvrir un nouveau shift. */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'opening_cash_cents' => ['required', 'integer', 'min:0'],
        ]);

        try {
            $shift = app(ShiftService::class)->openShift(
                auth()->user(),
                (int) $request->opening_cash_cents
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        ActivityLog::log('shift.opened', $shift, [
            'opening_cash_cents' => $request->opening_cash_cents,
        ]);

        return back()->with('success', 'Shift ouvert avec succès.');
    }

    /** Fermer le shift courant. */
    public function close(Request $request, Shift $shift): RedirectResponse
    {
        $this->authorize('close', $shift);

        $request->validate([
            'closing_cash_cents' => ['required', 'integer', 'min:0'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        abort_if($shift->closed_at !== null, 422, 'Ce shift est déjà fermé.');

        $result = app(ShiftService::class)->closeShift(
            $shift,
            (int) $request->closing_cash_cents,
            $request->notes,
        );

        ActivityLog::log('shift.closed', $result['shift'], [
            'closing_cash_cents' => $request->closing_cash_cents,
            'expected_cents'     => $result['expected_cash_cents'],
            'difference_cents'   => $result['difference_cents'],
        ]);

        return redirect()->route('caissier.shift.index')
                         ->with('success', 'Shift fermé avec succès.');
    }

    /** Rapport Z — données complètes pour impression. */
    public function rapport(Shift $shift): Response
    {
        // Seul le caissier propriétaire ou un admin peut consulter
        $user = auth()->user();
        abort_if(
            $user->role === 'caissier' && $shift->user_id !== $user->id,
            403
        );        // ── Ventilation paiements ──────────────────────────────────────────
        // Time-window based: all payments processed by this user during the shift.
        $breakdown = DB::table('payments')
            ->join('tickets', 'tickets.id', '=', 'payments.ticket_id')
            ->where('payments.processed_by', $shift->user_id)
            ->where('payments.created_at', '>=', $shift->opened_at)
            ->when($shift->closed_at, fn ($q) => $q->where('payments.created_at', '<=', $shift->closed_at))
            ->selectRaw("
                COALESCE(SUM(payments.amount_cash_cents),   0) AS cash_cents,
                COALESCE(SUM(payments.amount_card_cents),   0) AS card_cents,
                COALESCE(SUM(payments.amount_mobile_cents), 0) AS mobile_cents,
                COALESCE(SUM(payments.amount_wire_cents),   0) AS wire_cents,
                COALESCE(SUM(CASE WHEN payments.method = 'credit'
                               THEN tickets.total_cents ELSE 0 END), 0) AS credit_deferred_cents,
                COUNT(CASE WHEN payments.method = 'credit' THEN 1 END) AS credit_count,
                COUNT(DISTINCT tickets.id)                              AS ticket_count,
                COUNT(CASE WHEN tickets.status = 'paid'    THEN 1 END) AS paid_count,
                COALESCE(SUM(CASE WHEN tickets.status = 'paid'
                               THEN tickets.total_cents ELSE 0 END), 0) AS paid_revenue_cents,
                COALESCE(SUM(CASE WHEN tickets.status = 'partial'
                               THEN tickets.balance_due_cents ELSE 0 END), 0) AS pending_balance_cents
            ")
            ->first();

        // ── Dépenses du shift ──────────────────────────────────────────────
        $expenses = [];
        $expensesTotal = 0;
        try {
            $expenseRows = Expense::where('shift_id', $shift->id)
                ->orderBy('created_at')
                ->get();
            $expenses      = $expenseRows->map(fn($e) => [
                'id'           => $e->id,
                'category'     => $e->category,
                'label'        => $e->label,
                'amount_cents' => $e->amount_cents,
                'paid_with'    => $e->paid_with,
                'date'         => $e->date?->toDateString(),
            ])->toArray();
            $expensesTotal = (int) $expenseRows->sum('amount_cents');
        } catch (\Throwable) {
            // table absente — Phase 2 non migrée
        }

        $totalCollected = (int) (
            ($breakdown->cash_cents ?? 0) +
            ($breakdown->card_cents ?? 0) +
            ($breakdown->mobile_cents ?? 0) +
            ($breakdown->wire_cents ?? 0)
        );

        return Inertia::render('Caissier/Shift/ZReport', [
            'shift'          => $shift->load('user'),
            'breakdown'      => $breakdown,
            'expenses'       => $expenses,
            'expenses_total' => $expensesTotal,
            'net_revenue'    => $totalCollected - $expensesTotal,
        ]);
    }
}
