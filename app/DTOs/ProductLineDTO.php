<?php

namespace App\DTOs;

/**
 * DTO for a product line in a ticket.
 */
final readonly class ProductLineDTO
{
    public function __construct(
        public int   $sellableProductId,
        public int   $unitPriceCents,
        public float $quantity = 1,
        public int   $discountCents = 0,
        public bool  $isFree = false,
    ) {}

    /**
     * Build from array (from request validated data).
     */
    public static function fromArray(array $data): self
    {
        return new self(
            sellableProductId: (int) $data['sellable_product_id'],
            unitPriceCents:    (int) ($data['unit_price_cents'] ?? 0),
            quantity:          (float) ($data['quantity'] ?? 1),
            discountCents:     (int) ($data['discount_cents'] ?? 0),
            isFree:            (bool) ($data['is_free'] ?? false),
        );
    }
}
