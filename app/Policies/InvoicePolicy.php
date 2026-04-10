<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

/**
 * InvoicePolicy — Autorisation fine sur les factures B2B.
 *
 * Règles :
 *  - Admin : accès total (CRUD, transitions, PDF)
 *  - Caissier/Laveur : aucun accès (module B2B = admin uniquement)
 */
class InvoicePolicy
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

    public function view(User $user, Invoice $invoice): bool
    {
        return false;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Invoice $invoice): bool
    {
        return false;
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        return false;
    }

    public function pay(User $user, Invoice $invoice): bool
    {
        return false;
    }
}
