<?php

namespace App\Http\Controllers\Caissier;

use App\Events\TicketAssigned;
use App\Events\TicketStatusUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Service;
use App\Models\ServiceVehiclePrice;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\TicketService;
use App\Models\User;
use App\Models\VehicleBrand;
use App\Models\VehicleType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TicketController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Ticket::with(['vehicleType', 'creator', 'assignedTo', 'client'])
            ->orderByDesc('created_at');

        // Filtres
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhere('vehicle_plate', 'like', "%{$search}%");
            });
        }
        if ($request->query('today')) {
            $query->whereDate('created_at', today());
        }

        $tickets = $query->paginate(25)->withQueryString();

        return Inertia::render('Caissier/Tickets/Index', [
            'tickets'  => $tickets,
            'filters'  => $request->only('status', 'search', 'today'),
            'statuses' => Ticket::TRANSITIONS,
        ]);
    }    public function create(): Response
    {
        // Services groupés par catégorie avec leur grille de prix
        $services = Service::active()
            ->with('prices.vehicleType')
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get(['id','name','description','color','category','price_type',
                   'base_price_cents','duration_minutes','sort_order']);

        $priceGrid = [];
        foreach ($services as $svc) {
            $priceGrid[$svc->id] = $svc->prices->keyBy('vehicle_type_id')
                ->map(fn($p) => $p->price_cents);
        }

        // Marques actives avec modèles (tout chargé en une fois — filtre côté frontend)
        $brands = VehicleBrand::active()
            ->with(['models' => fn ($q) => $q->active()->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')->orderBy('name')
            ->get(['id', 'name', 'slug', 'logo_path']);

        // Types de véhicules pour le sélecteur de prix variable
        $vehicleTypes = VehicleType::active()->get(['id', 'name', 'slug', 'icon']);

        // Laveurs actifs pour l'assignation
        $washers = User::where('role', User::ROLE_LAVEUR)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar']);

        return Inertia::render('Caissier/Tickets/Create', [
            'services'     => $services->groupBy('category'),
            'priceGrid'    => $priceGrid,
            'vehicleTypes' => $vehicleTypes,
            'brands'       => $brands,
            'washers'      => $washers,
        ]);
    }

    public function store(StoreTicketRequest $request): RedirectResponse
    {
        $user  = auth()->user();
        $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

        // Construire le snapshot textuel marque+modèle pour l'historique
        $brandSnapshot = null;
        if ($request->vehicle_brand_id) {
            $brand  = VehicleBrand::find($request->vehicle_brand_id);
            $model  = $request->vehicle_model_id
                ? \App\Models\VehicleModel::find($request->vehicle_model_id)
                : null;
            $brandSnapshot = trim($brand?->name . ' ' . $model?->name);
        } elseif ($request->vehicle_brand) {
            $brandSnapshot = $request->vehicle_brand;
        }        $ticket = Ticket::create([
            'vehicle_brand'       => $brandSnapshot,
            'vehicle_brand_id'    => $request->vehicle_brand_id,
            'vehicle_model_id'    => $request->vehicle_model_id,
            'vehicle_plate'       => $request->vehicle_plate,
            'vehicle_type_id'     => $request->vehicle_type_id,
            'client_id'           => $request->client_id,
            'assigned_to'         => $request->assigned_to,
            'created_by'          => $user->id,
            'shift_id'            => $shift?->id,
            'notes'               => $request->notes,
            'estimated_duration'  => $request->estimated_duration,
            'due_at'              => $request->estimated_duration
                                        ? now()->addMinutes($request->estimated_duration)
                                        : null,
            'status'              => Ticket::STATUS_PENDING,
        ]);

        foreach ($request->services as $line) {
            $service = Service::findOrFail($line['service_id']);

            TicketService::create([
                'ticket_id'           => $ticket->id,
                'service_id'          => $service->id,
                'service_name'        => $service->name,
                'unit_price_cents'    => $line['unit_price_cents'],
                'quantity'            => $line['quantity'] ?? 1,
                'discount_cents'      => $line['discount_cents'] ?? 0,
                'price_variant_id'    => $line['price_variant_id'] ?? null,
                'price_variant_label' => isset($line['price_variant_id'])
                    ? VehicleType::find($line['price_variant_id'])?->name
                    : null,
            ]);
        }

        $ticket->refresh();        ActivityLog::log('ticket.created', $ticket, [
            'ticket_number' => $ticket->ticket_number,
            'vehicle'       => $brandSnapshot,
            'total_cents'   => $ticket->total_cents,
            'assigned_to'   => $request->assigned_to,
        ]);

        // Broadcast to the assigned laveur + admin dashboard
        if ($ticket->assigned_to) {
            TicketAssigned::dispatch($ticket);
        }

        return redirect()->route('caissier.tickets.show', $ticket->ulid)
                         ->with('success', "Ticket {$ticket->ticket_number} créé avec succès.");
    }

    public function show(Ticket $ticket): Response
    {
        $ticket->load([
            'vehicleType', 'creator', 'assignedTo', 'paidBy',
            'client', 'shift', 'services.service', 'payment.processedBy',
        ]);

        return Inertia::render('Caissier/Tickets/Show', [
            'ticket'      => $ticket,
            'transitions' => Ticket::TRANSITIONS[$ticket->status] ?? [],
        ]);
    }    /** Page de recherche globale de tickets. */
    public function search(Request $request): Response
    {
        $q       = trim($request->query('q', ''));
        $tickets = collect();

        if (strlen($q) >= 2) {
            $tickets = Ticket::with(['vehicleType', 'creator', 'client', 'assignedTo'])
                ->where(function ($query) use ($q) {
                    $query->where('ticket_number', 'like', "%{$q}%")
                          ->orWhere('vehicle_plate', 'like', "%{$q}%")
                          ->orWhereHas('client', fn ($c) => $c
                              ->where('name', 'like', "%{$q}%")
                              ->orWhere('phone', 'like', "%{$q}%")
                          );
                })
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();
        }

        return Inertia::render('Caissier/Tickets/Search', [
            'tickets' => $tickets,
            'query'   => $q,
        ]);
    }

    /** Changer le statut d'un ticket (hors paiement). */
    public function updateStatus(Request $request, Ticket $ticket): RedirectResponse
    {
        $request->validate([
            'status'            => ['required', 'string', 'in:in_progress,completed,cancelled'],
            'cancelled_reason'  => ['nullable', 'string', 'max:255'],
        ]);

        $oldStatus = $ticket->status;

        $ticket->transitionTo($request->status, [
            'cancelled_reason' => $request->cancelled_reason,
        ]);        ActivityLog::log('ticket.status_changed', $ticket, [
            'from'   => $oldStatus,
            'to'     => $request->status,
            'ticket' => $ticket->ticket_number,
        ]);

        TicketStatusUpdated::dispatch($ticket, $oldStatus);

        return back()->with('success', 'Statut mis à jour.');
    }
}
