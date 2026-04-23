<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\SaleOrder;
use App\Models\SaleOrderLine;
use App\Models\SellableProduct;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * SaleOrderService — Logique métier pour les ventes express (POS).
 *
 * Responsabilités :
 *   - Calcul des totaux (sous-total, remise, total)
 *   - Création atomique SaleOrder + lignes + décrémentation stock
 *   - Génération du numéro de vente (via SaleOrder::generateSaleNumber)
 *   - Annulation avec restitution de stock
 */
class SaleOrderService
{
    /**
     * Create a new paid sale order.
     *
     * @param array{
     *   client_id: int|null,
     *   products: array<array{sellable_product_id: int, unit_price_cents: int, quantity: float, discount_cents: int, is_free: bool}>,
     *   discount_type: string|null,
     *   discount_value: float|null,
     *   payment_method: string,
     *   payment_reference: string|null,
     *   notes: string|null,
     * } $data
     */
    public function create(array $data, User $creator): SaleOrder
    {
        return DB::transaction(function () use ($data, $creator) {
            // ── Shift courant ─────────────────────────────────────────────
            $shift = Shift::where('user_id', $creator->id)
                ->whereNull('closed_at')
                ->first();

            // ── Calcul des totaux ─────────────────────────────────────────
            $lines    = $data['products'] ?? [];
            $subtotal = $this->calcSubtotal($lines);
            [$discountCents, $discountType, $discountValue] = $this->calcDiscount(
                $subtotal,
                $data['discount_type'] ?? null,
                $data['discount_value'] ?? null,
            );
            $total = max(0, $subtotal - $discountCents);

            // ── Créer l'en-tête ───────────────────────────────────────────
            $sale = SaleOrder::create([
                'client_id'         => $data['client_id'] ?? null,
                'shift_id'          => $shift?->id,
                'created_by'        => $creator->id,
                'subtotal_cents'    => $subtotal,
                'discount_type'     => $discountType,
                'discount_value'    => $discountValue,
                'discount_cents'    => $discountCents,
                'total_cents'       => $total,
                'payment_method'    => $data['payment_method'],
                'payment_reference' => $data['payment_reference'] ?? null,
                'status'            => SaleOrder::STATUS_PAID,
                'notes'             => $data['notes'] ?? null,
                'paid_at'           => now(),
            ]);

            // ── Créer les lignes + décrémenter le stock ───────────────────
            foreach ($lines as $line) {
                $product = SellableProduct::findOrFail((int) $line['sellable_product_id']);

                $qty          = (float) $line['quantity'];
                $isFree       = (bool) ($line['is_free'] ?? false);
                $unitPrice    = (int) $line['unit_price_cents'];
                $discountLine = (int) ($line['discount_cents'] ?? 0);

                SaleOrderLine::create([
                    'sale_order_id'        => $sale->id,
                    'sellable_product_id'  => $product->id,
                    'product_name'         => $product->name,
                    'product_sku'          => $product->sku,
                    'unit_price_cents'     => $unitPrice,
                    'quantity'             => $qty,
                    'discount_cents'       => $discountLine,
                    'is_free'              => $isFree,
                ]);

                // Décrémenter le stock (même si is_free — le produit est sorti)
                $product->consumeStock($qty, null, $isFree, $creator->id);
            }

            ActivityLog::log('sale.created', $sale, [
                'sale_number'    => $sale->sale_number,
                'total_cents'    => $sale->total_cents,
                'payment_method' => $sale->payment_method,
                'lines_count'    => count($lines),
            ]);

            return $sale;
        });
    }

    /**
     * Cancel a sale order and restore stock.
     */
    public function cancel(SaleOrder $sale, string $reason, User $user): SaleOrder
    {
        if ($sale->isCancelled()) {
            throw new \RuntimeException('Cette vente est déjà annulée.');
        }

        return DB::transaction(function () use ($sale, $reason, $user) {
            // Restituer le stock pour chaque ligne
            $sale->load('lines.sellableProduct');
            foreach ($sale->lines as $line) {
                if ($line->sellableProduct) {
                    $line->sellableProduct->addStock(
                        $line->quantity,
                        "Annulation vente {$sale->sale_number}",
                        $sale->sale_number,
                        $user->id,
                    );
                }
            }

            $sale->update([
                'status'           => SaleOrder::STATUS_CANCELLED,
                'cancelled_reason' => $reason,
                'cancelled_at'     => now(),
            ]);

            ActivityLog::log('sale.cancelled', $sale, [
                'sale_number'      => $sale->sale_number,
                'cancelled_reason' => $reason,
            ]);

            return $sale->fresh();
        });
    }

    // ── Helpers privés ────────────────────────────────────────────────────

    private function calcSubtotal(array $lines): int
    {
        $subtotal = 0;
        foreach ($lines as $line) {
            if (!($line['is_free'] ?? false)) {
                $subtotal += (int) round((float) $line['unit_price_cents'] * (float) $line['quantity']);
            }
        }
        return $subtotal;
    }

    /**
     * @return array{int, string|null, float|null}  [discountCents, type, value]
     */
    private function calcDiscount(int $subtotal, ?string $type, float|int|null $value): array
    {
        if (!$type || !$value || $value <= 0) {
            return [0, null, null];
        }

        if ($type === 'percent') {
            return [(int) round($subtotal * $value / 100), 'percent', (float) $value];
        }

        // fixed (value in MAD, stored in cents)
        return [(int) ($value * 100), 'fixed', (float) $value];
    }
}
