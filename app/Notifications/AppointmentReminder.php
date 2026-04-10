<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * AppointmentReminder — envoyée ~1h avant le rendez-vous planifié.
 *
 * Canaux :
 *  - database : panneau de notifications dans la Topbar
 *  - mail     : seulement si le client a un email (via le créateur)
 */
class AppointmentReminder extends Notification implements ShouldQueue
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
        $time   = $this->appointment->scheduled_at->format('H:i');

        return [
            'type'           => 'appointment_reminder',
            'icon'           => '📅',
            'title'          => "RDV dans ~1h — {$time}",
            'body'           => trim(($client?->name ?? 'Client inconnu') . ' · ' . ($this->appointment->vehicle_plate ?? '')),
            'appointment_id' => $this->appointment->id,
            'client_id'      => $client?->id,
            'scheduled_at'   => $this->appointment->scheduled_at->toIso8601String(),
        ];
    }
}
