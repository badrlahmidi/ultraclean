<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VehicleType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VehicleTypeController extends Controller
{
    public function index(): Response
    {
        $categories = VehicleType::withCount(['servicePrices', 'ticketServices'])
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Admin/PriceCategories/Index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:60', 'unique:vehicle_types,name'],
            'icon'       => ['nullable', 'string', 'max:10'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['sort_order'] = $data['sort_order'] ?? (VehicleType::max('sort_order') + 1);
        $data['slug']       = \Illuminate\Support\Str::slug($data['name']);
        $data['is_active']  = true;

        VehicleType::create($data);

        return back()->with('success', "Catégorie « {$data['name']} » créée.");
    }

    public function update(Request $request, VehicleType $priceCategory): RedirectResponse
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:60', "unique:vehicle_types,name,{$priceCategory->id}"],
            'icon'       => ['nullable', 'string', 'max:10'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active'  => ['boolean'],
        ]);

        $priceCategory->update($data);

        return back()->with('success', "Catégorie « {$priceCategory->name} » mise à jour.");
    }

    public function destroy(VehicleType $priceCategory): RedirectResponse
    {
        // Interdire la suppression si des services ou des tickets la référencent
        $hasServices = $priceCategory->servicePrices()->exists();
        $hasTickets  = $priceCategory->ticketServices()->exists();

        if ($hasServices || $hasTickets) {
            return back()->withErrors([
                'priceCategory' => "Impossible de supprimer : cette catégorie est utilisée par des services ou des tickets.",
            ]);
        }

        $name = $priceCategory->name;
        $priceCategory->delete();

        return back()->with('success', "Catégorie « {$name} » supprimée.");
    }
}
