<?php

namespace Tests\Unit;

use App\Services\LoyaltyService;
use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires purs pour LoyaltyService (pas de DB, pas d'Eloquent).
 */
class LoyaltyServiceTest extends TestCase
{
    // ─── calculatePointsEarned ───────────────────────────────────────────

    public function test_earn_zero_points_below_threshold(): void
    {
        // Moins de 10 MAD (1 000 centimes) → 0 point
        $this->assertSame(0, LoyaltyService::calculatePointsEarned(999));
        $this->assertSame(0, LoyaltyService::calculatePointsEarned(0));
    }

    public function test_earn_one_point_at_threshold(): void
    {
        // Exactement 10 MAD → 1 point
        $this->assertSame(1, LoyaltyService::calculatePointsEarned(1000));
    }

    public function test_earn_points_floors_partial_amount(): void
    {
        // 59 MAD (5 900 centimes) → 5 points (floor, pas 6)
        $this->assertSame(5, LoyaltyService::calculatePointsEarned(5900));
        // 99.99 MAD (9 999 centimes) → 9 points
        $this->assertSame(9, LoyaltyService::calculatePointsEarned(9999));
    }

    public function test_earn_ten_points_for_hundred_mad(): void
    {
        // 100 MAD (10 000 centimes) → 10 points
        $this->assertSame(10, LoyaltyService::calculatePointsEarned(10000));
    }

    // ─── calculateTier ──────────────────────────────────────────────────

    public function test_tier_standard_below_10_visits(): void
    {
        $this->assertSame('standard', LoyaltyService::calculateTier(0));
        $this->assertSame('standard', LoyaltyService::calculateTier(9));
    }

    public function test_tier_silver_at_10_visits(): void
    {
        $this->assertSame('silver', LoyaltyService::calculateTier(10));
        $this->assertSame('silver', LoyaltyService::calculateTier(24));
    }

    public function test_tier_gold_at_25_visits(): void
    {
        $this->assertSame('gold', LoyaltyService::calculateTier(25));
        $this->assertSame('gold', LoyaltyService::calculateTier(49));
    }

    public function test_tier_platinum_at_50_visits(): void
    {
        $this->assertSame('platinum', LoyaltyService::calculateTier(50));
        $this->assertSame('platinum', LoyaltyService::calculateTier(200));
    }

    // ─── pointsToDiscount ───────────────────────────────────────────────

    public function test_points_to_discount_conversion(): void
    {
        // 1 point = 1 MAD (100 centimes)
        $this->assertSame(100, LoyaltyService::pointsToDiscount(1));
        $this->assertSame(500, LoyaltyService::pointsToDiscount(5));
        $this->assertSame(0,   LoyaltyService::pointsToDiscount(0));
    }

    // ─── discountToPoints ───────────────────────────────────────────────

    public function test_discount_to_points_conversion(): void
    {
        // 100 centimes (1 MAD) = 1 point
        $this->assertSame(1, LoyaltyService::discountToPoints(100));
        // 150 centimes → ceil = 2 points
        $this->assertSame(2, LoyaltyService::discountToPoints(150));
        $this->assertSame(5, LoyaltyService::discountToPoints(500));
    }

    // ─── visitsToNextTier ───────────────────────────────────────────────

    public function test_visits_to_next_tier_from_standard(): void
    {
        // 0 visites → besoin de 10 pour Silver
        $this->assertSame(10, LoyaltyService::visitsToNextTier(0));
        // 7 visites → besoin de 3 de plus
        $this->assertSame(3, LoyaltyService::visitsToNextTier(7));
    }

    public function test_visits_to_next_tier_from_silver(): void
    {
        // 10 visites (Silver) → besoin de 15 de plus pour Gold (25 total)
        $this->assertSame(15, LoyaltyService::visitsToNextTier(10));
    }

    public function test_visits_to_next_tier_from_gold(): void
    {
        // 25 visites (Gold) → besoin de 25 de plus pour Platinum (50 total)
        $this->assertSame(25, LoyaltyService::visitsToNextTier(25));
        $this->assertSame(1, LoyaltyService::visitsToNextTier(49));
    }

    public function test_visits_to_next_tier_returns_null_at_platinum(): void
    {
        // 50+ visites (Platinum) → palier max, null
        $this->assertNull(LoyaltyService::visitsToNextTier(50));
        $this->assertNull(LoyaltyService::visitsToNextTier(100));
    }

    // ─── TIERS constant coherence ───────────────────────────────────────

    public function test_tiers_constant_has_all_four_tiers(): void
    {
        $this->assertArrayHasKey('standard', LoyaltyService::TIERS);
        $this->assertArrayHasKey('silver',   LoyaltyService::TIERS);
        $this->assertArrayHasKey('gold',     LoyaltyService::TIERS);
        $this->assertArrayHasKey('platinum', LoyaltyService::TIERS);
    }

    public function test_platinum_has_null_next(): void
    {
        $this->assertNull(LoyaltyService::TIERS['platinum']['next']);
    }
}
