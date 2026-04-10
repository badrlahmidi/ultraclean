<?php

namespace App\DTOs;

/**
 * Represents a single service line within a ticket creation request.
 */
final readonly class ServiceLineDTO
{
    public function __construct(
        public int  $serviceId,
        public int  $unitPriceCents,
        public int  $quantity = 1,
        public int  $discountCents = 0,
        public ?int $priceVariantId = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            serviceId:      (int) $data['service_id'],
            unitPriceCents: (int) $data['unit_price_cents'],
            quantity:       (int) ($data['quantity'] ?? 1),
            discountCents:  (int) ($data['discount_cents'] ?? 0),
            priceVariantId: isset($data['price_variant_id']) ? (int) $data['price_variant_id'] : null,
        );
    }
}
