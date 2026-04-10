<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockProduct;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Purchase::with(['supplier', 'creator'])
            ->when($request->search, fn ($q, $s) =>
                $q->where('reference', 'like', "%{$s}%")
                  ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$s}%"))
            )
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest('purchased_at');

        $purchases = $query->paginate(20)->withQueryString();

        return Inertia::render('Admin/Purchases/Index', [
            'purchases'  => $purchases,
            'filters'    => $request->only('search', 'status'),
            'statuses'   => Purchase::STATUS_LABELS,
            'stats'      => [
                'total'       => Purchase::count(),
                'draft'       => Purchase::where('status', 'draft')->count(),
                'received'    => Purchase::where('status', 'received')->count(),
                'total_cents' => Purchase::where('status', 'received')->sum('total_cents'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Purchases/Create', [
            'suppliers' => Supplier::active()->orderBy('name')->get(['id', 'name']),
            'products'  => StockProduct::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'cost_price_cents']),
            'statuses'  => Purchase::STATUS_LABELS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'supplier_id'    => 'nullable|exists:suppliers,id',
            'reference'      => 'nullable|string|max:100',
            'purchased_at'   => 'required|date',
            'status'         => 'required|in:draft,confirmed,received,cancelled',
            'notes'          => 'nullable|string|max:1000',
            'items'          => 'required|array|min:1',
            'items.*.stock_product_id' => 'nullable|exists:stock_products,id',
            'items.*.product_name'     => 'required|string|max:150',
            'items.*.quantity'         => 'required|numeric|min:0.001',
            'items.*.unit'             => 'required|string|max:30',
            'items.*.unit_price_cents' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($data, $request) {
            $purchase = Purchase::create([
                'supplier_id'  => $data['supplier_id'],
                'reference'    => $data['reference'],
                'purchased_at' => $data['purchased_at'],
                'status'       => $data['status'],
                'notes'        => $data['notes'],
                'created_by'   => auth()->id(),
            ]);

            foreach ($data['items'] as $item) {
                $total = (int) round($item['quantity'] * $item['unit_price_cents']);
                PurchaseItem::create([
                    'purchase_id'      => $purchase->id,
                    'stock_product_id' => $item['stock_product_id'] ?? null,
                    'product_name'     => $item['product_name'],
                    'quantity'         => $item['quantity'],
                    'unit'             => $item['unit'],
                    'unit_price_cents' => $item['unit_price_cents'],
                    'total_cents'      => $total,
                ]);

                // Si réceptionné, ajouter au stock
                if ($data['status'] === 'received' && !empty($item['stock_product_id'])) {
                    $product = StockProduct::find($item['stock_product_id']);
                    if ($product) {
                        $product->increment('current_quantity', $item['quantity']);                        StockMovement::create([
                            'stock_product_id' => $product->id,
                            'type'             => 'in',
                            'quantity'         => $item['quantity'],
                            'note'             => 'Achat #' . ($data['reference'] ?? $purchase->id),
                            'user_id'          => auth()->id(),
                        ]);
                    }
                }
            }

            $purchase->recalcTotal();
        });

        return redirect()->route('admin.purchases.index')
            ->with('success', 'Achat enregistré avec succès.');
    }

    public function show(Purchase $purchase): Response
    {
        $purchase->load(['supplier', 'items.stockProduct', 'creator']);

        return Inertia::render('Admin/Purchases/Show', [
            'purchase' => $purchase,
            'statuses' => Purchase::STATUS_LABELS,
        ]);
    }

    public function destroy(Purchase $purchase): RedirectResponse
    {
        $purchase->items()->delete();
        $purchase->delete();

        return back()->with('success', 'Achat supprimé.');
    }
}
