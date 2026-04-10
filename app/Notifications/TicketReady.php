<?php

namespace App\Notifications;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * TicketReady — notifie les caissiers quand un ticket passe en "completed".
 *
 * Canal : database (panneau de notifications Topbar).
 */
class TicketReady extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Ticket $ticket,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'ticket_ready',
            'icon'          => '✅',
            'title'         => "Ticket prêt — {$this->ticket->ticket_number}",
            'body'          => trim(($this->ticket->vehicle_plate ?? '') . ' · ' . ($this->ticket->vehicle_brand ?? '')),
            'ticket_id'     => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
        ];
    }
}
