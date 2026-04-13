<?php

namespace App\Http\Controllers\Caissier;

use App\Events\TicketStatusUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketRequest;
use App\Http\Requests\UpdateTicketRequest;
use App\DTOs\CreateTicketDTO;
use App\DTOs\UpdateTicketDTO;
use App\Models\ActivityLog;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use App\Models\VehicleBrand;
use App\Models\VehicleType;
use App\Http\Resources\TicketResource;
use App\Services\PricingService;
use App\Services\TicketService as TicketServiceService;
use App\Services\WasherScheduler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class TicketController extends Controller
{
    public function index(Request $request): Response
    {        $query = Ticket::with(['vehicleType', 'creator', 'assignedTo', 'client', 'services'])
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
        }        if ($request->query('today')) {
            $query->whereDate('created_at', today());
        }
        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $tickets = $query->paginate(25)->withQueryString();

        // Inject brand_logo_url per ticket (single extra query, avoids vehicle_brand column/relation collision)
        $brandIds = $tickets->pluck('vehicle_brand_id')->filter()->unique()->values();
        if ($brandIds->isNotEmpty()) {
            $brands = VehicleBrand::whereIn('id', $brandIds)
                ->get(['id', 'logo_path'])
                ->keyBy('id');
            $tickets->getCollection()->transform(function ($ticket) use ($brands) {
                $brand = $brands->get($ticket->vehicle_brand_id);
                $ticket->brand_logo_url = $brand?->logo_url;
                return $ticket;
            });
        }        $statusCounts = Ticket::query()
            ->when($request->query('today'), fn ($q) => $q->whereDate('created_at', today()))
            ->when($request->query('date_from'), fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->query('date_to'), fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $allStatuses = ['pending', 'in_progress', 'completed', 'partial', 'paid', 'cancelled'];
        foreach ($allStatuses as $s) {
            $statusCounts[$s] = $statusCounts[$s] ?? 0;
        }

        return Inertia::render('Caissier/Tickets/Index', [
            'tickets'      => $tickets,
            'filters'      => $request->only('status', 'search', 'today', 'date_from', 'date_to'),
            'statuses'     => Ticket::TRANSITIONS,
            'statusCounts' => $statusCounts,
        ]);
    }    public function create(Request $request): Response
    {
        // Pré-remplissage depuis un RDV (optionnel)
        $prefill = null;
        if ($apptUlid = $request->query('prefill_appointment')) {
            $appt = Appointment::with(['client', 'vehicleBrand', 'vehicleModel', 'vehicleType'])
                ->where('ulid', $apptUlid)
                ->first();

            if ($appt) {
                /** @var \App\Models\Client|null $client */
                $client  = $appt->client;
                $prefill = [
                    'appointment_id'     => $appt->id,
                    'appointment_ulid'   => $appt->ulid,
                    'client'             => $client ? [
                        'id'         => $client->id,
                        'name'       => $client->name,
                        'phone'      => $client->phone,
                        'is_company' => $client->is_company,
                    ] : null,
                    'vehicle_plate'      => $appt->vehicle_plate,
                    'vehicle_brand_id'   => $appt->vehicle_brand_id,
                    'vehicle_model_id'   => $appt->vehicle_model_id,
                    'vehicle_type_id'    => $appt->vehicle_type_id,
                    'assigned_to'        => $appt->assigned_to,
                    'estimated_duration' => $appt->estimated_duration,
                    'notes'              => $appt->notes,
                ];
            }
        }

        return Inertia::render('Caissier/Tickets/Create', array_merge(
            $this->getFormProps(),
            ['serverNow' => now()->toIso8601String(), 'prefill' => $prefill],
        ));
    }public function store(StoreTicketRequest $request): RedirectResponse
    {
        $dto = CreateTicketDTO::fromRequest($request);

        try {
            $ticket = app(TicketServiceService::class)->create($dto, auth()->user());
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;        } catch (\Throwable $e) {
            Log::error('Ticket creation failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return back()->withErrors(['ticket' => 'Erreur lors de la création du ticket. Veuillez réessayer.']);
        }

        return redirect()->route('caissier.tickets.show', $ticket->ulid)
                         ->with('success', "Ticket {$ticket->ticket_number} créé avec succès.");
    }    public function show(Ticket $ticket): Response
    {
        $this->authorize('view', $ticket);

        $ticket->load([
            'vehicleType', 'creator', 'assignedTo', 'paidBy',            'client', 'shift', 'services.service', 'payment.processedBy',
        ]);        $settings = \App\Models\Setting::getMany([
            'center_name', 'center_subtitle', 'center_address', 'center_phone',
            'center_city', 'center_logo', 'receipt_footer',
            'receipt_paper_width', 'receipt_show_logo', 'receipt_show_qr',
            'receipt_template',
            'receipt_show_client_phone',
            'receipt_show_operator',
            'receipt_show_payment_detail',
            'receipt_show_dates',
            'auto_print_receipt',
        ]);        return Inertia::render('Caissier/Tickets/Show', [
            'ticket'           => new TicketResource($ticket),
            'transitions'      => Ticket::TRANSITIONS[$ticket->status] ?? [],
            'settings'         => $settings,
            'autoPrintReceipt' => (bool) ($settings['auto_print_receipt'] ?? false),
            'publicUrl'        => \App\Http\Controllers\PublicTicketController::signedUrl($ticket->ulid),
        ]);
    }    public function edit(Ticket $ticket): Response
    {
        $this->authorize('update', $ticket);

        $ticket->load(['vehicleType', 'vehicleBrand', 'vehicleModel', 'client', 'assignedTo', 'services.service']);

        return Inertia::render('Caissier/Tickets/Edit', array_merge(
            $this->getFormProps(),
            ['ticket' => new TicketResource($ticket)],
        ));
    }    public function update(UpdateTicketRequest $request, Ticket $ticket): RedirectResponse
    {
        // Authorization is handled by UpdateTicketRequest::authorize() via TicketPolicy.
        $dto = UpdateTicketDTO::fromRequest($request);

        try {
            app(TicketServiceService::class)->update($dto, $ticket);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e; // Inertia surfaces field-level errors to the form.        } catch (\Throwable $e) {
            Log::error('Ticket update failed', [
                'ticket' => $ticket->ticket_number,
                'error'  => $e->getMessage(),
            ]);
            return back()->withErrors(['ticket' => 'Erreur lors de la mise à jour du ticket. Veuillez réessayer.']);
        }

        return redirect()->route('caissier.tickets.show', $ticket->ulid)
                         ->with('success', "Ticket {$ticket->ticket_number} mis à jour.");
    }

    public function destroy(Ticket $ticket): RedirectResponse
    {
        $this->authorize('delete', $ticket);

        if ($ticket->status === Ticket::STATUS_PAID) {
            return back()->withErrors(['ticket' => 'Impossible de supprimer un ticket payé.']);
        }

        ActivityLog::log('ticket.deleted', $ticket, ['ticket' => $ticket->ticket_number]);
        $ticket->delete();

        return redirect()->route('caissier.tickets.index')
                         ->with('success', "Ticket {$ticket->ticket_number} supprimé.");
    }

    /**
     * Shared props for both the Create and Edit forms.
     *
     * All heavy queries are cache-backed (60-second TTL) so that opening the
     * POS form never triggers a full catalog scan on every request.
     *
     * AUDIT-FIX: Reduced TTL from 300s to 60s to prevent stale price/service data.
     *
     * @return array<string, mixed>
     */
    private function getFormProps(): array
    {
        $services = Cache::remember('active_services_with_prices', 60, fn () =>
            Service::active()
                ->with('prices.vehicleType')
                ->orderBy('category')
                ->orderBy('sort_order')
                ->get(['id', 'name', 'description', 'color', 'category', 'price_type',
                       'base_price_cents', 'duration_minutes', 'sort_order'])
        );

        $priceGrid = Cache::remember('price_grid', 60, fn () =>
            PricingService::buildPriceGrid($services)
        );

        $brands = Cache::remember('active_brands_with_models', 60, fn () =>
            VehicleBrand::active()
                ->with(['models' => fn ($q) => $q->active()->orderBy('sort_order')->orderBy('name')])
                ->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name', 'slug', 'logo_path'])
        );

        $vehicleTypes = Cache::remember('active_vehicle_types', 60, fn () =>
            VehicleType::active()->get(['id', 'name', 'slug', 'icon'])
        );

        // Sellable products for POS
        $sellableProducts = Cache::remember('active_sellable_products', 60, fn () =>
            \App\Models\SellableProduct::active()
                ->orderBy('name')
                ->get(['id', 'name', 'barcode', 'selling_price_cents', 'current_stock', 'unit'])
        );

        // Washer availability is real-time — intentionally not cached.
        $washers = User::where('role', User::ROLE_LAVEUR)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar'])
            ->map(fn ($w) => array_merge($w->toArray(), WasherScheduler::getAvailability($w->id)));

        // Atelier client for free products
        $atelierClient = Client::atelier();

        return [
            'services'         => $services->groupBy('category'),
            'priceGrid'        => $priceGrid,
            'vehicleTypes'     => $vehicleTypes,
            'brands'           => $brands,
            'washers'          => $washers,
            'sellableProducts' => $sellableProducts,
            'atelierClientId'  => $atelierClient->id,
        ];
    }    /** Endpoint JSON — disponibilité fraîche de tous les laveurs (appelé par le WasherDrawer). */
    public function washerQueue(Request $request): \Illuminate\Http\JsonResponse
    {
        $duration = $request->integer('duration', 0);

        $washers = User::where('role', User::ROLE_LAVEUR)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar'])
            ->map(function ($w) use ($duration) {
                // ARCH-ITEM-2.6 (F-09): use WasherScheduler::getAvailability() — moved from static controller method
                $availability = WasherScheduler::getAvailability($w->id);
                $feasibility  = WasherScheduler::feasibilityCheck($w->id, $duration);

                return array_merge($w->toArray(), $availability, $feasibility);
            });

        return response()->json([
            'washers' => $washers,
            'now'     => now()->toIso8601String(),
        ]);
    }

    /** Page de recherche globale de tickets. */
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
        $this->authorize('updateStatus', $ticket);
$request->validate([
            'status'           => ['required', 'string', 'in:in_progress,paused,blocked,completed,payment_pending,cancelled'],
            'cancelled_reason' => ['nullable', 'string', 'max:255'],
            'pause_reason'     => ['nullable', 'string', 'max:255'],
            'payment_provider' => ['nullable', 'string', 'max:50'],
        ]);

        $oldStatus = $ticket->status;

        $ticket->transitionTo($request->status, array_filter([
            'cancelled_reason' => $request->cancelled_reason,
            'pause_reason'     => $request->pause_reason,
            'payment_provider' => $request->payment_provider,
        ]));

        ActivityLog::log('ticket.status_changed', $ticket, [
            'from'   => $oldStatus,
            'to'     => $request->status,            'ticket' => $ticket->ticket_number,
        ]);        try {
            TicketStatusUpdated::dispatch($ticket, $oldStatus);
        } catch (\Throwable $e) {
            Log::warning('Broadcast TicketStatusUpdated failed: ' . $e->getMessage());
        }

        return back()->with('success', 'Statut mis à jour.');
    }
}
