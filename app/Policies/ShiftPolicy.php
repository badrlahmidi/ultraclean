<?php

namespace App\Policies;

use App\Models\Shift;
use App\Models\User;

/**
 * ShiftPolicy — Autorisation fine sur les shifts (caisses).
 *
 * Règles :
 *  - Admin : accès total
 *  - Caissier : ne peut ouvrir/fermer que son propre shift
 *  - Laveur : aucun accès
 */
class ShiftPolicy
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
        return $user->isCaissier();
    }

    public function view(User $user, Shift $shift): bool
    {
        if ($user->isCaissier()) {
            return (int) $shift->user_id === $user->id;
        }
        return false;
    }

    public function create(User $user): bool
    {
        return $user->isCaissier();
    }

    /**
     * Seul le propriétaire du shift peut le fermer.
     */
    public function close(User $user, Shift $shift): bool
    {
        if ($user->isCaissier()) {
            return (int) $shift->user_id === $user->id;
        }
        return false;
    }

    public function delete(User $user, Shift $shift): bool
    {
        return false; // Admin only
    }
}
