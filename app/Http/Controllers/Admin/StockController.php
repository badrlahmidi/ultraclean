<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\StockMovement;
use App\Models\StockProduct;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    /**
     * Liste tous les produits avec alertes stock bas.
     */
    public function index(Request $request): Response
    {
        $query = StockProduct::withTrashed(false)
            ->orderBy('category')
            ->orderBy('name');

        if ($request->filled('q')) {
            $q = '%' . $request->q . '%';
            $query->where(fn ($s) => $s->where('name', 'like', $q)
                ->orWhere('sku', 'like', $q)
                ->orWhere('supplier', 'like', $q));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('current_quantity', '<=', 'min_quantity');
        }

        $products = $query->get()->map(fn ($p) => [
            'id'               => $p->id,
            'name'             => $p->name,
            'description'      => $p->description,
            'category'         => $p->category,
            'category_label'   => StockProduct::categoryLabel($p->category),
            'unit'             => $p->unit,
            'current_quantity' => $p->current_quantity,
            'min_quantity'     => $p->min_quantity,
            'cost_price_cents' => $p->cost_price_cents,
            'supplier'         => $p->supplier,
            'sku'              => $p->sku,
            'is_active'        => $p->is_active,
            'is_low_stock'     => $p->isLowStock(),
        ]);

        $services = Service::active()->get(['id', 'name']);

        return Inertia::render('Admin/Stock/Index', [
            'products'     => $products,
            'services'     => $services,
            'lowStockCount' => StockProduct::lowStock()->count(),
            'filters'      => $request->only(['q', 'category', 'low_stock']),
        ]);
    }

    /**
     * Créer un nouveau produit.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string|max:500',
            'category'         => 'required|in:produit_chimique,consommable,outil,autre',
            'unit'             => 'required|string|max:30',
            'current_quantity' => 'required|numeric|min:0',
            'min_quantity'     => 'required|numeric|min:0',
            'cost_price_cents' => 'nullable|integer|min:0',
            'supplier'         => 'nullable|string|max:150',
            'sku'              => 'nullable|string|max:50|unique:stock_products,sku',
            'is_active'        => 'boolean',
        ]);

        $data['is_active'] = $data['is_active'] ?? true;
        $data['cost_price_cents'] = $data['cost_price_cents'] ?? 0;

        $product = StockProduct::create($data);

        // Créer un mouvement d'entrée initial si stock > 0
        if ($product->current_quantity > 0) {
            StockMovement::create([
                'stock_product_id' => $product->id,
                'type'             => 'in',
                'quantity'         => $product->current_quantity,
                'note'             => 'Stock initial',
                'user_id'          => auth()->id(),
            ]);
        }

        return back()->with('success', "Produit « {$product->name} » créé.");
    }

    /**
     * Mettre à jour un produit.
     */
    public function update(Request $request, StockProduct $stock): RedirectResponse
    {
        $data = $request->validate([
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string|max:500',
            'category'         => 'required|in:produit_chimique,consommable,outil,autre',
            'unit'             => 'required|string|max:30',
            'min_quantity'     => 'required|numeric|min:0',
            'cost_price_cents' => 'nullable|integer|min:0',
            'supplier'         => 'nullable|string|max:150',
            'sku'              => "nullable|string|max:50|unique:stock_products,sku,{$stock->id}",
            'is_active'        => 'boolean',
        ]);

        $stock->update($data);

        return back()->with('success', "Produit « {$stock->name} » mis à jour.");
    }

    /**
     * Supprimer (soft delete) un produit.
     */
    public function destroy(StockProduct $stock): RedirectResponse
    {
        $stock->delete();
        return back()->with('success', "Produit « {$stock->name} » supprimé.");
    }

    /**
     * Enregistrer un mouvement de stock (entrée / ajustement / correction).
     */
    public function addMovement(Request $request, StockProduct $stock): RedirectResponse
    {
        $data = $request->validate([
            'type'      => 'required|in:in,out,adjustment',
            'quantity'  => 'required|numeric|min:0.001',
            'note'      => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:100',
        ]);

        $qty = (float) $data['quantity'];

        match ($data['type']) {
            'in'         => $stock->addStock($qty, $data['note'] ?? null, $data['reference'] ?? null, auth()->id()),
            'out'        => $stock->consumeStock($qty, $data['reference'] ?? null, null, auth()->id()),
            'adjustment' => $stock->adjustStock($qty, $data['note'] ?? null, auth()->id()),
        };

        return back()->with('success', 'Mouvement enregistré.');
    }

    /**
     * Historique des mouvements d'un produit.
     */
    public function movements(StockProduct $stock): Response
    {
        $movements = $stock->movements()
            ->with(['user:id,name', 'ticket:id,ticket_number'])
            ->paginate(30);

        return Inertia::render('Admin/Stock/Show', [
            'product'   => [
                'id'               => $stock->id,
                'name'             => $stock->name,
                'description'      => $stock->description,
                'category'         => $stock->category,
                'category_label'   => StockProduct::categoryLabel($stock->category),
                'unit'             => $stock->unit,
                'current_quantity' => $stock->current_quantity,
                'min_quantity'     => $stock->min_quantity,
                'cost_price_cents' => $stock->cost_price_cents,
                'supplier'         => $stock->supplier,
                'sku'              => $stock->sku,
                'is_active'        => $stock->is_active,
                'is_low_stock'     => $stock->isLowStock(),
            ],
            'movements' => $movements,
        ]);
    }

    /**
     * Sync produits liés à un service.
     */
    public function syncServiceProducts(Request $request, Service $service): RedirectResponse
    {
        $data = $request->validate([
            'products'                  => 'present|array',
            'products.*.stock_product_id' => 'required|exists:stock_products,id',
            'products.*.quantity_per_use' => 'required|numeric|min:0.001',
        ]);

        $sync = collect($data['products'])->keyBy('stock_product_id')
            ->map(fn ($item) => ['quantity_per_use' => $item['quantity_per_use']])
            ->toArray();

        $service->stockProducts()->sync($sync);

        return back()->with('success', 'Liaisons produits ↔ service mises à jour.');
    }
}
