<?php

namespace App\DTOs;

use Illuminate\Http\Request;

/**
 * Data Transfer Object for payment processing.
 *
 * Encapsulates the validated payment data into a typed structure
 * passed to ProcessPaymentAction.
 */
final readonly class ProcessPaymentDTO
{
    public function __construct(
        public string  $method,
        public int     $amountCashCents = 0,
        public int     $amountCardCents = 0,
        public int     $amountMobileCents = 0,
        public int     $amountWireCents = 0,
        public int     $loyaltyPointsToRedeem = 0,
        public ?string $note = null,
    ) {}    /**
     * Build from a validated Request (after $request->validate() in controller).
     */
    public static function fromRequest(Request $request): self
    {
        return new self(
            method:               $request->input('method'),
            amountCashCents:      (int) ($request->input('amount_cash_cents', 0)),
            amountCardCents:      (int) ($request->input('amount_card_cents', 0)),
            amountMobileCents:    (int) ($request->input('amount_mobile_cents', 0)),
            amountWireCents:      (int) ($request->input('amount_wire_cents', 0)),
            loyaltyPointsToRedeem:(int) ($request->input('loyalty_points_to_redeem', 0)),
            note:                 $request->input('note'),
        );
    }
}
