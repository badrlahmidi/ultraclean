<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\TicketService;
use App\Models\User;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Notifications\NewAppointment;
use App\Services\WasherScheduler;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    // ── Index — liste paginée ─────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = Appointment::with(['client', 'assignedTo', 'vehicleType', 'ticket'])
            ->orderBy('scheduled_at');

        // Filtres
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($date = $request->query('date')) {
            $query->whereDate('scheduled_at', $date);
        } else {
            // Par défaut : aujourd'hui + futur
            $query->whereDate('scheduled_at', '>=', today());
        }
        if ($washer = $request->query('washer_id')) {
            $query->where('assigned_to', $washer);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('vehicle_plate', 'like', "%{$search}%")
                  ->orWhereHas('client', fn ($c) => $c
                      ->where('name', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                  );
            });
        }

        $appointments = $query->paginate(25)->withQueryString();

        $washers = User::where('role', User::ROLE_LAVEUR)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar']);

        $statusCounts = Appointment::query()
            ->whereDate('scheduled_at', '>=', today())
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return Inertia::render('Admin/Appointments/Index', [
            'appointments' => $appointments,
            'washers'      => $washers,
            'statusCounts' => $statusCounts,
            'filters'      => $request->only('status', 'date', 'washer_id', 'search'),
        ]);
    }

    // ── Calendar — vue jour par laveur ────────────────────────────────────

    public function calendar(Request $request): Response
    {
        $date = $request->query('date', today()->toDateString());
        $carbonDate = \Carbon\Carbon::parse($date);

        $washers = User::where('role', User::ROLE_LAVEUR)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'avatar']);

        // Charger les RDV du jour par laveur
        $appointmentsByWasher = [];
        foreach ($washers as $w) {
            $appointmentsByWasher[$w->id] = Appointment::with(['client', 'vehicleType'])
                ->where('assigned_to', $w->id)
                ->whereDate('scheduled_at', $carbonDate)
                ->orderBy('scheduled_at')
                ->get()                ->map(fn (Appointment $a) => [
                    'id'                 => $a->id,
                    'ulid'               => $a->ulid,
                    'status'             => $a->status,
                    'status_label'       => Appointment::STATUS_LABELS[$a->status] ?? $a->status,
                    'client_name'        => $a->client instanceof \App\Models\Client ? $a->client->name : 'Client non renseigné',
                    'vehicle_plate'      => $a->vehicle_plate,
                    'vehicle_brand'      => $a->vehicle_brand,
                    'scheduled_at'       => $a->scheduled_at->toIso8601String(),
                    'scheduled_end_at'   => $a->scheduledEndAt()->toIso8601String(),
                    'estimated_duration' => $a->estimated_duration,
                    'ticket_id'          => $a->ticket_id,
                    'is_convertible'     => $a->isConvertible(),
                    'notes'              => $a->notes,
                ]);
        }

        // Disponibilités live des laveurs
        $washerQueues = [];
        foreach ($washers as $w) {
            $washerQueues[$w->id] = WasherScheduler::feasibilityCheck($w->id, 30);
        }

        return Inertia::render('Admin/Appointments/Calendar', [
            'date'                  => $carbonDate->toDateString(),
            'washers'               => $washers,
            'appointmentsByWasher'  => $appointmentsByWasher,
            'washerQueues'          => $washerQueues,
            'openHour'              => (int) \App\Models\Setting::get('business_open_hour', 8),
            'closeHour'             => (int) \App\Models\Setting::get('business_close_hour', 21),
        ]);
    }

    // ── Store ─────────────────────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id'          => ['nullable', 'integer', 'exists:clients,id'],
            'assigned_to'        => ['nullable', 'integer', 'exists:users,id'],
            'scheduled_at'       => ['required', 'date', 'after:now'],
            'estimated_duration' => ['required', 'integer', 'min:5', 'max:480'],
            'vehicle_plate'      => ['nullable', 'string', 'max:20'],
            'vehicle_brand_id'   => ['nullable', 'integer', 'exists:vehicle_brands,id'],
            'vehicle_model_id'   => ['nullable', 'integer', 'exists:vehicle_models,id'],
            'vehicle_type_id'    => ['nullable', 'integer', 'exists:vehicle_types,id'],
            'notes'              => ['nullable', 'string', 'max:1000'],
            'source'             => ['nullable', 'string', 'in:walk_in,phone,online,whatsapp,admin'],
        ], [
            'scheduled_at.required' => 'La date et l\'heure sont obligatoires.',
            'scheduled_at.date'     => 'La date n\'est pas valide.',
            'scheduled_at.after'    => 'La date doit être dans le futur.',
            'estimated_duration.required' => 'La durée est obligatoire.',
            'estimated_duration.min'      => 'La durée minimale est de 5 minutes.',
            'estimated_duration.max'      => 'La durée maximale est de 480 minutes.',
        ]);

        // Snapshot brand name
        $brandSnapshot = null;
        if ($request->vehicle_brand_id) {
            $brand  = VehicleBrand::find($request->vehicle_brand_id);
            $model  = $request->vehicle_model_id ? VehicleModel::find($request->vehicle_model_id) : null;
            $brandSnapshot = trim(($brand->name ?? '') . ' ' . ($model->name ?? ''));
        }        $appointment = Appointment::create(array_merge($validated, [
            'created_by'    => auth()->id(),
            'vehicle_brand' => $brandSnapshot,
            'source'        => $request->source ?? 'phone',
            'status'        => Appointment::STATUS_PENDING,
        ]));        // Vérifier les conflits (avertissement, pas de blocage à la création)
        $conflicts = collect();
        if ($appointment->assigned_to && $appointment->scheduled_at) {
            $conflicts = Appointment::findConflicts(
                (int) $appointment->assigned_to,
                $appointment->scheduled_at,
                (int) $appointment->estimated_duration,
                $appointment->id
            );
        }

        ActivityLog::log('appointment.created', $appointment, [
            'scheduled_at' => $appointment->scheduled_at->toDateTimeString(),
        ]);

        // Notifier les admins + le laveur assigné
        $recipients = User::where('is_active', true)
            ->where(function ($q) use ($appointment) {
                $q->where('role', User::ROLE_ADMIN);
                if ($appointment->assigned_to) {
                    $q->orWhere('id', $appointment->assigned_to);
                }
            })
            ->where('id', '!=', auth()->id()) // ne pas notifier l'auteur
            ->get();

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new NewAppointment($appointment));
        }        $msg = 'Rendez-vous créé avec succès.';
        if ($conflicts->isNotEmpty()) {
            $count = $conflicts->count();
            $msg .= " ⚠️ Attention : {$count} conflit(s) détecté(s) avec d'autres RDV du même laveur.";
        }

        // [A5] Duplicate client detection: warn if same client has another RDV within ±2h
        if ($appointment->client_id) {
            $window = 2 * 60; // minutes
            $dupCount = Appointment::where('client_id', $appointment->client_id)
                ->where('id', '!=', $appointment->id)
                ->whereNotIn('status', [Appointment::STATUS_CANCELLED, Appointment::STATUS_NO_SHOW])
                ->whereDate('scheduled_at', $appointment->scheduled_at->toDateString())
                ->where(function ($q) use ($appointment, $window) {
                    $q->whereBetween('scheduled_at', [
                        $appointment->scheduled_at->copy()->subMinutes($window),
                        $appointment->scheduled_at->copy()->addMinutes($window),
                    ]);
                })
                ->count();

            if ($dupCount > 0) {
                $msg .= " ⚠️ Ce client a déjà un autre RDV dans les 2h autour de ce créneau.";
            }
        }

        return redirect()->route('admin.appointments.index')
            ->with('success', $msg);
    }

    // ── Update ────────────────────────────────────────────────────────────

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        if (! $appointment->isEditable()) {
            return back()->with('error', 'Ce rendez-vous ne peut plus être modifié.');
        }        $validated = $request->validate([
            'client_id'          => ['nullable', 'integer', 'exists:clients,id'],
            'assigned_to'        => ['nullable', 'integer', 'exists:users,id'],
            'scheduled_at'       => ['required', 'date'],
            'estimated_duration' => ['required', 'integer', 'min:5', 'max:480'],
            'vehicle_plate'      => ['nullable', 'string', 'max:20'],
            'vehicle_brand_id'   => ['nullable', 'integer', 'exists:vehicle_brands,id'],
            'vehicle_model_id'   => ['nullable', 'integer', 'exists:vehicle_models,id'],
            'vehicle_type_id'    => ['nullable', 'integer', 'exists:vehicle_types,id'],
            'notes'              => ['nullable', 'string', 'max:1000'],
            'source'             => ['nullable', 'string', 'in:walk_in,phone,online,whatsapp,admin'],
        ], [
            'scheduled_at.required'       => 'La date et l\'heure sont obligatoires.',
            'scheduled_at.date'           => 'La date n\'est pas valide.',
            'estimated_duration.required' => 'La durée est obligatoire.',
            'estimated_duration.min'      => 'La durée minimale est de 5 minutes.',
            'estimated_duration.max'      => 'La durée maximale est de 480 minutes.',
        ]);

        // Re-snapshot brand name si changé
        $brandSnapshot = $appointment->vehicle_brand;
        if (array_key_exists('vehicle_brand_id', $validated)) {
            $brand  = $validated['vehicle_brand_id'] ? VehicleBrand::find($validated['vehicle_brand_id']) : null;
            $model  = ($validated['vehicle_model_id'] ?? null) ? VehicleModel::find($validated['vehicle_model_id']) : null;
            $brandSnapshot = $brand ? trim($brand->name . ' ' . ($model->name ?? '')) : null;
        }

        $appointment->update(array_merge($validated, ['vehicle_brand' => $brandSnapshot]));

        return back()->with('success', 'Rendez-vous mis à jour.');
    }

    // ── Destroy ───────────────────────────────────────────────────────────

    public function destroy(Appointment $appointment): RedirectResponse
    {
        $appointment->delete();

        ActivityLog::log('appointment.deleted', $appointment, []);

        return redirect()->route('admin.appointments.index')
            ->with('success', 'Rendez-vous supprimé.');
    }

    // ── Confirm ───────────────────────────────────────────────────────────

    public function confirm(Appointment $appointment): RedirectResponse
    {
        try {
            $appointment->transitionTo(Appointment::STATUS_CONFIRMED);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        ActivityLog::log('appointment.confirmed', $appointment, []);

        // Vérifier les conflits après confirmation (avertissement)
        if ($appointment->assigned_to && $appointment->scheduled_at) {
            $conflicts = Appointment::findConflicts(
                (int) $appointment->assigned_to,
                $appointment->scheduled_at,
                (int) $appointment->estimated_duration,
                $appointment->id
            );

            if ($conflicts->isNotEmpty()) {
                $count = $conflicts->count();
                $labels = $conflicts->map(fn ($c) => sprintf(
                    '%s (%s)',
                    $c->vehicle_plate ?? 'Sans plaque',
                    $c->scheduled_at->format('H:i')
                ))->join(', ');

                return back()->with('warning',
                    "RDV confirmé — ⚠️ {$count} conflit(s) de créneau détecté(s) : {$labels}."
                );
            }
        }

        return back()->with('success', 'Rendez-vous confirmé.');
    }

    // ── Convert to Ticket ─────────────────────────────────────────────────

    public function convertToTicket(Appointment $appointment): RedirectResponse
    {
        $this->authorize('convertToTicket', $appointment);

        if (! $appointment->isConvertible()) {
            return back()->with('error', 'Ce rendez-vous ne peut pas être converti en ticket.');
        }

        $user = auth()->user();

        /** @var Ticket $ticket */
        $ticket = DB::transaction(function () use ($appointment, $user) {
            // Lock the appointment row to prevent double-conversion race condition
            $appointment = Appointment::lockForUpdate()->findOrFail($appointment->id);

            // Re-check convertibility inside the lock
            if (! $appointment->isConvertible()) {
                throw new \RuntimeException('RDV déjà converti ou dans un état non convertible.');
            }

            $shift = Shift::where('user_id', $user->id)->whereNull('closed_at')->first();

            $ticket = Ticket::create([
                'vehicle_plate'      => $appointment->vehicle_plate,
                'vehicle_brand'      => $appointment->vehicle_brand,
                'vehicle_brand_id'   => $appointment->vehicle_brand_id,
                'vehicle_model_id'   => $appointment->vehicle_model_id,
                'vehicle_type_id'    => $appointment->vehicle_type_id,
                'client_id'          => $appointment->client_id,
                'assigned_to'        => $appointment->assigned_to,
                'created_by'         => $user->id,
                'shift_id'           => $shift?->id,
                'notes'              => $appointment->notes,
                'estimated_duration' => $appointment->estimated_duration,
                'due_at'             => $appointment->assigned_to && $appointment->estimated_duration
                                        ? WasherScheduler::computeDueAt(
                                            (int) $appointment->assigned_to,
                                            (int) $appointment->estimated_duration
                                          )
                                        : null,
                'status'             => Ticket::STATUS_PENDING,
            ]);            // Link the ticket to the appointment
            $appointment->update(['ticket_id' => $ticket->id]);

            // Properly transition through the state machine:
            // confirmed → arrived → in_progress
            // arrived   → in_progress
            if ($appointment->isConfirmed()) {
                $appointment->transitionTo(Appointment::STATUS_ARRIVED);
            }
            if ($appointment->isArrived()) {
                $appointment->transitionTo(Appointment::STATUS_IN_PROGRESS);
            }

            ActivityLog::log('appointment.converted', $appointment, [
                'ticket_id'     => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
            ]);

            return $ticket;
        });

        // Redirect based on user role
        if ($user->isAdmin()) {
            return redirect()->route('admin.appointments.show', $appointment->id)
                ->with('success', "Ticket {$ticket->ticket_number} créé depuis le RDV.");
        }

        return redirect()->route('caissier.tickets.show', $ticket->ulid)
            ->with('success', "Ticket {$ticket->ticket_number} créé depuis le RDV.");
    }

    // ── Show — détail d'un RDV ─────────────────────────────────────────

    public function show(Appointment $appointment): Response
    {        $appointment->load([
            'client',
            'assignedTo',
            'vehicleType',
            'ticket.services.service',
            'creator',
        ]);

        // Historique des RDV du même client (5 derniers)
        $clientHistory = [];
        if ($appointment->client_id) {
            $clientHistory = Appointment::where('client_id', $appointment->client_id)
                ->where('id', '!=', $appointment->id)
                ->with(['assignedTo'])
                ->orderByDesc('scheduled_at')
                ->take(5)
                ->get(['id', 'ulid', 'scheduled_at', 'status', 'vehicle_plate', 'assigned_to', 'ticket_id']);
        }        return Inertia::render('Admin/Appointments/Show', [
            'appointment'   => $appointment,
            'clientHistory' => $clientHistory,
        ]);
    }    // ── Mark No-Show ──────────────────────────────────────────────────────

    /**
     * Marque un rendez-vous comme absence (no_show).
     * Transitions valides : pending → no_show, confirmed → no_show.
     */
    public function markNoShow(Appointment $appointment): RedirectResponse
    {
        try {
            $appointment->transitionTo(Appointment::STATUS_NO_SHOW);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        ActivityLog::log('appointment.no_show', $appointment, []);

        return back()->with('success', 'Rendez-vous marqué comme absent.');
    }    // ── Feasibility — API JSON ────────────────────────────────────────────

    /**
     * Retourne une analyse de faisabilité pour un créneau donné :
     * temps d'attente estimé, heure de fin, avertissement de dépassement.
     *
     * Utilise WasherScheduler::feasibilityCheck() qui retourne :
     *   queue_minutes, due_at (ISO8601 string|null), overflow (bool), warning (string|null)
     */
    public function feasibility(Appointment $appointment): JsonResponse
    {
        $washerId = (int) $appointment->assigned_to;
        $duration = (int) ($appointment->estimated_duration ?: 30);

        if (! $washerId) {
            return response()->json(['error' => 'Aucun laveur assigné.'], 422);
        }

        $check = WasherScheduler::feasibilityCheck($washerId, $duration);

        return response()->json([
            'washer_id'     => $washerId,
            'queue_minutes' => $check['queue_minutes'],
            'due_at'        => $check['due_at'],          // ISO8601 string|null
            'overflow'      => $check['overflow'],         // bool
            'warning'       => $check['warning'],          // string|null
        ]);
    }

    // ── Check Conflicts — API JSON ────────────────────────────────────────

    /**
     * Retourne les conflits pour un laveur à un créneau donné.
     * Utilisé par le frontend pour afficher les avertissements en temps réel.
     */
    public function checkConflicts(Request $request): JsonResponse
    {
        $request->validate([
            'assigned_to'        => ['required', 'integer', 'exists:users,id'],
            'scheduled_at'       => ['required', 'date'],
            'estimated_duration' => ['required', 'integer', 'min:5', 'max:480'],
            'exclude_id'         => ['nullable', 'integer'],
        ]);

        $conflicts = Appointment::findConflicts(
            (int) $request->assigned_to,
            Carbon::parse($request->scheduled_at),
            (int) $request->estimated_duration,
            $request->exclude_id ? (int) $request->exclude_id : null
        );

        return response()->json([
            'has_conflicts' => $conflicts->isNotEmpty(),
            'count'         => $conflicts->count(),
            'conflicts'     => $conflicts->map(fn ($c) => [
                'id'                 => $c->id,
                'vehicle_plate'      => $c->vehicle_plate,
                'client_name'        => $c->client?->name ?? 'Client inconnu',
                'scheduled_at'       => $c->scheduled_at->toIso8601String(),
                'scheduled_at_human' => $c->scheduled_at->format('H:i'),
                'estimated_duration' => $c->estimated_duration,
                'status'             => $c->status,
            ]),
        ]);
    }

    // ── Vehicle Brand Search — API JSON ──────────────────────────────────

    /**
     * Recherche de marques et modèles pour l'autocomplétion.
     */
    public function vehicleBrandSearch(Request $request): JsonResponse
    {
        $q = trim($request->query('q', ''));
        if (strlen($q) < 1) {
            return response()->json([]);
        }

        $brands = VehicleBrand::where('is_active', true)
            ->where('name', 'like', "%{$q}%")
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'name', 'logo_path'])
            ->map(function (VehicleBrand $b) use ($q) {
                $models = VehicleModel::where('brand_id', $b->id)
                    ->where('is_active', true)
                    ->where(function ($query) use ($q) {
                        $query->where('name', 'like', "%{$q}%")
                              ->orWhereRaw('1=1'); // include all models for matching brand
                    })
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->limit(20)
                    ->get(['id', 'name', 'suggested_vehicle_type_id']);

                return [
                    'id'       => $b->id,
                    'name'     => $b->name,
                    'logo_url' => $b->logo_url,
                    'models'   => $models,
                ];
            });

        return response()->json($brands);
    }
}
