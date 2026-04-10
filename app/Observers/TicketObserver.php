<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\TicketReady;
use Illuminate\Support\Facades\Notification;

class TicketObserver
{
    /**
     * Détecte les annulations tardives (in_progress ou completed → cancelled)
     * et déclenche la consommation partielle de stock estimée.
     *
     * Détecte aussi les tickets passés en "completed" → notifie les caissiers.
     */
    public function updated(Ticket $ticket): void
    {
        if (! $ticket->wasChanged('status')) {
            return;
        }

        // ── Ticket terminé → notifier les caissiers pour le paiement ──
        if ($ticket->status === Ticket::STATUS_COMPLETED) {
            $this->notifyCaissiersTicketReady($ticket);
        }

        // ── Annulation tardive → consommation partielle du stock ──
        if (
            $ticket->status === Ticket::STATUS_CANCELLED &&
            in_array($ticket->getOriginal('status'), [
                Ticket::STATUS_IN_PROGRESS,
                Ticket::STATUS_PAUSED,
                Ticket::STATUS_BLOCKED,
                Ticket::STATUS_COMPLETED,
            ])
        ) {
            $this->handleLateCancel($ticket);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function handleLateCancel(Ticket $ticket): void
    {
        $previousStatus = $ticket->getOriginal('status');

        $consumptionRatio = $previousStatus === Ticket::STATUS_COMPLETED
            ? 1.0
            : $this->estimateProgress($ticket);

        // Charger les services avec leurs produits en stock associés
        $ticket->loadMissing('services.service.stockProducts');        foreach ($ticket->services as $ticketService) {
            /** @var \App\Models\TicketService $ticketService */
            /** @var \App\Models\Service|null $service */
            $service = $ticketService->service;

            if (! $service) {
                continue;
            }

            foreach ($service->stockProducts as $product) {
                /** @var \App\Models\StockProduct $product */
                $fullQty   = (float) ($product->pivot->quantity_per_use ?? 0) * (int) $ticketService->quantity;
                $actualQty = round($fullQty * $consumptionRatio, 3);

                if ($actualQty > 0) {
                    $product->consumeStock(
                        $actualQty,
                        "Annulation tardive {$ticket->ticket_number} (ratio " . number_format($consumptionRatio, 2) . ')',
                        $ticket->id,
                        auth()->id()
                    );
                }
            }
        }

        ActivityLog::log('ticket.cancelled_late', $ticket, [
            'previous_status'   => $previousStatus,
            'consumption_ratio' => $consumptionRatio,
            'reason'            => $ticket->cancelled_reason,
        ]);
    }    /**
     * Estime le ratio de consommation d'un ticket en cours d'annulation.
     * Basé sur le temps réel écoulé (hors pauses) vs la durée estimée.
     *
     * @return float entre 0.0 et 1.0
     */
    private function estimateProgress(Ticket $ticket): float
    {
        if (! $ticket->started_at || ! $ticket->estimated_duration) {
            return 0.5; // fallback conservateur à 50 %
        }

        $elapsedMinutes = $ticket->effectiveWorkDurationSeconds() / 60;

        return min(1.0, $elapsedMinutes / $ticket->estimated_duration);
    }

    /**
     * Notifie les caissiers (+ admins) qu'un ticket est prêt au paiement.
     */
    private function notifyCaissiersTicketReady(Ticket $ticket): void
    {
        $recipients = User::whereIn('role', ['admin', 'caissier'])
            ->where('is_active', true)
            ->get();

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new TicketReady($ticket));
        }
    }
}
