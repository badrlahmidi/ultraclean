<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /** Shared filter scope */
    private function applyFilters($query, Request $request)
    {
        if ($method = $request->query('method')) {
            $query->where('method', $method);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($search = $request->query('search')) {
            $query->whereHas('ticket', function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }
        return $query;
    }

    public function index(Request $request): Response
    {
        $query = $this->applyFilters(
            Payment::with([
                'ticket:id,ticket_number,total_cents,status,client_id',
                'ticket.client:id,name,phone',
                'processedBy:id,name,role',
            ])->latest(),
            $request
        );

        $payments = $query->paginate(50)->withQueryString();

        $totals = $this->applyFilters(Payment::query(), $request)
            ->selectRaw('
                COUNT(*) as count,
                SUM(amount_cents) as total,
                SUM(amount_cash_cents) as total_cash,
                SUM(amount_card_cents) as total_card,
                SUM(amount_mobile_cents) as total_mobile,
                SUM(amount_wire_cents) as total_wire
            ')
            ->first();

        return Inertia::render('Admin/Payments/Index', [
            'payments' => $payments,
            'totals'   => $totals,
            'filters'  => $request->only('method', 'from', 'to', 'search'),
            'methods'  => ['cash', 'card', 'mobile', 'wire', 'mixed'],
        ]);
    }

    public function export(Request $request): HttpResponse
    {
        $rows = $this->applyFilters(
            Payment::with([
                'ticket:id,ticket_number,client_id',
                'ticket.client:id,name',
                'processedBy:id,name',
            ])->latest(),
            $request
        )->get();

        $METHOD_FR = [
            'cash'   => 'Espèces',
            'card'   => 'Carte',
            'mobile' => 'Mobile',
            'wire'   => 'Virement',
            'mixed'  => 'Mixte',
        ];

        $csv = "Date,Ticket,Client,Méthode,Montant (MAD),Espèces,Carte,Mobile,Caissier\n";
        foreach ($rows as $p) {
            $csv .= implode(',', [
                $p->created_at->format('Y-m-d H:i'),
                $p->ticket?->ticket_number ?? '',
                '"' . str_replace('"', '""', $p->ticket?->client?->name ?? 'Comptoir') . '"',
                $METHOD_FR[$p->method] ?? $p->method,
                number_format($p->amount_cents / 100, 2),
                number_format($p->amount_cash_cents / 100, 2),
                number_format($p->amount_card_cents / 100, 2),
                number_format($p->amount_mobile_cents / 100, 2),
                '"' . ($p->processedBy?->name ?? '') . '"',
            ]) . "\n";
        }

        $filename = 'paiements_' . now()->format('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
