<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

/**
 * TicketPolicy — Autorisation fine sur les tickets.
 *
 * Règles métier :
 *  - Admin : accès total
 *  - Caissier : peut voir/créer/modifier les tickets de son shift + tous les tickets visibles
 *  - Laveur : ne peut voir/modifier que les tickets qui lui sont assignés (lead ou assistant)
 */
class TicketPolicy
{
    /**
     * Avant toute vérification : les admins ont accès total.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return null; // Fall through to specific checks
    }

    // ── Lecture ───────────────────────────────────────────────────────────

    public function viewAny(User $user): bool
    {
        return $user->hasRole([User::ROLE_CAISSIER, User::ROLE_LAVEUR]);
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->isCaissier()) {
            return true; // Caissiers can view all tickets (needed for POS)
        }

        // Laveur: only their own tickets (assigned_to OR assistant via pivot)
        return $this->isAssignedWasher($user, $ticket);
    }

    // ── Création ─────────────────────────────────────────────────────────

    public function create(User $user): bool
    {
        return $user->isCaissier(); // Only caissiers create tickets (via POS)
    }

    // ── Modification ─────────────────────────────────────────────────────

    public function update(User $user, Ticket $ticket): bool
    {
        if ($user->isCaissier()) {
            // Caissiers may only update tickets belonging to their currently open shift.
            $activeShift = $user->activeShift;
            return $activeShift !== null && $ticket->shift_id === $activeShift->id;
        }

        return false;
    }

    /**
     * Transition de statut — les laveurs ne peuvent que démarrer/compléter leurs propres tickets.
     */
    public function updateStatus(User $user, Ticket $ticket): bool
    {
        if ($user->isCaissier()) {
            return true;
        }

        if ($user->isLaveur()) {
            return $this->isAssignedWasher($user, $ticket);
        }

        return false;
    }

    // ── Paiement ─────────────────────────────────────────────────────────

    public function pay(User $user, Ticket $ticket): bool
    {
        return $user->isCaissier();
    }    // ── Suppression ──────────────────────────────────────────────────────

    public function delete(User $user, Ticket $ticket): bool
    {
        // Only admins can delete tickets (handled by before()).
        // Caissiers cannot delete — soft-delete is an admin-only action.
        return false;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Vérifie si le laveur est assigné au ticket (lead via assigned_to OU assistant via pivot).
     */
    private function isAssignedWasher(User $user, Ticket $ticket): bool
    {
        if ((int) $ticket->assigned_to === $user->id) {
            return true;
        }

        // Check ticket_washers pivot table
        return $ticket->washers()->where('user_id', $user->id)->exists();
    }
}
