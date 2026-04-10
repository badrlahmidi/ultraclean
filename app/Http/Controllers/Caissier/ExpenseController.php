<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Shift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    /** Liste des dépenses (du shift actif si ouvert, sinon toutes). */
    public function index(): Response
    {
        $user  = auth()->user();
        $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

        $expenses = Expense::with('user')
            ->where('user_id', $user->id)
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn(Expense $e) => [
                'id'           => $e->id,
                'amount_cents' => $e->amount_cents,
                'category'     => $e->category,
                'label'        => $e->label,
                'paid_with'    => $e->paid_with,
                'date'         => $e->date?->toDateString(),
                'shift_id'     => $e->shift_id,
                'created_at'   => $e->created_at,
            ]);

        $totalToday = Expense::where('user_id', $user->id)
            ->whereDate('date', today())
            ->sum('amount_cents');

        $totalShift = $shift
            ? Expense::where('shift_id', $shift->id)->sum('amount_cents')
            : 0;

        return Inertia::render('Caissier/Depenses/Index', [
            'expenses'    => $expenses,
            'activeShift' => $shift,
            'totals'      => [
                'today' => (int) $totalToday,
                'shift' => (int) $totalShift,
            ],
            'categories'  => Expense::categories(),
            'methods'     => Expense::paymentMethods(),
        ]);
    }

    /** Enregistrer une nouvelle dépense. */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'amount_cents' => ['required', 'integer', 'min:1'],
            'category'     => ['required', 'string', 'max:60'],
            'label'        => ['required', 'string', 'max:255'],
            'paid_with'    => ['required', 'string', 'in:cash,card,mobile,wire'],
            'date'         => ['required', 'date'],
        ]);

        $user  = auth()->user();
        $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

        Expense::create([
            ...$data,
            'user_id'  => $user->id,
            'shift_id' => $shift?->id,
        ]);

        return back()->with('success', 'Dépense enregistrée.');
    }

    /** Supprimer une dépense. */
    public function destroy(Expense $expense): RedirectResponse
    {
        // Seul le créateur (ou l'admin) peut supprimer
        abort_if(
            auth()->id() !== $expense->user_id && auth()->user()->role !== 'admin',
            403
        );

        $expense->delete();

        return back()->with('success', 'Dépense supprimée.');
    }
}
