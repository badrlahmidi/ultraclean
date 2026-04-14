<?php

namespace App\Http\Controllers\Caissier;

use App\Actions\ProcessPaymentAction;
use App\DTOs\ProcessPaymentDTO;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function store(Request $request, Ticket $ticket): RedirectResponse
    {        $this->authorize('pay', $ticket);

        // Allow payment from any status that can transition to STATUS_PAID or STATUS_PARTIAL.
        // - Regular flow: completed / payment_pending → paid
        // - Pre-payment:  pending / in_progress       → paid (is_prepaid) or partial (advance deposit)
        // - Balance collection: partial               → paid
        $payable = $ticket->canTransitionTo(Ticket::STATUS_PAID)
                || $ticket->canTransitionTo(Ticket::STATUS_PARTIAL);

        abort_if(
            ! $payable,
            422,
            "Ce ticket ne peut pas être encaissé (statut actuel : {$ticket->status})."
        );

        $request->validate([
            'method'              => ['required', 'in:cash,card,wire,mobile,mixed,advance,credit'],
            'amount_cash_cents'   => ['nullable', 'integer', 'min:0'],
            'amount_card_cents'   => ['nullable', 'integer', 'min:0'],
            'amount_mobile_cents' => ['nullable', 'integer', 'min:0'],
            'amount_wire_cents'   => ['nullable', 'integer', 'min:0'],
            'note'                => ['nullable', 'string', 'max:255'],
        ]);

        $dto = ProcessPaymentDTO::fromRequest($request);

        try {
            $result = app(ProcessPaymentAction::class)->execute($ticket, $dto, auth()->id());
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e; // Let Laravel handle validation errors (back with errors)
        } catch (\Throwable $e) {
            Log::error('payment.failed', [
                'ticket_id' => $ticket->id,
                'ticket'    => $ticket->ticket_number,
                'user_id'   => auth()->id(),
                'method'    => $request->input('method'),
                'error'     => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
            return back()->withErrors(['payment' => 'Erreur lors du paiement. Veuillez réessayer.']);
        }

        return redirect()
            ->route('caissier.tickets.show', $ticket->ulid)
            ->with('success', $result['message']);
    }
}
