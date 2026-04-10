<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;

/**
 * AppointmentPolicy — Autorisation fine sur les rendez-vous.
 *
 * Règles :
 *  - Admin : accès total
 *  - Caissier : lecture + conversion en ticket (flux POS)
 *  - Laveur : lecture seule de ses propres RDV
 */
class AppointmentPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasRole([User::ROLE_CAISSIER, User::ROLE_LAVEUR]);
    }

    public function view(User $user, Appointment $appointment): bool
    {
        if ($user->isCaissier()) {
            return true;
        }

        // Laveur : uniquement ses RDV assignés
        return (int) $appointment->assigned_to === $user->id;
    }

    public function create(User $user): bool
    {
        return false; // Admin only
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return false; // Admin only
    }

    public function delete(User $user, Appointment $appointment): bool
    {
        return false; // Admin only
    }

    /**
     * Conversion RDV → Ticket (flux caissier POS).
     */
    public function convertToTicket(User $user, Appointment $appointment): bool
    {
        return $user->isCaissier();
    }
}
