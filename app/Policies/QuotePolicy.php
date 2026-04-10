<?php

namespace App\Policies;

use App\Models\Quote;
use App\Models\User;

/**
 * QuotePolicy — Autorisation fine sur les devis B2B.
 *
 * Règles :
 *  - Admin : accès total
 *  - Caissier/Laveur : aucun accès (module B2B = admin uniquement)
 */
class QuotePolicy
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
        return false;
    }

    public function view(User $user, Quote $quote): bool
    {
        return false;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Quote $quote): bool
    {
        return false;
    }

    public function delete(User $user, Quote $quote): bool
    {
        return false;
    }
}
