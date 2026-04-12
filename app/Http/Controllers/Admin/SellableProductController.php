<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SellableProduct;
use App\Models\SellableProductMovement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SellableProductController — Manage products that can be sold to customers.
 *
 * Features:
 * - CRUD operations for sellable products
 * - Stock movements (purchases, adjustments)
 * - Barcode lookup
 */
class SellableProductController extends Controller
{
    /**
     * List all sellable products with stock alerts.
     */
    public function index(Request $request): Response
    {
        $query = SellableProduct::withTrashed(false)
            ->orderBy('name');

        if ($request->filled('q')) {
            $q = '%' . $request->q . '%';
            $query->where(fn ($s) => $s->where('name', 'like', $q)
                ->orWhere('barcode', 'like', $q));
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('current_stock', '<=', 'alert_threshold');
        }

        $products = $query->get()->map(fn ($p) => [
            'id'                   => $p->id,
            'name'                 => $p->name,
            'barcode'              => $p->barcode,
            'description'          => $p->description,
            'purchase_price_cents' => $p->purchase_price_cents,
            'selling_price_cents'  => $p->selling_price_cents,
            'current_stock'        => $p->current_stock,
            'alert_threshold'      => $p->alert_threshold,
            'unit'                 => $p->unit,
            'is_active'            => $p->is_active,
            'is_low_stock'         => $p->isLowStock(),
            'profit_cents'         => $p->profit_cents,
        ]);

        return Inertia::render('Admin/SellableProducts/Index', [
            'products'      => $products,
            'lowStockCount' => SellableProduct::lowStock()->count(),
            'filters'       => $request->only(['q', 'low_stock']),
        ]);
    }

    /**
     * Store a new sellable product.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:150',
            'barcode'              => 'nullable|string|max:50|unique:sellable_products,barcode',
            'description'          => 'nullable|string|max:500',
            'purchase_price_cents' => 'required|integer|min:0',
            'selling_price_cents'  => 'required|integer|min:0',
            'current_stock'        => 'required|numeric|min:0',
            'alert_threshold'      => 'required|numeric|min:0',
            'unit'                 => 'required|string|max:30',
            'is_active'            => 'boolean',
        ]);

        $data['is_active'] = $data['is_active'] ?? true;

        $product = SellableProduct::create($data);

        // Create initial stock movement if stock > 0
        if ($product->current_stock > 0) {
            SellableProductMovement::create([
                'sellable_product_id' => $product->id,
                'type'                => 'in',
                'quantity'            => $product->current_stock,
                'note'                => 'Stock initial',
                'user_id'             => auth()->id(),
            ]);
        }

        return back()->with('success', "Produit « {$product->name} » créé.");
    }

    /**
     * Update a sellable product.
     */
    public function update(Request $request, SellableProduct $sellableProduct): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:150',
            'barcode'              => "nullable|string|max:50|unique:sellable_products,barcode,{$sellableProduct->id}",
            'description'          => 'nullable|string|max:500',
            'purchase_price_cents' => 'required|integer|min:0',
            'selling_price_cents'  => 'required|integer|min:0',
            'alert_threshold'      => 'required|numeric|min:0',
            'unit'                 => 'required|string|max:30',
            'is_active'            => 'boolean',
        ]);

        $sellableProduct->update($data);

        return back()->with('success', "Produit « {$sellableProduct->name} » mis à jour.");
    }

    /**
     * Delete (soft) a sellable product.
     */
    public function destroy(SellableProduct $sellableProduct): RedirectResponse
    {
        $sellableProduct->delete();
        return back()->with('success', "Produit « {$sellableProduct->name} » supprimé.");
    }

    /**
     * Add stock movement (purchase, adjustment).
     */
    public function addMovement(Request $request, SellableProduct $sellableProduct): RedirectResponse
    {
        $data = $request->validate([
            'type'      => 'required|in:in,out,adjustment',
            'quantity'  => 'required|numeric|min:0.01',
            'note'      => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:100',
        ]);

        $qty  = (float) $data['quantity'];
        $type = (string) $data['type'];

        match ($type) {
            'in'         => $sellableProduct->addStock($qty, $data['note'] ?? null, $data['reference'] ?? null, auth()->id()),
            'out'        => $sellableProduct->consumeStock($qty, null, false, auth()->id()),
            'adjustment' => $sellableProduct->adjustStock($qty, $data['note'] ?? null, auth()->id()),
            default      => throw new \InvalidArgumentException("Unknown movement type: {$type}"),
        };

        return back()->with('success', 'Mouvement enregistré.');
    }

    /**
     * Show movement history for a product.
     */
    public function movements(SellableProduct $sellableProduct): Response
    {
        $movements = $sellableProduct->movements()
            ->with(['user:id,name', 'ticket:id,ticket_number'])
            ->paginate(30);

        return Inertia::render('Admin/SellableProducts/Show', [
            'product'   => [
                'id'                   => $sellableProduct->id,
                'name'                 => $sellableProduct->name,
                'barcode'              => $sellableProduct->barcode,
                'description'          => $sellableProduct->description,
                'purchase_price_cents' => $sellableProduct->purchase_price_cents,
                'selling_price_cents'  => $sellableProduct->selling_price_cents,
                'current_stock'        => $sellableProduct->current_stock,
                'alert_threshold'      => $sellableProduct->alert_threshold,
                'unit'                 => $sellableProduct->unit,
                'is_active'            => $sellableProduct->is_active,
                'is_low_stock'         => $sellableProduct->isLowStock(),
            ],
            'movements' => $movements,
        ]);
    }

    /**
     * API: Find product by barcode (for POS scanning).
     */
    public function findByBarcode(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate(['barcode' => 'required|string']);

        $product = SellableProduct::active()
            ->where('barcode', $request->barcode)
            ->first();

        if (!$product) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        return response()->json([
            'id'                  => $product->id,
            'name'                => $product->name,
            'barcode'             => $product->barcode,
            'selling_price_cents' => $product->selling_price_cents,
            'current_stock'       => $product->current_stock,
            'unit'                => $product->unit,
        ]);
    }

    /**
     * API: List all active products for POS.
     */
    public function listForPos(): \Illuminate\Http\JsonResponse
    {
        $products = SellableProduct::active()
            ->orderBy('name')
            ->get(['id', 'name', 'barcode', 'selling_price_cents', 'current_stock', 'unit']);

        return response()->json(['products' => $products]);
    }
}
