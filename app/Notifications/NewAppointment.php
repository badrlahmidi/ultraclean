<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * NewAppointment — notifie l'admin et le laveur assigné quand un RDV est créé.
 */
class NewAppointment extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Appointment $appointment,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $client = $this->appointment->client;
        $time   = $this->appointment->scheduled_at->format('d/m H:i');

        return [
            'type'           => 'new_appointment',
            'icon'           => '📅',
            'title'          => "Nouveau RDV — {$time}",
            'body'           => trim(($client?->name ?? 'Client') . ' · ' . ($this->appointment->vehicle_plate ?? '')),
            'appointment_id' => $this->appointment->id,
            'client_id'      => $client?->id,
        ];
    }
}
