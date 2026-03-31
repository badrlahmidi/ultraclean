<?php

namespace App\Services;

use App\Models\Client;
use App\Models\LoyaltyTransaction;
use App\Models\Ticket;

class LoyaltyService
{
    // 1 point gagné par tranche de 10 MAD (1 000 centimes)
    const CENTS_PER_POINT_EARNED   = 1000;
    // 1 point = 1 MAD de réduction (100 centimes)
    const CENTS_PER_POINT_REDEEMED = 100;

    const TIERS = [
        'standard' => ['min_visits' => 0,  'label' => 'Standard', 'next' => 10],
        'silver'   => ['min_visits' => 10, 'label' => 'Silver',   'next' => 25],
        'gold'     => ['min_visits' => 25, 'label' => 'Gold',     'next' => 50],
        'platinum' => ['min_visits' => 50, 'label' => 'Platinum', 'next' => null],
    ];

    // ─── Calculs purs ────────────────────────────────────────────────────────

    public static function calculatePointsEarned(int $totalCents): int
    {
        return (int) floor($totalCents / self::CENTS_PER_POINT_EARNED);
    }

    public static function calculateTier(int $totalVisits): string
    {
        if ($totalVisits >= 50) return 'platinum';
        if ($totalVisits >= 25) return 'gold';
        if ($totalVisits >= 10) return 'silver';
        return 'standard';
    }

    public static function pointsToDiscount(int $points): int
    {
        return $points * self::CENTS_PER_POINT_REDEEMED;
    }

    public static function discountToPoints(int $discountCents): int
    {
        return (int) ceil($discountCents / self::CENTS_PER_POINT_REDEEMED);
    }

    /** Visites manquantes avant le prochain palier (null = palier max). */
    public static function visitsToNextTier(int $totalVisits): ?int
    {
        if ($totalVisits >= 50) return null;
        if ($totalVisits >= 25) return 50 - $totalVisits;
        if ($totalVisits >= 10) return 25 - $totalVisits;
        return 10 - $totalVisits;
    }

    // ─── Effets de bord ──────────────────────────────────────────────────────

    /**
     * Crédite les points d'un client après le paiement d'un ticket.
     * Met à jour total_visits, total_spent_cents, last_visit_date et le palier.
     */
    public static function awardPoints(Client $client, Ticket $ticket, ?int $operatorId = null): int
    {
        $points = self::calculatePointsEarned($ticket->total_cents);

        // Mise à jour des stats client
        $client->increment('total_visits');
        $client->increment('total_spent_cents', $ticket->total_cents);
        $client->update(['last_visit_date' => $ticket->paid_at?->toDateString() ?? now()->toDateString()]);

        if ($points > 0) {
            $newBalance = $client->loyalty_points + $points;
            $client->increment('loyalty_points', $points);

            LoyaltyTransaction::create([
                'client_id'     => $client->id,
                'ticket_id'     => $ticket->id,
                'created_by'    => $operatorId,
                'type'          => 'earned',
                'points'        => $points,
                'balance_after' => $newBalance,
                'note'          => "Ticket {$ticket->ticket_number}",
            ]);

            $ticket->update(['loyalty_points_earned' => $points]);
        }

        // Mise à niveau du palier
        $freshVisits = $client->fresh()->total_visits;
        $newTier = self::calculateTier($freshVisits);
        if ($newTier !== $client->loyalty_tier) {
            $client->update(['loyalty_tier' => $newTier]);
        }

        return $points;
    }

    /**
     * Utilise des points fidélité comme réduction sur un ticket.
     * Retourne le montant de réduction en centimes.
     */
    public static function redeemPoints(Client $client, Ticket $ticket, int $points, ?int $operatorId = null): int
    {
        $points = min($points, $client->loyalty_points);
        if ($points <= 0) return 0;

        $discountCents = self::pointsToDiscount($points);
        $newBalance = $client->loyalty_points - $points;

        $client->decrement('loyalty_points', $points);

        LoyaltyTransaction::create([
            'client_id'     => $client->id,
            'ticket_id'     => $ticket->id,
            'created_by'    => $operatorId,
            'type'          => 'redeemed',
            'points'        => -$points,
            'balance_after' => $newBalance,
            'note'          => "Remise sur ticket {$ticket->ticket_number}",
        ]);

        $ticket->update(['loyalty_points_used' => $points]);

        return $discountCents;
    }

    /**
     * Ajustement manuel par un admin (+ ou -).
     */
    public static function adjustPoints(Client $client, int $delta, string $note, ?int $operatorId = null): void
    {
        $newBalance = max(0, $client->loyalty_points + $delta);
        $client->update(['loyalty_points' => $newBalance]);

        LoyaltyTransaction::create([
            'client_id'     => $client->id,
            'created_by'    => $operatorId,
            'type'          => 'adjusted',
            'points'        => $delta,
            'balance_after' => $newBalance,
            'note'          => $note,
        ]);
    }
}
