<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Shift;
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

        return Inertia::render('Caissier/Shift/Index', [
            'activeShift' => $shift,
            'history'     => $history,
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

        $shifts = $query->paginate(20)->through(function ($s) {
            // Tickets in this shift
            $ticketStats = DB::table('tickets')
                ->where('shift_id', $s->id)
                ->selectRaw("COUNT(*) as total, COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid, SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END) as revenue")
                ->first();

            $durationMinutes = $s->opened_at && $s->closed_at
                ? round($s->opened_at->diffInMinutes($s->closed_at))
                : null;

            return [
                'id'                   => $s->id,
                'user'                 => $s->user?->name,
                'opened_at'            => $s->opened_at,
                'closed_at'            => $s->closed_at,
                'duration_minutes'     => $durationMinutes,
                'opening_cash_cents'   => $s->opening_cash_cents,
                'closing_cash_cents'   => $s->closing_cash_cents,
                'expected_cash_cents'  => $s->expected_cash_cents,
                'difference_cents'     => $s->difference_cents,
                'notes'                => $s->notes,
                'tickets_total'        => (int)  ($ticketStats?->total ?? 0),
                'tickets_paid'         => (int)  ($ticketStats?->paid ?? 0),
                'revenue_cents'        => (int)  ($ticketStats?->revenue ?? 0),
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

        $user = auth()->user();

        if (Shift::where('user_id', $user->id)->whereNull('closed_at')->exists()) {
            return back()->withErrors(['shift' => 'Un shift est déjà ouvert.']);
        }

        $shift = Shift::create([
            'user_id'            => $user->id,
            'opened_at'          => now(),
            'opening_cash_cents' => $request->opening_cash_cents,
        ]);

        ActivityLog::log('shift.opened', $shift, [
            'opening_cash_cents' => $request->opening_cash_cents,
        ]);

        return back()->with('success', 'Shift ouvert avec succès.');
    }

    /** Fermer le shift courant. */
    public function close(Request $request, Shift $shift): RedirectResponse
    {
        $request->validate([
            'closing_cash_cents' => ['required', 'integer', 'min:0'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        abort_if($shift->user_id !== auth()->id(), 403);
        abort_if($shift->closed_at !== null, 422, 'Ce shift est déjà fermé.');

        $expected = $shift->opening_cash_cents +
                    $shift->tickets()->where('status', 'paid')
                          ->join('payments', 'tickets.id', '=', 'payments.ticket_id')
                          ->sum('payments.amount_cash_cents');

        $shift->update([
            'closed_at'           => now(),
            'closing_cash_cents'  => $request->closing_cash_cents,
            'expected_cash_cents' => $expected,
            'difference_cents'    => $request->closing_cash_cents - $expected,
            'notes'               => $request->notes,
        ]);

        ActivityLog::log('shift.closed', $shift, [
            'closing_cash_cents' => $request->closing_cash_cents,
            'expected_cents'     => $expected,
            'difference_cents'   => $shift->difference_cents,
        ]);        return redirect()->route('caissier.shift.index')
                         ->with('success', 'Shift fermé avec succès.');
    }
}
