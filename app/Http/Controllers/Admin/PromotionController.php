<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;

class PromotionController extends Controller
{
    public function index(Request $request): Response
    {
        $promotions = Promotion::orderByDesc('created_at')->get();

        return Inertia::render('Admin/Promotions/Index', [
            'promotions' => $promotions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code'              => 'required|string|max:50|unique:promotions,code',
            'label'             => 'nullable|string|max:100',
            'type'              => 'required|in:percent,fixed',
            'value'             => 'required|integer|min:1',
            'min_amount_cents'  => 'nullable|integer|min:0',
            'max_uses'          => 'nullable|integer|min:1',
            'is_active'         => 'boolean',
            'valid_from'        => 'nullable|date',
            'valid_until'       => 'nullable|date|after_or_equal:valid_from',
        ]);

        $data['code'] = strtoupper(trim($data['code']));
        $data['min_amount_cents'] = $data['min_amount_cents'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        Promotion::create($data);

        return back()->with('success', 'Promotion créée.');
    }

    public function update(Request $request, Promotion $promotion): RedirectResponse
    {
        $data = $request->validate([
            'code'              => "required|string|max:50|unique:promotions,code,{$promotion->id}",
            'label'             => 'nullable|string|max:100',
            'type'              => 'required|in:percent,fixed',
            'value'             => 'required|integer|min:1',
            'min_amount_cents'  => 'nullable|integer|min:0',
            'max_uses'          => 'nullable|integer|min:1',
            'is_active'         => 'boolean',
            'valid_from'        => 'nullable|date',
            'valid_until'       => 'nullable|date|after_or_equal:valid_from',
        ]);

        $data['code'] = strtoupper(trim($data['code']));
        $data['min_amount_cents'] = $data['min_amount_cents'] ?? 0;

        $promotion->update($data);

        return back()->with('success', 'Promotion mise à jour.');
    }

    public function destroy(Promotion $promotion): RedirectResponse
    {
        $promotion->delete();
        return back()->with('success', 'Promotion supprimée.');
    }

    /**
     * Public endpoint: validate a promo code and return discount info.
     */
    public function validate(Request $request)
    {
        $request->validate([
            'code'    => 'required|string',
            'amount'  => 'required|integer|min:0',
        ]);

        $promo = Promotion::where('code', strtoupper($request->code))->first();

        if (!$promo || !$promo->isCurrentlyValid()) {
            return response()->json(['valid' => false, 'message' => 'Code invalide ou expiré.'], 422);
        }

        $discount = $promo->computeDiscount((int) $request->amount);        return response()->json([
            'valid'        => true,
            'promotion_id' => $promo->id,
            'label'        => $promo->label ?? $promo->code,
            'type'         => $promo->type,
            'value'        => $promo->value,
            'discount'     => $discount,
        ]);
    }

    public function show(Promotion $promotion): Response
    {
        $promotion->loadCount('usages');

        // Tickets qui ont utilisé ce code
        $usages = $promotion->usages()
            ->with('ticket:id,ticket_number,total_cents,status,created_at')
            ->latest()
            ->take(50)
            ->get();

        // CA généré par cette promo (tickets payés)
        $revenueGenerated = $usages
            ->filter(fn($u) => $u->ticket?->status === 'paid')
            ->sum(fn($u) => $u->ticket->total_cents);        // Tendance mensuelle — utilisations par mois (6 mois)
        $monthExpr = DB::getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $monthlyUsage = DB::table('promotion_usages')
            ->where('promotion_id', $promotion->id)
            ->where('created_at', '>=', now()->subMonths(6))
            ->selectRaw("{$monthExpr} as month, COUNT(*) as count")
            ->groupBy('month')
            ->orderBy('month')
            ->get();y('month')
            ->orderBy('month')
            ->get();

        return Inertia::render('Admin/Promotions/Show', [
            'promotion'        => $promotion,
            'usages'           => $usages,
            'revenueGenerated' => $revenueGenerated,
            'monthlyUsage'     => $monthlyUsage,
        ]);
    }
}
