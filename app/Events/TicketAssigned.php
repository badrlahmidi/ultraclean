<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketAssigned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Ticket $ticket) {}

    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('admin')];

        if ($this->ticket->assigned_to) {
            $channels[] = new PrivateChannel("user.{$this->ticket->assigned_to}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'ticket.assigned';
    }

    public function broadcastWith(): array
    {
        return [
            'id'            => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'vehicle_plate' => $this->ticket->vehicle_plate,
            'vehicle_brand' => $this->ticket->vehicle_brand,
            'assigned_to'   => $this->ticket->assigned_to,
            'status'        => $this->ticket->status,
            'created_at'    => $this->ticket->created_at?->toISOString(),
        ];
    }
}
