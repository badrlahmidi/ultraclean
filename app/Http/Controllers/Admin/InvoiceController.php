<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\InvoiceIssuedMail;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    // ── Index ─────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = Invoice::with(['client', 'creator', 'quote'])
            ->when($request->search, fn ($q, $s) =>
                $q->whereHas('client', fn ($c) => $c->where('name', 'like', "%{$s}%"))
                  ->orWhere('invoice_number', 'like', "%{$s}%")
            )
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest();

        $invoices = $query->paginate(20)->withQueryString();

        $stats = [
            'total'            => Invoice::count(),
            'issued'           => Invoice::where('status', 'issued')->count(),
            'paid'             => Invoice::where('status', 'paid')->count(),
            'partial'          => Invoice::where('status', 'partial')->count(),
            'total_paid_cents' => Invoice::whereIn('status', ['paid', 'partial'])->sum('amount_paid_cents'),
            'total_remaining_cents' => Invoice::whereIn('status', ['issued', 'partial'])
                ->selectRaw('SUM(total_cents - amount_paid_cents) as remaining')
                ->value('remaining') ?? 0,
        ];

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => $invoices,
            'stats'    => $stats,
            'filters'  => $request->only('search', 'status'),
            'statuses' => Invoice::STATUS_LABELS,
            'clients'  => Client::select('id', 'name', 'is_company', 'ice')->orderBy('name')->get(),
        ]);
    }

    // ── Create (page dédiée) ──────────────────────────────────────────────

    public function create(): Response
    {
        return Inertia::render('Admin/Invoices/Create', [
            'clients'  => Client::select('id', 'name', 'is_company', 'ice')->orderBy('name')->get(),
            'services' => Service::select('id', 'name', 'base_price_cents')->active()->orderBy('name')->get(),
            'settings' => \App\Models\Setting::pluck('value', 'key'),
        ]);
    }

    // ── Show ──────────────────────────────────────────────────────────────

    public function show(Invoice $invoice): Response
    {
        $invoice->load(['client', 'creator', 'quote', 'lines.service', 'tickets.services']);

        return Inertia::render('Admin/Invoices/Show', [
            'invoice'  => $invoice,
            'services' => Service::select('id', 'name', 'base_price_cents')->active()->orderBy('name')->get(),
            'statuses' => Invoice::STATUS_LABELS,
            'colors'   => Invoice::STATUS_COLORS,
        ]);
    }

    // ── Store ─────────────────────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'client_id'       => 'required|exists:clients,id',
            'notes'           => 'nullable|string',
            'due_date'        => 'nullable|date',
            'tax_rate'        => 'nullable|numeric|min:0|max:100',
            'billing_name'    => 'nullable|string|max:200',
            'billing_address' => 'nullable|string|max:500',
            'billing_city'    => 'nullable|string|max:100',
            'billing_zip'     => 'nullable|string|max:20',
            'billing_ice'     => 'nullable|string|max:50',
        ]);

        if (empty($data['billing_name'])) {
            $client = Client::find($data['client_id']);
            $data['billing_name'] = $client->name;
            $data['billing_ice']  = $client->ice;
        }

        $invoice = Invoice::create(array_merge($data, [
            'created_by' => auth()->id(),
            'tax_rate'   => $data['tax_rate'] ?? Setting::get('default_tax_rate', 0),
            'due_date'   => $data['due_date'] ?? now()->addDays(30)->toDateString(),
        ]));

        return redirect()->route('admin.invoices.show', $invoice)
            ->with('success', "Facture {$invoice->invoice_number} créée.");
    }

    // ── Update ────────────────────────────────────────────────────────────

    public function update(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->authorize_editable($invoice);

        $data = $request->validate([
            'notes'           => 'nullable|string',
            'due_date'        => 'nullable|date',
            'discount_cents'  => 'nullable|integer|min:0',
            'billing_name'    => 'nullable|string|max:200',
            'billing_address' => 'nullable|string|max:500',
            'billing_city'    => 'nullable|string|max:100',
            'billing_zip'     => 'nullable|string|max:20',
            'billing_ice'     => 'nullable|string|max:50',
        ]);

        $invoice->update($data);

        if (isset($data['discount_cents'])) {
            $invoice->recalculate();
        }

        return back()->with('success', 'Facture mise à jour.');
    }

    // ── Destroy ───────────────────────────────────────────────────────────

    public function destroy(Invoice $invoice): RedirectResponse
    {
        $this->authorize_editable($invoice);
        $invoice->delete();

        return redirect()->route('admin.invoices.index')
            ->with('success', "Facture {$invoice->invoice_number} supprimée.");
    }

    // ── Lignes ────────────────────────────────────────────────────────────

    public function addLine(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->authorize_editable($invoice);

        $data = $request->validate([
            'service_id'       => 'nullable|exists:services,id',
            'description'      => 'required|string|max:300',
            'quantity'         => 'required|integer|min:1|max:999',
            'unit_price_cents' => 'required|integer|min:0',
            'discount_cents'   => 'nullable|integer|min:0',
        ]);

        $max = $invoice->lines()->max('sort_order') ?? 0;
        $invoice->lines()->create(array_merge($data, [
            'sort_order'     => $max + 1,
            'discount_cents' => $data['discount_cents'] ?? 0,
        ]));

        return back()->with('success', 'Ligne ajoutée.');
    }

    public function updateLine(Request $request, Invoice $invoice, InvoiceLine $line): RedirectResponse
    {
        $this->authorize_editable($invoice);

        $data = $request->validate([
            'description'      => 'required|string|max:300',
            'quantity'         => 'required|integer|min:1|max:999',
            'unit_price_cents' => 'required|integer|min:0',
            'discount_cents'   => 'nullable|integer|min:0',
        ]);

        $line->update(array_merge($data, ['discount_cents' => $data['discount_cents'] ?? 0]));

        return back()->with('success', 'Ligne mise à jour.');
    }

    public function removeLine(Invoice $invoice, InvoiceLine $line): RedirectResponse
    {
        $this->authorize_editable($invoice);
        $line->delete();

        return back()->with('success', 'Ligne supprimée.');
    }

    // ── Tickets liés ─────────────────────────────────────────────────────

    public function addTickets(Request $request, Invoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'ticket_ids'   => 'required|array',
            'ticket_ids.*' => 'exists:tickets,id',
        ]);

        $invoice->tickets()->syncWithoutDetaching($data['ticket_ids']);        // Synchronise les lignes depuis les tickets attachés
        foreach (Ticket::whereIn('id', $data['ticket_ids'])->with('services.service')->get() as $ticket) {
            foreach ($ticket->services as $svc) {
                /** @var \App\Models\TicketService $svc */
                /** @var \App\Models\Service|null $service */
                $service = $svc->service;
                $invoice->lines()->create([
                    'service_id'       => $svc->service_id,
                    'description'      => $svc->service_name . ' — Ticket #' . $ticket->ticket_number,
                    'quantity'         => 1,
                    'unit_price_cents' => $svc->unit_price_cents ?? ($service->base_price_cents ?? 0),
                    'discount_cents'   => 0,
                    'sort_order'       => ($invoice->lines()->max('sort_order') ?? 0) + 1,
                ]);
            }
        }

        return back()->with('success', 'Tickets attachés à la facture.');
    }

    public function removeTicket(Invoice $invoice, Ticket $ticket): RedirectResponse
    {
        $invoice->tickets()->detach($ticket->id);
        return back()->with('success', 'Ticket détaché.');
    }

    // ── TVA toggle ────────────────────────────────────────────────────────

    public function updateTax(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->authorize_editable($invoice);

        $data = $request->validate([
            'include_tax' => 'required|boolean',
        ]);

        $rate = $data['include_tax']
            ? (float) Setting::get('default_tax_rate', 20.0)
            : 0.0;

        $invoice->update(['tax_rate' => $rate]);
        $invoice->recalculate();

        return back()->with('success', $data['include_tax'] ? 'TVA activée.' : 'TVA désactivée.');
    }

    // ── Transitions ──────────────────────────────────────────────────────

    public function issue(Invoice $invoice): RedirectResponse
    {
        $invoice->transitionTo(Invoice::STATUS_ISSUED);

        // Envoyer la facture par email si le client a un email
        $client = $invoice->client;
        if ($client?->email) {
            Mail::to($client->email)->queue(new InvoiceIssuedMail($invoice));
        }

        return back()->with('success', 'Facture émise.');
    }

    public function markPaid(Request $request, Invoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'amount_cents'  => 'nullable|integer|min:1',
            'method'        => 'nullable|string|in:cash,card,wire,mixed',
            'partial'       => 'nullable|boolean',
        ]);

        $method = $data['method'] ?? 'cash';

        if (! empty($data['partial']) && isset($data['amount_cents'])) {
            $invoice->recordPartialPayment($data['amount_cents'], $method);
            return back()->with('success', 'Paiement partiel enregistré.');
        }

        $invoice->markPaid($method);
        return back()->with('success', 'Facture marquée comme payée.');
    }

    // ── PDF ───────────────────────────────────────────────────────────────

    public function downloadPdf(Invoice $invoice)
    {
        $relative = $invoice->generatePdf(); // always regenerate to ensure fresh content
        $absolute = Storage::disk('public')->path($relative);

        return response()->download($absolute, "facture-{$invoice->invoice_number}.pdf", [
            'Content-Type' => 'application/pdf',
        ]);
    }

    // ── Helper privé ─────────────────────────────────────────────────────

    private function authorize_editable(Invoice $invoice): void
    {
        if (in_array($invoice->status, [Invoice::STATUS_PAID, Invoice::STATUS_CANCELLED])) {
            abort(403, 'Cette facture ne peut plus être modifiée.');
        }
    }
}
