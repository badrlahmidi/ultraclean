<?php

namespace Tests\Unit;

use App\Models\Payment;
use Tests\TestCase;

/**
 * Unit tests for Payment::validateAmounts() — BUG-1 regression.
 *
 * BUG-1: wire was excluded from the mixed sum before Sprint 5 fix.
 * These tests ensure all 4 channels are included.
 */
class PaymentValidateAmountsTest extends TestCase
{
    // ── Non-mixed methods always return true ─────────────────────────────

    public function test_cash_payment_is_always_valid(): void
    {
        $payment = new Payment(['method' => 'cash', 'amount_cents' => 15000,
            'amount_cash_cents' => 15000, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_card_payment_is_always_valid(): void
    {
        $payment = new Payment(['method' => 'card', 'amount_cents' => 8000,
            'amount_cash_cents' => 0, 'amount_card_cents' => 8000,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_wire_payment_is_always_valid(): void
    {
        $payment = new Payment(['method' => 'wire', 'amount_cents' => 50000,
            'amount_cash_cents' => 0, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 50000]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_mobile_payment_is_always_valid(): void
    {
        $payment = new Payment(['method' => 'mobile', 'amount_cents' => 5000,
            'amount_cash_cents' => 0, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 5000, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_advance_payment_is_always_valid(): void
    {
        $payment = new Payment(['method' => 'advance', 'amount_cents' => 8000,
            'amount_cash_cents' => 8000, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_credit_payment_is_always_valid(): void
    {
        $payment = new Payment(['method' => 'credit', 'amount_cents' => 0,
            'amount_cash_cents' => 0, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    // ── Mixed: valid combinations ────────────────────────────────────────

    public function test_mixed_cash_plus_card_valid(): void
    {
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 25000,
            'amount_cash_cents' => 10000, 'amount_card_cents' => 15000,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    /** BUG-1 regression: wire was missing from sum before Sprint 5 fix. */
    public function test_mixed_cash_plus_wire_valid_bug1_regression(): void
    {
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 50000,
            'amount_cash_cents' => 20000, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 30000]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_mixed_three_channels_valid(): void
    {
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 30000,
            'amount_cash_cents' => 10000, 'amount_card_cents' => 10000,
            'amount_mobile_cents' => 10000, 'amount_wire_cents' => 0]);

        $this->assertTrue($payment->validateAmounts());
    }

    public function test_mixed_all_four_channels_valid(): void
    {
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 40000,
            'amount_cash_cents' => 10000, 'amount_card_cents' => 10000,
            'amount_mobile_cents' => 10000, 'amount_wire_cents' => 10000]);

        $this->assertTrue($payment->validateAmounts());
    }

    // ── Mixed: invalid (sum mismatch) ────────────────────────────────────

    public function test_mixed_sum_less_than_total_invalid(): void
    {
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 30000,
            'amount_cash_cents' => 5000, 'amount_card_cents' => 5000,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertFalse($payment->validateAmounts());
    }

    public function test_mixed_sum_more_than_total_invalid(): void
    {
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 20000,
            'amount_cash_cents' => 15000, 'amount_card_cents' => 10000,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 0]);

        $this->assertFalse($payment->validateAmounts());
    }

    public function test_mixed_wire_only_without_bug1_fix_would_fail(): void
    {
        // Before BUG-1 fix: wire was excluded → 0 === 30000 = false
        // After BUG-1 fix:  wire is included → 30000 === 30000 = true
        $payment = new Payment(['method' => 'mixed', 'amount_cents' => 30000,
            'amount_cash_cents' => 0, 'amount_card_cents' => 0,
            'amount_mobile_cents' => 0, 'amount_wire_cents' => 30000]);

        $this->assertTrue($payment->validateAmounts()); // Wire IS included now
    }
}
