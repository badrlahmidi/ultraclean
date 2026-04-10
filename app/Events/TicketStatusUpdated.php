<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Ticket $ticket,
        public readonly string $oldStatus,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('admin'),
            new PrivateChannel('caissier'),
            new PrivateChannel('laveur'),  // tous les laveurs voient la file
        ];

        // Notifier aussi le laveur assigné sur son canal personnel
        if ($this->ticket->assigned_to) {
            $channels[] = new PrivateChannel("user.{$this->ticket->assigned_to}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'ticket.status_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id'                  => $this->ticket->id,
            'ticket_number'       => $this->ticket->ticket_number,
            'vehicle_plate'       => $this->ticket->vehicle_plate,
            'vehicle_brand'       => $this->ticket->vehicle_brand,
            'old_status'          => $this->oldStatus,
            'new_status'          => $this->ticket->status,
            'assigned_to'         => $this->ticket->assigned_to,
            'due_at'              => $this->ticket->due_at?->toISOString(),
            'ticket_template_id'  => $this->ticket->ticket_template_id,
            'updated_at'          => $this->ticket->updated_at?->toISOString(),
        ];
    }
}
