<?php

namespace App\Jobs;

use App\Models\ActivityLog;
use App\Models\Ticket;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Rollback automatique des tickets en statut `payment_pending` depuis plus de 15 minutes.
 *
 * Scénario : la confirmation Wave/Orange Money n'est jamais arrivée (timeout réseau,
 * client ayant annulé la transaction, etc.).
 *
 * Le ticket revient à `completed` → le caissier peut relancer un autre mode de paiement.
 *
 * Schedule : toutes les 5 minutes (voir bootstrap/app.php).
 */
class ExpirePaymentPendingTickets implements ShouldQueue
{
    use Queueable;

    /** Nombre maximal de minutes d'attente avant rollback. */
    private const TIMEOUT_MINUTES = 15;

    public function handle(): void
    {
        Ticket::where('status', Ticket::STATUS_PAYMENT_PENDING)
              ->where('payment_initiated_at', '<', now()->subMinutes(self::TIMEOUT_MINUTES))
              ->each(function (Ticket $ticket): void {
                  // Rollback propre via la State Machine — completed = "relancer un paiement"
                  $ticket->transitionTo(Ticket::STATUS_COMPLETED);

                  ActivityLog::log('payment.timeout', $ticket, [
                      'provider'       => $ticket->payment_provider,
                      'reference'      => $ticket->payment_reference,
                      'initiated_at'   => $ticket->payment_initiated_at?->toIso8601String(),
                      'timeout_after'  => self::TIMEOUT_MINUTES . ' min',
                  ]);
              });
    }
}
