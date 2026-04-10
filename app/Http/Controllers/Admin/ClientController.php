<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientResource;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\ClientVehicle;
use App\Models\VehicleType;
use App\Services\LoyaltyService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Client::withTrashed()
            ->withCount('tickets')
            ->withMax('tickets', 'paid_at')
            ->orderByDesc('total_spent_cents');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name',            'like', "%{$search}%")
                  ->orWhere('phone',         'like', "%{$search}%")
                  ->orWhere('email',         'like', "%{$search}%")
                  ->orWhere('vehicle_plate', 'like', "%{$search}%");
            });
        }

        if ($tier = $request->query('tier')) {
            $query->where('loyalty_tier', $tier);
        }

        if ($request->query('deleted') === '1') {
            $query->onlyTrashed();
        } elseif ($request->query('deleted') !== 'all') {
            $query->whereNull('deleted_at');
        }

        $clients = $query->paginate(30)->withQueryString();

        return Inertia::render('Admin/Clients/Index', [
            'clients' => $clients,
            'tiers'   => LoyaltyService::TIERS,
            'filters' => $request->only('search', 'tier', 'deleted'),
        ]);
    }    public function show(Client $client): Response
    {
        $client->loadCount('tickets');

        $recentTickets = $client->tickets()
            ->with(['services:id,ticket_id,service_name,line_total_cents', 'payment:id,ticket_id,method,amount_cents'])
            ->latest()
            ->take(50)
            ->get();

        $transactions = $client->loyaltyTransactions()
            ->with('ticket:id,ticket_number')
            ->latest()
            ->take(30)
            ->get();

        $appointments = $client->appointments()
            ->latest('scheduled_at')
            ->take(20)
            ->get(['id', 'scheduled_at', 'status', 'notes']);        $vehicles = $client->vehicles()
            ->with('vehicleType:id,name')
            ->get();

        $vehicleTypes = VehicleType::orderBy('name')->get(['id', 'name']);        $checkinUrl = $client->ulid
            ? URL::signedRoute('client.checkin', ['ulid' => $client->ulid])
            : null;

        return Inertia::render('Admin/Clients/Show', [
            'client'        => new ClientResource($client),
            'recentTickets' => $recentTickets,
            'transactions'  => $transactions,
            'appointments'  => $appointments,
            'vehicles'      => $vehicles,
            'vehicleTypes'  => $vehicleTypes,
            'tiers'         => LoyaltyService::TIERS,
            'checkinUrl'    => $checkinUrl,
        ]);
    }

    public function create(): Response
    {        return Inertia::render('Admin/Clients/Create', [
            'vehicleTypes' => VehicleType::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20', 'unique:clients,phone'],
            'email'         => ['nullable', 'email', 'max:150', 'unique:clients,email'],
            'vehicle_plate' => ['nullable', 'string', 'max:20'],
            'is_company'    => ['boolean'],
            'ice'           => ['nullable', 'string', 'max:50'],
            'notes'         => ['nullable', 'string', 'max:1000'],
            'is_active'     => ['boolean'],
        ]);

        $client = Client::create($data);
        ActivityLog::log('client.created', $client, ['name' => $client->name]);

        return redirect()->route('admin.clients.show', $client)
            ->with('success', "Client {$client->name} créé avec succès.");
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20', "unique:clients,phone,{$client->id}"],
            'email'         => ['nullable', 'email', 'max:150', "unique:clients,email,{$client->id}"],
            'vehicle_plate' => ['nullable', 'string', 'max:20'],
            'is_company'    => ['boolean'],
            'ice'           => ['nullable', 'string', 'max:50'],
            'notes'         => ['nullable', 'string', 'max:1000'],
            'is_active'     => ['boolean'],
        ]);

        $client->update($data);
        ActivityLog::log('client.updated', $client, ['name' => $client->name]);

        return back()->with('success', 'Client mis à jour.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();
        ActivityLog::log('client.deleted', $client, ['name' => $client->name]);

        return redirect()->route('admin.clients.index')
            ->with('success', "Client {$client->name} archivé.");
    }

    public function restore(int $id): RedirectResponse
    {
        $client = Client::withTrashed()->findOrFail($id);
        $client->restore();
        ActivityLog::log('client.restored', $client, ['name' => $client->name]);

        return back()->with('success', "Client {$client->name} restauré.");
    }

    // ── Vehicles ─────────────────────────────────────────────────────────────

    public function storeVehicle(Request $request, Client $client): RedirectResponse
    {
        $data = $request->validate([
            'plate'           => ['nullable', 'string', 'max:20'],
            'brand'           => ['nullable', 'string', 'max:80'],
            'model'           => ['nullable', 'string', 'max:80'],
            'color'           => ['nullable', 'string', 'max:50'],
            'year'            => ['nullable', 'integer', 'min:1980', 'max:2030'],
            'vehicle_type_id' => ['nullable', 'exists:vehicle_types,id'],
            'is_primary'      => ['boolean'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        if (! empty($data['is_primary'])) {
            $client->vehicles()->update(['is_primary' => false]);
        }

        $client->vehicles()->create($data);

        return back()->with('success', 'Véhicule ajouté.');
    }

    public function updateVehicle(Request $request, Client $client, ClientVehicle $vehicle): RedirectResponse
    {
        abort_unless($vehicle->client_id === $client->id, 403);

        $data = $request->validate([
            'plate'           => ['nullable', 'string', 'max:20'],
            'brand'           => ['nullable', 'string', 'max:80'],
            'model'           => ['nullable', 'string', 'max:80'],
            'color'           => ['nullable', 'string', 'max:50'],
            'year'            => ['nullable', 'integer', 'min:1980', 'max:2030'],
            'vehicle_type_id' => ['nullable', 'exists:vehicle_types,id'],
            'is_primary'      => ['boolean'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        if (! empty($data['is_primary'])) {
            $client->vehicles()->where('id', '!=', $vehicle->id)->update(['is_primary' => false]);
        }

        $vehicle->update($data);

        return back()->with('success', 'Véhicule mis à jour.');
    }

    public function destroyVehicle(Client $client, ClientVehicle $vehicle): RedirectResponse
    {
        abort_unless($vehicle->client_id === $client->id, 403);
        $vehicle->delete();

        return back()->with('success', 'Véhicule supprimé.');
    }

    // ── PDF Export ────────────────────────────────────────────────────────────

    public function exportPdf(Client $client): HttpResponse
    {
        $client->loadCount('tickets');

        $tickets = $client->tickets()
            ->with(['services:id,ticket_id,service_name,line_total_cents'])
            ->latest()
            ->take(100)
            ->get();

        $vehicles = $client->vehicles()->with('vehicleType:id,name')->get();
        $transactions = $client->loyaltyTransactions()->latest()->take(30)->get();

        $pdf = Pdf::loadView('pdf.client-profile', compact('client', 'tickets', 'vehicles', 'transactions'))
            ->setPaper('a4', 'portrait');

        $filename = 'client-' . str($client->name)->slug() . '-' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
