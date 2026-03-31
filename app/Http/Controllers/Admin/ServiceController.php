<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceRequest;
use App\Models\ActivityLog;
use App\Models\Service;
use App\Models\ServiceVehiclePrice;
use App\Models\VehicleType;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    public function index(): Response
    {
        $services     = Service::with('prices.vehicleType')->orderBy('sort_order')->get();
        $vehicleTypes = VehicleType::active()->get();

        return Inertia::render('Admin/Services/Index', [
            'services'     => $services,
            'vehicleTypes' => $vehicleTypes,
        ]);
    }    public function store(StoreServiceRequest $request): RedirectResponse
    {
        $service = Service::create([
            'name'             => $request->name,
            'description'      => $request->description,
            'color'            => $request->color,
            'duration_minutes' => $request->duration_minutes,
            'sort_order'       => $request->sort_order ?? Service::max('sort_order') + 1,
            'is_active'        => $request->boolean('is_active', true),
            'price_type'       => $request->price_type ?? 'fixed',
            'base_price_cents' => $request->price_type === 'fixed' ? $request->base_price_cents : null,
        ]);

        if ($request->price_type === 'variant') {
            $this->syncPrices($service, $request->prices ?? []);
        }

        ActivityLog::log('service.created', $service, ['name' => $service->name]);

        return back()->with('success', "Service « {$service->name} » créé.");
    }

    public function update(StoreServiceRequest $request, Service $service): RedirectResponse
    {
        $service->update([
            'name'             => $request->name,
            'description'      => $request->description,
            'color'            => $request->color,
            'duration_minutes' => $request->duration_minutes,
            'sort_order'       => $request->sort_order ?? $service->sort_order,
            'is_active'        => $request->boolean('is_active', $service->is_active),
            'price_type'       => $request->price_type ?? $service->price_type,
            'base_price_cents' => $request->price_type === 'fixed' ? $request->base_price_cents : null,
        ]);

        if ($request->price_type === 'variant') {
            $this->syncPrices($service, $request->prices ?? []);
        } else {
            // Prix fixe → supprimer toute la grille variants
            $service->prices()->delete();
        }

        ActivityLog::log('service.updated', $service, ['name' => $service->name]);

        return back()->with('success', "Service « {$service->name} » mis à jour.");
    }

    public function destroy(Service $service): RedirectResponse
    {
        // Vérifier qu'aucun ticket actif ne l'utilise
        $hasActiveTickets = $service->ticketServices()
            ->whereHas('ticket', fn($q) => $q->whereNotIn('status', ['paid', 'cancelled']))
            ->exists();

        if ($hasActiveTickets) {
            return back()->withErrors(['service' => 'Ce service est utilisé par des tickets en cours.']);
        }

        $name = $service->name;
        $service->update(['is_active' => false]);

        ActivityLog::log('service.deactivated', $service, ['name' => $name]);

        return back()->with('success', "Service « {$name} » désactivé.");
    }

    /** Synchronise la grille de prix du service. */
    private function syncPrices(Service $service, array $prices): void
    {
        foreach ($prices as $vehicleTypeId => $priceCents) {
            if ($priceCents === null || $priceCents === '') {
                // Pas de prix pour ce type → supprimer l'entrée
                ServiceVehiclePrice::where('service_id', $service->id)
                    ->where('vehicle_type_id', $vehicleTypeId)
                    ->delete();
                continue;
            }

            ServiceVehiclePrice::updateOrCreate(
                ['service_id' => $service->id, 'vehicle_type_id' => $vehicleTypeId],
                ['price_cents' => (int) $priceCents]
            );
        }
    }
}
