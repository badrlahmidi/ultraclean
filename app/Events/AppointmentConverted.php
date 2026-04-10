<?php

namespace App\Events;

use App\Models\Appointment;
use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentConverted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Appointment $appointment;
    public Ticket $ticket;

    public function __construct(Appointment $appointment, Ticket $ticket)
    {
        $this->appointment = $appointment;
        $this->ticket = $ticket;
    }
}
