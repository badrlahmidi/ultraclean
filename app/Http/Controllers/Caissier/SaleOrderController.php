<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleOrderRequest;
use App\Models\Client;
use App\Models\SaleOrder;
use App\Models\SellableProduct;
use App\Models\Setting;
use App\Services\SaleOrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SaleOrderController — Point de Vente (POS express).
 *
 * Flux distinct des tickets : pas de véhicule, pas de laveur.
 * Vente immédiate avec encaissement en une étape.
 *
 * Routes (groupe caissier) :
 *   GET    /caisse/pos              → index   (liste ventes du jour)
 *   GET    /caisse/pos/nouveau      → create  (page POS)
 *   POST   /caisse/pos              → store   (enregistrer vente)
 *   GET    /caisse/pos/{sale}       → show    (détail + reçu)
 *   POST   /caisse/pos/{sale}/annuler → cancel (annuler)
 */
class SaleOrderController extends Controller
{
    /** Liste des ventes avec filtres. */
    public function index(Request $request): Response
    {
        $query = SaleOrder::with(['client:id,name,phone', 'creator:id,name'])
            ->withCount('lines')
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('sale_number', 'like', "%{$search}%")
                  ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->query('today')) {
            $query->whereDate('created_at', today());
        } else {
            // Default to today
            if (!$request->query('date_from') && !$request->query('date_to')) {
                $query->whereDate('created_at', today());
            }
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $sales = $query->paginate(25)->withQueryString();

        // Aggregate stats for current filter
        $statsQuery = SaleOrder::where('status', SaleOrder::STATUS_PAID);
        if ($request->query('today') || (!$request->query('date_from') && !$request->query('date_to'))) {
            $statsQuery->whereDate('created_at', today());
        }
        $stats = [
            'count'       => $statsQuery->count(),
            'total_cents' => (int) $statsQuery->sum('total_cents'),
        ];

        return Inertia::render('Caissier/POS/Index', [
            'sales'   => $sales,
            'stats'   => $stats,
            'filters' => $request->only(['search', 'status', 'today', 'date_from', 'date_to']),
        ]);
    }

    /** Page POS — charge produits et clients. */
    public function create(Request $request): Response
    {
        $sellableProducts = SellableProduct::active()
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id'                   => $p->id,
                'name'                 => $p->name,
                'sku'                  => $p->sku,
                'barcode'              => $p->barcode,
                'selling_price_cents'  => $p->selling_price_cents,
                'current_stock'        => $p->current_stock,
                'unit'                 => $p->unit,
                'is_low_stock'         => $p->isLowStock(),
            ]);

        return Inertia::render('Caissier/POS/Create', [
            'sellableProducts' => $sellableProducts,
        ]);
    }

    /** Enregistre la vente (création + paiement immédiat). */
    public function store(StoreSaleOrderRequest $request): RedirectResponse
    {
        $sale = app(SaleOrderService::class)->create(
            $request->validated(),
            $request->user(),
        );

        return redirect()
            ->route('caissier.pos.show', $sale->ulid)
            ->with('success', "Vente {$sale->sale_number} enregistrée.");
    }

    /** Détail d'une vente + reçu. */
    public function show(SaleOrder $sale): Response
    {
        $sale->load([
            'client:id,name,phone,address',
            'creator:id,name',
            'lines.sellableProduct:id,name,sku',
        ]);

        $settings = Setting::getMany(['center_name', 'center_logo', 'center_address', 'center_phone'], [
            'center_name'    => config('app.name'),
            'center_logo'    => '',
            'center_address' => '',
            'center_phone'   => '',
        ]);

        return Inertia::render('Caissier/POS/Show', [
            'sale'     => $sale,
            'settings' => $settings,
        ]);
    }

    /** Annuler une vente avec motif. */
    public function cancel(Request $request, SaleOrder $sale): RedirectResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($sale->isCancelled()) {
            return back()->withErrors(['reason' => 'Cette vente est déjà annulée.']);
        }

        app(SaleOrderService::class)->cancel($sale, $request->reason, $request->user());

        return redirect()
            ->route('caissier.pos.show', $sale->ulid)
            ->with('success', "Vente {$sale->sale_number} annulée.");
    }
}
