<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Service;
use App\Models\TicketTemplate;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TicketTemplateController extends Controller
{
    public function index(): Response
    {
        $templates = TicketTemplate::with(['client', 'vehicleType', 'assignedToUser'])
            ->orderByDesc('is_active')
            ->orderBy('next_run_at')
            ->paginate(25);

        $clients      = Client::active()->orderBy('name')->get(['id', 'name', 'vehicle_plate']);
        $vehicleTypes = VehicleType::orderBy('name')->get(['id', 'name']);
        $services     = Service::active()->orderBy('name')->get(['id', 'name', 'base_price_cents']);
        $laveurs      = User::laveurs()->orderBy('name')->get(['id', 'name']);

        // Cron presets lisibles
        $cronPresets = [
            ['value' => '0 8 * * 1',   'label' => 'Chaque lundi à 8h'],
            ['value' => '0 8 * * 2',   'label' => 'Chaque mardi à 8h'],
            ['value' => '0 8 * * 3',   'label' => 'Chaque mercredi à 8h'],
            ['value' => '0 8 * * 4',   'label' => 'Chaque jeudi à 8h'],
            ['value' => '0 8 * * 5',   'label' => 'Chaque vendredi à 8h'],
            ['value' => '0 8 * * 6',   'label' => 'Chaque samedi à 8h'],
            ['value' => '0 8 * * 1-5', 'label' => 'Chaque jour ouvré à 8h'],
            ['value' => '0 8 * * *',   'label' => 'Tous les jours à 8h'],
            ['value' => '0 8 1 * *',   'label' => 'Le 1er du mois à 8h'],
        ];

        return Inertia::render('Admin/TicketTemplates/Index', [
            'templates'    => $templates,
            'clients'      => $clients,
            'vehicleTypes' => $vehicleTypes,
            'services'     => $services,
            'laveurs'      => $laveurs,
            'cronPresets'  => $cronPresets,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'client_id'              => ['required', 'exists:clients,id'],
            'vehicle_plate'          => ['nullable', 'string', 'max:20'],
            'vehicle_brand'          => ['nullable', 'string', 'max:80'],
            'vehicle_type_id'        => ['nullable', 'exists:vehicle_types,id'],
            'service_ids'            => ['nullable', 'array'],
            'service_ids.*'          => ['exists:services,id'],
            'estimated_duration'     => ['required', 'integer', 'min:5', 'max:480'],
            'assigned_to_preference' => ['nullable', 'exists:users,id'],
            'recurrence_rule'        => ['required', 'string', 'max:100'],
            'label'                  => ['nullable', 'string', 'max:150'],
            'notes'                  => ['nullable', 'string', 'max:1000'],
            'is_active'              => ['boolean'],
        ]);

        $template = TicketTemplate::create($data);

        return back()->with('success', "Template «{$template->label}» créé. Prochaine exécution : {$template->next_run_at?->format('d/m/Y H:i')}");
    }

    public function update(Request $request, TicketTemplate $ticketTemplate): RedirectResponse
    {
        $data = $request->validate([
            'client_id'              => ['required', 'exists:clients,id'],
            'vehicle_plate'          => ['nullable', 'string', 'max:20'],
            'vehicle_brand'          => ['nullable', 'string', 'max:80'],
            'vehicle_type_id'        => ['nullable', 'exists:vehicle_types,id'],
            'service_ids'            => ['nullable', 'array'],
            'service_ids.*'          => ['exists:services,id'],
            'estimated_duration'     => ['required', 'integer', 'min:5', 'max:480'],
            'assigned_to_preference' => ['nullable', 'exists:users,id'],
            'recurrence_rule'        => ['required', 'string', 'max:100'],
            'label'                  => ['nullable', 'string', 'max:150'],
            'notes'                  => ['nullable', 'string', 'max:1000'],
            'is_active'              => ['boolean'],
        ]);

        // Si la règle cron change, recalculer next_run_at
        if ($data['recurrence_rule'] !== $ticketTemplate->recurrence_rule) {
            $ticketTemplate->fill($data);
            $data['next_run_at'] = $ticketTemplate->computeNextRunAt();
        }

        $ticketTemplate->update($data);

        return back()->with('success', 'Template mis à jour.');
    }

    public function destroy(TicketTemplate $ticketTemplate): RedirectResponse
    {
        $ticketTemplate->delete();

        return back()->with('success', 'Template supprimé.');
    }

    public function toggleActive(TicketTemplate $ticketTemplate): RedirectResponse
    {
        $ticketTemplate->update(['is_active' => ! $ticketTemplate->is_active]);

        $state = $ticketTemplate->is_active ? 'activé' : 'désactivé';

        return back()->with('success', "Template {$state}.");
    }

    /** Déclenche manuellement la création du ticket pour ce template. */
    public function runNow(TicketTemplate $ticketTemplate): RedirectResponse
    {
        $ticket = $ticketTemplate->createFromTemplate();

        if (! $ticket) {
            return back()->with('error', 'Impossible de créer le ticket (client introuvable ?).');
        }

        $ticketTemplate->updateNextRun();

        return back()->with('success', "Ticket #{$ticket->ticket_number} créé manuellement.");
    }

    /** Détail d'un template récurrent avec l'historique des tickets générés. */
    public function show(TicketTemplate $ticketTemplate): Response
    {
        $ticketTemplate->load(['client', 'vehicleType', 'assignedToUser']);

        // Tickets générés par ce template (derniers 30)
        $generatedTickets = \App\Models\Ticket::where('ticket_template_id', $ticketTemplate->id)
            ->with(['assignedTo'])
            ->orderByDesc('created_at')
            ->take(30)
            ->get(['id', 'ticket_number', 'ulid', 'status', 'total_cents', 'created_at', 'assigned_to', 'ticket_template_id']);

        // Services liés (via service_ids JSON)
        $services = [];
        if (!empty($ticketTemplate->service_ids)) {
            $services = \App\Models\Service::whereIn('id', $ticketTemplate->service_ids)
                ->get(['id', 'name', 'base_price_cents']);
        }

        return Inertia::render('Admin/TicketTemplates/Show', [
            'template'         => $ticketTemplate,
            'generatedTickets' => $generatedTickets,
            'services'         => $services,
        ]);
    }
}
