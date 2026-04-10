<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\User;
use App\Notifications\AppointmentReminder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

/**
 * SendAppointmentReminders
 *
 * Exécuté toutes les 15 minutes.
 * Envoie une notification pour chaque RDV planifié dans les 45–75 min à venir
 * qui n'a pas déjà reçu un rappel (on vérifie via le cache).
 */
class SendAppointmentReminders implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $from = now()->addMinutes(45);
        $to   = now()->addMinutes(75);

        $appointments = Appointment::query()
            ->whereIn('status', [Appointment::STATUS_PENDING, Appointment::STATUS_CONFIRMED])
            ->whereBetween('scheduled_at', [$from, $to])
            ->with('client')
            ->get();

        if ($appointments->isEmpty()) {
            return;
        }

        // Admins + caissiers qui recevront le rappel
        $recipients = User::whereIn('role', ['admin', 'caissier'])
            ->where('is_active', true)
            ->get();

        foreach ($appointments as $appointment) {
            $cacheKey = "appointment_reminder_{$appointment->id}";

            if (cache()->has($cacheKey)) {
                continue; // Rappel déjà envoyé
            }

            // Notifier admins + caissiers
            Notification::send($recipients, new AppointmentReminder($appointment));

            // Notifier aussi le laveur assigné s'il existe
            if ($appointment->assigned_to) {
                $washer = User::find($appointment->assigned_to);
                if ($washer) {
                    $washer->notify(new AppointmentReminder($appointment));
                }
            }

            // Marquer comme envoyé (TTL = 2h, largement suffisant)
            cache()->put($cacheKey, true, now()->addHours(2));
        }
    }
}
