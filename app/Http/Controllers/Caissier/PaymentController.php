<?php

namespace App\Http\Controllers\Caissier;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Ticket;
use App\Services\LoyaltyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function store(Request $request, Ticket $ticket): RedirectResponse
    {
        abort_if(
            ! $ticket->canTransitionTo(Ticket::STATUS_PAID),
            422,
            "Ce ticket ne peut pas être encaissé (statut actuel : {$ticket->status})."
        );

        $request->validate([
            'method'              => ['required', 'in:cash,card,mobile,mixed'],
            'amount_cash_cents'   => ['required_if:method,cash,mixed',   'integer', 'min:0'],
            'amount_card_cents'   => ['required_if:method,card,mixed',   'integer', 'min:0'],
            'amount_mobile_cents' => ['required_if:method,mobile,mixed', 'integer', 'min:0'],
            'note'                => ['nullable', 'string', 'max:255'],
        ]);

        $cash   = (int) ($request->amount_cash_cents   ?? 0);
        $card   = (int) ($request->amount_card_cents   ?? 0);
        $mobile = (int) ($request->amount_mobile_cents ?? 0);

        if ($request->method === 'cash')   { $cash   = $ticket->total_cents; $card = $mobile = 0; }
        if ($request->method === 'card')   { $card   = $ticket->total_cents; $cash = $mobile = 0; }
        if ($request->method === 'mobile') { $mobile = $ticket->total_cents; $cash = $card   = 0; }

        $totalPaid = $cash + $card + $mobile;

        if ($totalPaid < $ticket->total_cents) {
            return back()->withErrors([
                'amount' => sprintf(
                    'Montant insuffisant : %.2f MAD encaissé pour %.2f MAD dû.',
                    $totalPaid / 100,
                    $ticket->total_cents / 100
                ),
            ]);
        }

        $changeCents = $totalPaid - $ticket->total_cents;

        $payment = Payment::create([
            'ticket_id'           => $ticket->id,
            'processed_by'        => auth()->id(),
            'method'              => $request->method,
            'amount_cents'        => $ticket->total_cents,
            'amount_cash_cents'   => $cash,
            'amount_card_cents'   => $card,
            'amount_mobile_cents' => $mobile,
            'change_given_cents'  => $changeCents,
            'reference'           => $request->note,
        ]);

        $ticket->transitionTo(Ticket::STATUS_PAID, [
            'paid_by' => auth()->id(),
        ]);

        // ── Consommation automatique du stock ──────────────────────────────
        try {
            $ticket->load('services.service.stockProducts');
            foreach ($ticket->services as $ticketService) {
                foreach ($ticketService->service->stockProducts as $product) {
                    $qtyToConsume = $product->pivot->quantity_per_use * ($ticketService->quantity ?? 1);
                    $product->consumeStock(
                        $qtyToConsume,
                        $ticket->ticket_number,
                        $ticket->id,
                        auth()->id()
                    );
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('Stock consumption failed for ticket ' . $ticket->ticket_number . ': ' . $e->getMessage());
        }

        // ── Fidélité : créditer les points ──────────────────────────────────
        $pointsEarned = 0;
        if ($ticket->client_id) {
            try {
                $ticket->refresh();
                $client = Client::find($ticket->client_id);
                if ($client) {
                    $pointsEarned = LoyaltyService::awardPoints($client, $ticket, auth()->id());
                }
            } catch (\Throwable $e) {
                \Log::warning('Loyalty award failed for ticket ' . $ticket->ticket_number . ': ' . $e->getMessage());
            }
        }

        ActivityLog::log('ticket.paid', $ticket, [
            'ticket_number'      => $ticket->ticket_number,
            'method'             => $request->method,
            'amount_cents'       => $ticket->total_cents,
            'change_given_cents' => $changeCents,
            'loyalty_points'     => $pointsEarned,
        ]);

        $successMsg = sprintf('Paiement enregistré — Rendu monnaie : %.2f MAD', $changeCents / 100);
        if ($pointsEarned > 0) {
            $successMsg .= sprintf(' · +%d points fidélité', $pointsEarned);
        }

        return redirect()
            ->route('caissier.tickets.show', $ticket->id)
            ->with('success', $successMsg);
    }
}
