<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientQuickStoreRequest;
use App\Http\Resources\ClientResource;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Client::withCount('tickets')
            ->withMax('tickets', 'created_at')
            ->orderBy('name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name',           'like', "%{$search}%")
                  ->orWhere('phone',        'like', "%{$search}%")
                  ->orWhere('vehicle_plate','like', "%{$search}%")
                  ->orWhere('email',        'like', "%{$search}%");
            });
        }
        if ($tier = $request->query('tier')) {
            $query->where('loyalty_tier', $tier);
        }

        $clients = $query->paginate(25)->withQueryString();

        return Inertia::render('Caissier/Clients/Index', [
            'clients' => $clients,
            'filters' => $request->only('search', 'tier'),
            'tiers'   => LoyaltyService::TIERS,
        ]);
    }    public function show(Client $client): Response
    {
        $client->loadCount('tickets');
        $recentTickets = $client->tickets()
            ->with('services')
            ->latest()
            ->take(10)
            ->get();

        $transactions = $client->loyaltyTransactions()
            ->with('ticket:id,ticket_number')
            ->take(15)
            ->get();        // URL de checkin QR (signed route — prevents ULID enumeration)
        $checkinUrl = $client->ulid
            ? URL::signedRoute('client.checkin', ['ulid' => $client->ulid])
            : null;return Inertia::render('Caissier/Clients/Show', [
            'client'       => new ClientResource($client),
            'recentTickets'=> $recentTickets,
            'transactions' => $transactions,
            'tiers'        => LoyaltyService::TIERS,
            'checkinUrl'   => $checkinUrl,
        ]);
    }    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Client::class);

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'email'         => ['nullable', 'email', 'max:150'],
            'vehicle_plate' => ['nullable', 'string', 'max:20'],
            'notes'         => ['nullable', 'string', 'max:500'],
        ]);

        $client = Client::create($data);
        ActivityLog::log('client.created', $client, ['name' => $client->name]);

        return back()->with('success', "Client {$client->name} créé.");
    }    public function update(Request $request, Client $client): RedirectResponse
    {
        $this->authorize('update', $client);

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'email'         => ['nullable', 'email', 'max:150'],
            'vehicle_plate' => ['nullable', 'string', 'max:20'],
            'notes'         => ['nullable', 'string', 'max:500'],
            'is_active'     => ['boolean'],
        ]);

        $client->update($data);
        ActivityLog::log('client.updated', $client, ['name' => $client->name]);

        return back()->with('success', 'Client mis à jour.');
    }    public function destroy(Client $client): RedirectResponse
    {
        $this->authorize('delete', $client);

        $client->delete();
        ActivityLog::log('client.deleted', $client, ['name' => $client->name]);

        return back()->with('success', 'Client supprimé.');
    }

    public function search(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $clients = Client::active()
            ->where(function ($query) use ($q) {
                $query->where('name',  'like', "%{$q}%")
                      ->orWhere('phone', 'like', "%{$q}%");
            })
            ->orderBy('name')
            ->limit(8)
            ->get(['id', 'name', 'phone', 'is_company', 'ice', 'vehicle_plate', 'loyalty_tier', 'loyalty_points']);

        return response()->json($clients);
    }    public function quickStore(ClientQuickStoreRequest $request): JsonResponse
    {
        $client = Client::create([
            'name'       => $request->name,
            'phone'      => $request->filled('phone') ? $request->phone : null,
            'is_company' => (bool) $request->is_company,
            'ice'        => ($request->is_company && $request->filled('ice')) ? $request->ice : null,
        ]);

        ActivityLog::log('client.created', $client, [
            'name'   => $client->name,
            'source' => 'quick_modal',
        ]);

        return response()->json([
            'id'           => $client->id,
            'name'         => $client->name,
            'phone'        => $client->phone,
            'is_company'   => $client->is_company,
            'ice'          => $client->ice,
            'loyalty_tier' => $client->loyalty_tier,
            'loyalty_points'=> $client->loyalty_points,
        ], 201);
    }    /**
     * Checkin rapide via QR code.
     *
     * Redirige vers le formulaire de création de ticket
     * avec les champs client et plaque préremplis.
     * Accessible sans authentification (lien QR scannable en accueil).
     */    public function checkin(string $ulid): RedirectResponse
    {
        // Validate ULID format to prevent enumeration via error messages
        if (! preg_match('/^[0-9A-HJKMNP-TV-Z]{26}$/i', $ulid)) {
            abort(404);
        }

        $client = Client::where('ulid', $ulid)->first();

        if (! $client || ! $client->is_active) {
            // Generic response to prevent client existence enumeration
            abort(404);
        }

        return redirect()->route('caissier.tickets.create', [
            'prefill_client' => $client->id,
            'prefill_plate'  => $client->vehicle_plate,
        ]);
    }
}
