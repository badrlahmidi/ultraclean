<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\QuoteSentMail;
use App\Models\Client;
use App\Models\Quote;
use App\Models\QuoteLine;
use App\Models\Service;
use App\Models\Invoice;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class QuoteController extends Controller
{
    // ── Index ─────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = Quote::with(['client', 'creator'])
            ->when($request->search, fn ($q, $s) =>
                $q->whereHas('client', fn ($c) => $c->where('name', 'like', "%{$s}%"))
                  ->orWhere('quote_number', 'like', "%{$s}%")
            )
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest();

        $quotes = $query->paginate(20)->withQueryString();

        // Résumé stats
        $stats = [
            'total'    => Quote::count(),
            'draft'    => Quote::where('status', 'draft')->count(),
            'sent'     => Quote::where('status', 'sent')->count(),
            'accepted' => Quote::where('status', 'accepted')->count(),
            'total_amount_cents' => Quote::whereIn('status', ['accepted'])->sum('total_cents'),
        ];

        return Inertia::render('Admin/Quotes/Index', [
            'quotes'   => $quotes,
            'stats'    => $stats,
            'filters'  => $request->only('search', 'status'),
            'statuses' => Quote::STATUS_LABELS,
            'clients'  => Client::select('id', 'name', 'is_company', 'ice')->orderBy('name')->get(),
        ]);
    }

    // ── Create (page dédiée) ──────────────────────────────────────────────

    public function create(): Response
    {
        return Inertia::render('Admin/Quotes/Create', [
            'clients'  => Client::select('id', 'name', 'is_company', 'ice')->orderBy('name')->get(),
            'services' => Service::select('id', 'name', 'base_price_cents')->active()->orderBy('name')->get(),
            'settings' => \App\Models\Setting::pluck('value', 'key'),
        ]);
    }

    // ── Show ──────────────────────────────────────────────────────────────

    public function show(Quote $quote): Response
    {
        $quote->load(['client', 'creator', 'lines.service', 'invoices']);

        return Inertia::render('Admin/Quotes/Show', [
            'quote'    => $quote,
            'services' => Service::select('id', 'name', 'base_price_cents')->active()->orderBy('name')->get(),
            'statuses' => Quote::STATUS_LABELS,
            'colors'   => Quote::STATUS_COLORS,
        ]);
    }

    // ── Store ─────────────────────────────────────────────────────────────

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'client_id'       => 'required|exists:clients,id',
            'notes'           => 'nullable|string',
            'valid_until'     => 'nullable|date',
            'tax_rate'        => 'nullable|numeric|min:0|max:100',
            'billing_name'    => 'nullable|string|max:200',
            'billing_address' => 'nullable|string|max:500',
            'billing_city'    => 'nullable|string|max:100',
            'billing_zip'     => 'nullable|string|max:20',
            'billing_ice'     => 'nullable|string|max:50',
        ]);

        // Pre-fill billing from client if company
        if (empty($data['billing_name'])) {
            $client = Client::find($data['client_id']);
            $data['billing_name'] = $client->name;
            $data['billing_ice']  = $client->ice;
        }

        $quote = Quote::create(array_merge($data, [
            'created_by' => auth()->id(),
            'tax_rate'   => $data['tax_rate'] ?? Setting::get('default_tax_rate', 0),
        ]));

        return redirect()->route('admin.quotes.show', $quote)
            ->with('success', "Devis {$quote->quote_number} créé.");
    }

    // ── Update ────────────────────────────────────────────────────────────

    public function update(Request $request, Quote $quote): RedirectResponse
    {
        $this->authorize_editable($quote);

        $data = $request->validate([
            'notes'           => 'nullable|string',
            'valid_until'     => 'nullable|date',
            'tax_rate'        => 'nullable|numeric|min:0|max:100',
            'discount_cents'  => 'nullable|integer|min:0',
            'billing_name'    => 'nullable|string|max:200',
            'billing_address' => 'nullable|string|max:500',
            'billing_city'    => 'nullable|string|max:100',
            'billing_zip'     => 'nullable|string|max:20',
            'billing_ice'     => 'nullable|string|max:50',
        ]);

        $quote->update($data);

        if (isset($data['tax_rate']) || isset($data['discount_cents'])) {
            $quote->recalculate();
        }

        return back()->with('success', 'Devis mis à jour.');
    }

    // ── Destroy ───────────────────────────────────────────────────────────

    public function destroy(Quote $quote): RedirectResponse
    {
        $this->authorize_editable($quote);
        $quote->delete();

        return redirect()->route('admin.quotes.index')
            ->with('success', "Devis {$quote->quote_number} supprimé.");
    }

    // ── Lignes ────────────────────────────────────────────────────────────

    public function addLine(Request $request, Quote $quote): RedirectResponse
    {
        $this->authorize_editable($quote);

        $data = $request->validate([
            'service_id'      => 'nullable|exists:services,id',
            'description'     => 'required|string|max:300',
            'quantity'        => 'required|integer|min:1|max:999',
            'unit_price_cents'=> 'required|integer|min:0',
            'discount_cents'  => 'nullable|integer|min:0',
        ]);

        $max = $quote->lines()->max('sort_order') ?? 0;
        $quote->lines()->create(array_merge($data, [
            'sort_order'     => $max + 1,
            'discount_cents' => $data['discount_cents'] ?? 0,
        ]));

        return back()->with('success', 'Ligne ajoutée.');
    }

    public function updateLine(Request $request, Quote $quote, QuoteLine $line): RedirectResponse
    {
        $this->authorize_editable($quote);

        $data = $request->validate([
            'description'     => 'required|string|max:300',
            'quantity'        => 'required|integer|min:1|max:999',
            'unit_price_cents'=> 'required|integer|min:0',
            'discount_cents'  => 'nullable|integer|min:0',
        ]);

        $line->update(array_merge($data, ['discount_cents' => $data['discount_cents'] ?? 0]));

        return back()->with('success', 'Ligne mise à jour.');
    }

    public function removeLine(Quote $quote, QuoteLine $line): RedirectResponse
    {
        $this->authorize_editable($quote);
        $line->delete();

        return back()->with('success', 'Ligne supprimée.');
    }

    // ── Transitions ──────────────────────────────────────────────────────

    public function send(Quote $quote): RedirectResponse
    {
        $quote->transitionTo(Quote::STATUS_SENT);

        // Envoyer le devis par email si le client a un email
        $client = $quote->client;
        if ($client?->email) {
            Mail::to($client->email)->queue(new QuoteSentMail($quote));
        }

        return back()->with('success', 'Devis marqué comme envoyé.');
    }

    public function accept(Quote $quote): RedirectResponse
    {
        $quote->transitionTo(Quote::STATUS_ACCEPTED);
        return back()->with('success', 'Devis accepté.');
    }

    public function refuse(Quote $quote): RedirectResponse
    {
        $quote->transitionTo(Quote::STATUS_REFUSED);
        return back()->with('success', 'Devis refusé.');
    }

    // ── Conversion → Facture ─────────────────────────────────────────────

    public function convertToInvoice(Quote $quote): RedirectResponse
    {
        if (! $quote->isConvertible()) {
            return back()->withErrors(['error' => 'Ce devis ne peut pas être converti.']);
        }

        $invoice = DB::transaction(function () use ($quote) {
            $inv = Invoice::create([
                'quote_id'        => $quote->id,
                'client_id'       => $quote->client_id,
                'created_by'      => auth()->id(),
                'tax_rate'        => $quote->tax_rate,
                'discount_cents'  => $quote->discount_cents,
                'billing_name'    => $quote->billing_name,
                'billing_address' => $quote->billing_address,
                'billing_city'    => $quote->billing_city,
                'billing_zip'     => $quote->billing_zip,
                'billing_ice'     => $quote->billing_ice,
                'notes'           => $quote->notes,
                'due_date'        => now()->addDays(30)->toDateString(),
            ]);            /** @var QuoteLine $line */
            foreach ($quote->lines as $line) {
                $inv->lines()->create([
                    'service_id'       => $line->service_id,
                    'description'      => $line->description,
                    'quantity'         => $line->quantity,
                    'unit_price_cents' => $line->unit_price_cents,
                    'discount_cents'   => $line->discount_cents,
                    'sort_order'       => $line->sort_order,
                ]);
            }

            return $inv;
        });

        return redirect()->route('admin.invoices.show', $invoice)
            ->with('success', "Facture {$invoice->invoice_number} créée depuis le devis.");
    }

    // ── PDF téléchargement ────────────────────────────────────────────────

    public function downloadPdf(Quote $quote)
    {
        $relative = $quote->generatePdf(); // always regenerate to ensure fresh content
        $absolute = Storage::disk('public')->path($relative);

        return response()->download($absolute, "devis-{$quote->quote_number}.pdf", [
            'Content-Type' => 'application/pdf',
        ]);
    }

    // ── Helper privé ─────────────────────────────────────────────────────

    private function authorize_editable(Quote $quote): void
    {
        if (! in_array($quote->status, [Quote::STATUS_DRAFT, Quote::STATUS_SENT])) {
            abort(403, 'Ce devis ne peut plus être modifié.');
        }
    }
}
