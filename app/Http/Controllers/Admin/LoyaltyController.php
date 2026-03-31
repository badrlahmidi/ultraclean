<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\LoyaltyTransaction;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LoyaltyController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Client::withCount('tickets')
            ->orderByDesc('loyalty_points');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name',  'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        if ($tier = $request->query('tier')) {
            $query->where('loyalty_tier', $tier);
        }

        $clients = $query->paginate(25)->withQueryString();

        // KPIs
        $kpis = [
            'total_points'    => Client::sum('loyalty_points'),
            'total_clients'   => Client::count(),
            'silver_count'    => Client::where('loyalty_tier', 'silver')->count(),
            'gold_count'      => Client::where('loyalty_tier', 'gold')->count(),
            'platinum_count'  => Client::where('loyalty_tier', 'platinum')->count(),
        ];

        return Inertia::render('Admin/Loyalty/Index', [
            'clients' => $clients,
            'kpis'    => $kpis,
            'filters' => $request->only('search', 'tier'),
            'tiers'   => LoyaltyService::TIERS,
        ]);
    }

    public function show(Client $client): Response
    {
        $client->load(['loyaltyTransactions.ticket', 'loyaltyTransactions.createdBy']);

        return Inertia::render('Admin/Loyalty/Show', [
            'client'       => $client,
            'transactions' => $client->loyaltyTransactions()->paginate(20),
            'tiers'        => LoyaltyService::TIERS,
        ]);
    }

    public function adjust(Request $request, Client $client)
    {
        $data = $request->validate([
            'delta' => ['required', 'integer', 'not_in:0', 'min:-9999', 'max:9999'],
            'note'  => ['required', 'string', 'max:255'],
        ]);

        LoyaltyService::adjustPoints(
            $client,
            (int) $data['delta'],
            $data['note'],
            auth()->id()
        );

        // Recalculate tier
        $client->refresh();
        $newTier = LoyaltyService::calculateTier($client->total_visits);
        if ($newTier !== $client->loyalty_tier) {
            $client->update(['loyalty_tier' => $newTier]);
        }

        return back()->with('success', sprintf(
            '%s%d points ajustés pour %s',
            $data['delta'] > 0 ? '+' : '',
            $data['delta'],
            $client->name
        ));
    }
}
