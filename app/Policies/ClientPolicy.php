<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;

/**
 * ClientPolicy — Autorisation fine sur les clients.
 *
 * Règles :
 *  - Admin : accès total (via before())
 *  - Caissier : CRUD complet (nécessaire pour le POS)
 *  - Laveur : lecture seule (voir le nom du client sur un ticket assigné)
 */
class ClientPolicy
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

    public function view(User $user, Client $client): bool
    {
        return $user->hasRole([User::ROLE_CAISSIER, User::ROLE_LAVEUR]);
    }

    public function create(User $user): bool
    {
        return $user->isCaissier();
    }

    public function update(User $user, Client $client): bool
    {
        return $user->isCaissier();
    }

    public function delete(User $user, Client $client): bool
    {
        return false; // Admin only
    }
}
