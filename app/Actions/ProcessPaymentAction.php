<?php

namespace App\Actions;

use App\DTOs\ProcessPaymentDTO;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Ticket;
use App\Services\LoyaltyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ProcessPaymentAction — Single-purpose action for the payment flow.
 *
 * Handles all 7 payment methods:
 *   cash | card | mobile | wire  → full single-channel payment  → STATUS_PAID
 *   mixed                         → full multi-channel payment   → STATUS_PAID
 *   advance (amount >= total)     → full pre-payment            → STATUS_PAID  (is_prepaid=true)
 *   advance (amount < total)      → partial deposit             → STATUS_PARTIAL (balance_due tracked)
 *   credit                        → deferred — 0 collected now  → STATUS_PARTIAL (balance_due = total)
 *
 * FIXES applied (Sprint 5 audit):
 *   BUG-2  advance partial → was incorrectly transitioning to STATUS_PAID with unpaid balance
 *   BUG-3  credit          → was incorrectly transitioning to STATUS_PAID with amount_cents=0
 *   BUG-4  resolveAmounts  → 'advance' now has an explicit match arm instead of falling to default
 */
class ProcessPaymentAction
{
    /**
     * @return array{payment: Payment, change_cents: int, points_earned: int, is_prepaid: bool, target_status: string, message: string}
     *
     * @throws \Illuminate\Validation\ValidationException
     */    public function execute(Ticket $ticket, ProcessPaymentDTO $dto, int $operatorId): array
    {
        // For partial tickets collecting the remaining balance, only the outstanding
        // balance_due is required — not the original total.
        // BUG-5 FIX: compute requiredCents BEFORE resolveAmounts so single-channel
        // methods use the correct baseline (not the full ticket total).
        $requiredCents = ($ticket->status === Ticket::STATUS_PARTIAL && $ticket->balance_due_cents > 0)
            ? $ticket->balance_due_cents
            : $ticket->total_cents;

        [$cash, $card, $mobile, $wire] = $this->resolveAmounts($dto, $requiredCents);

        $totalPaid = $cash + $card + $mobile + $wire;

        // ── Validate sufficiency ────────────────────────────────────────────
        $this->validateSufficiency($dto->method, $totalPaid, $requiredCents);

        $changeCents = max(0, $totalPaid - $requiredCents);

        // ── Determine target status & balance ───────────────────────────────
        [$targetStatus, $balanceDueCents, $isPrepaid] = $this->resolveTargetStatus(
            $ticket, $dto->method, $totalPaid
        );

        // ── Execute in a transaction ────────────────────────────────────────
        $payment      = null;
        $pointsEarned = 0;

        DB::beginTransaction();
        try {
            $payment = Payment::create([
                'ticket_id'           => $ticket->id,
                'processed_by'        => $operatorId,
                'method'              => $dto->method,
                'amount_cents'        => $totalPaid,  // actual collected now (0 for credit)
                'amount_cash_cents'   => $cash,
                'amount_card_cents'   => $card,
                'amount_mobile_cents' => $mobile,
                'amount_wire_cents'   => $wire,
                'change_given_cents'  => $changeCents,
                'reference'           => $dto->note,
            ]);

            $ticket->transitionTo($targetStatus, [
                'paid_by'           => $operatorId,
                'is_prepaid'        => $isPrepaid,
                'balance_due_cents' => $balanceDueCents,
            ]);

            // Only consume stock on final full payment
            if ($targetStatus === Ticket::STATUS_PAID) {
                $this->consumeStock($ticket);
            }            // ARCH-ITEM-2.3 (F-04): exclude the walk-in sentinel from loyalty awards.
            // Client::walkIn() is an anonymous placeholder — it must never accumulate
            // points, visit counts, or tier upgrades.
            $isRealClient = $ticket->client_id
                && $targetStatus === Ticket::STATUS_PAID
                && $dto->method !== 'credit'
                && ! Client::isWalkInId($ticket->client_id);

            if ($isRealClient) {
                $pointsEarned = $this->awardLoyalty($ticket, $operatorId);
            }

            ActivityLog::log('ticket.paid', $ticket, [
                'ticket_number'      => $ticket->ticket_number,
                'method'             => $dto->method,
                'amount_cents'       => $payment->amount_cents,
                'change_given_cents' => $changeCents,
                'balance_due_cents'  => $balanceDueCents,
                'target_status'      => $targetStatus,
                'loyalty_points'     => $pointsEarned,
                'is_prepaid'         => $isPrepaid,
            ]);

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Payment transaction failed for ticket ' . $ticket->ticket_number . ': ' . $e->getMessage());
            throw $e;
        }

        return [
            'payment'       => $payment,
            'change_cents'  => $changeCents,
            'points_earned' => $pointsEarned,
            'is_prepaid'    => $isPrepaid,
            'target_status' => $targetStatus,
            'message'       => $this->buildSuccessMessage(
                $dto->method, $totalPaid, $changeCents, $pointsEarned, $ticket->total_cents, $balanceDueCents
            ),
        ];    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Resolve per-channel amounts based on payment method.
     *
     * BUG-4 FIX: 'advance' now has an explicit match arm instead of falling to 'default'.
     * BUG-5 FIX: single-channel methods (cash/card/mobile/wire) now use the
     *            DTO-submitted amount instead of blindly using the caller-provided
     *            $requiredCents.  This ensures:
     *              - Balance collection records the correct amount (balance_due, not total)
     *              - Cash overpayment records the actual tendered amount (for change tracking)
     *            Fallback to $requiredCents if the DTO field is 0 (defensive).
     *
     * @param  ProcessPaymentDTO  $dto
     * @param  int  $requiredCents  The amount actually owed (balance_due for partials, total otherwise)
     * @return array{0: int, 1: int, 2: int, 3: int}  [cash, card, mobile, wire]
     */
    private function resolveAmounts(ProcessPaymentDTO $dto, int $requiredCents): array
    {
        return match ($dto->method) {
            // BUG-5 FIX: use submitted amount (supports overpayment & balance collection);
            // fall back to $requiredCents when the frontend omits the channel amount.
            'cash'    => [$dto->amountCashCents   ?: $requiredCents, 0, 0, 0],
            'card'    => [0, $dto->amountCardCents   ?: $requiredCents, 0, 0],
            'mobile'  => [0, 0, $dto->amountMobileCents ?: $requiredCents, 0],
            'wire'    => [0, 0, 0, $dto->amountWireCents  ?: $requiredCents],
            'credit'  => [0, 0, 0, 0],
            // BUG-4 FIX: explicit arm — advance deposit can come in via any channel
            'advance' => [
                $dto->amountCashCents,
                $dto->amountCardCents,
                $dto->amountMobileCents,
                $dto->amountWireCents,
            ],
            // mixed: caller supplies per-channel amounts
            default   => [
                $dto->amountCashCents,
                $dto->amountCardCents,
                $dto->amountMobileCents,
                $dto->amountWireCents,
            ],
        };
    }

    /**
     * Resolve the target ticket status, remaining balance, and is_prepaid flag.
     *
     * BUG-2 FIX: advance with partial amount → STATUS_PARTIAL (was wrongly STATUS_PAID)
     * BUG-3 FIX: credit                      → STATUS_PARTIAL with full balance_due (was STATUS_PAID + amount=0)
     *
     * @return array{0: string, 1: int, 2: bool}  [targetStatus, balanceDueCents, isPrepaid]
     */
    private function resolveTargetStatus(Ticket $ticket, string $method, int $totalPaid): array
    {
        // Collecting remaining balance on an already-partial ticket → always fully paid
        if ($ticket->status === Ticket::STATUS_PARTIAL) {
            return [Ticket::STATUS_PAID, 0, false];
        }

        // Credit: nothing collected now — full amount deferred
        if ($method === 'credit') {
            return [Ticket::STATUS_PARTIAL, $ticket->total_cents, false];
        }

        // Advance: check if the deposit covers the full price
        if ($method === 'advance') {
            if ($totalPaid >= $ticket->total_cents) {
                // Full pre-payment
                $isPrepaid = in_array($ticket->status, [
                    Ticket::STATUS_PENDING,
                    Ticket::STATUS_IN_PROGRESS,
                ]);
                return [Ticket::STATUS_PAID, 0, $isPrepaid];
            }
            // Partial deposit — track remaining balance
            return [Ticket::STATUS_PARTIAL, $ticket->total_cents - $totalPaid, false];
        }

        // All other full-payment methods (cash, card, mobile, wire, mixed)
        $isPrepaid = in_array($ticket->status, [
            Ticket::STATUS_PENDING,
            Ticket::STATUS_IN_PROGRESS,
        ]);
        return [Ticket::STATUS_PAID, 0, $isPrepaid];
    }

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    private function validateSufficiency(string $method, int $totalPaid, int $requiredCents): void
    {
        if ($method === 'credit') {
            return; // Deferred — balance tracked via STATUS_PARTIAL
        }

        if ($method === 'advance') {
            if ($totalPaid <= 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'amount' => "Veuillez saisir un montant d'avance.",
                ]);
            }
            return; // Any positive advance is accepted
        }

        if ($totalPaid < $requiredCents) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'amount' => sprintf(
                    'Montant insuffisant : %.2f MAD encaissé pour %.2f MAD dû.',
                    $totalPaid / 100,
                    $requiredCents / 100,
                ),
            ]);
        }
    }    /**
     * Decrement stock for every product linked to the ticket's services.
     *
     * ARCH-ITEM-2.4 (F-05): The inner try/catch has been removed so that any
     * exception propagates to the outer DB::transaction() and rolls back the
     * entire payment — preventing a committed payment with un-decremented stock.
     * Low-stock warnings are logged but do NOT abort the transaction.
     */
    private function consumeStock(Ticket $ticket): void
    {
        $ticket->load('services.service.stockProducts');

        foreach ($ticket->services as $ticketService) {
            $service = $ticketService->service;
            if (! $service) {
                continue;
            }
            foreach ($service->stockProducts as $product) {
                $qty = ($product->pivot->quantity_per_use ?? 1) * ($ticketService->quantity ?? 1);

                if ($product->current_quantity < $qty) {
                    Log::warning('Stock insufficient at payment — continuing (stock will go negative)', [
                        'product'   => $product->id,
                        'required'  => $qty,
                        'available' => $product->current_quantity,
                        'ticket'    => $ticket->ulid,
                    ]);
                }

                $product->consumeStock((float) $qty, $ticket->ticket_number, $ticket->id, auth()->id());
            }
        }
    }

    private function awardLoyalty(Ticket $ticket, int $operatorId): int
    {
        try {
            $ticket->refresh();
            $client = Client::find($ticket->client_id);
            if ($client) {
                return LoyaltyService::awardPoints($client, $ticket, $operatorId);
            }
        } catch (\Throwable $e) {
            Log::warning('Loyalty award failed for ticket ' . $ticket->ticket_number . ': ' . $e->getMessage());
        }
        return 0;
    }

    private function buildSuccessMessage(
        string $method,
        int $totalPaid,
        int $changeCents,
        int $pointsEarned,
        int $totalCents,
        int $balanceDueCents
    ): string {
        $labels = [
            'cash'    => 'Espèces',
            'card'    => 'Carte',
            'wire'    => 'Virement',
            'mobile'  => 'Mobile',
            'mixed'   => 'Mixte',
            'advance' => 'Avance',
            'credit'  => 'Crédit',
        ];
        $label = $labels[$method] ?? $method;

        if ($method === 'credit') {
            return sprintf(
                'Crédit enregistré — Solde dû : %.2f MAD (paiement différé).',
                $totalCents / 100
            );
        }

        if ($method === 'advance' && $balanceDueCents > 0) {
            return sprintf(
                'Avance de %.2f MAD enregistrée — Reste dû : %.2f MAD',
                $totalPaid / 100,
                $balanceDueCents / 100
            );
        }

        $msg = sprintf('Paiement %s enregistré', $label);
        if ($changeCents > 0) {
            $msg .= sprintf(' — Rendu : %.2f MAD', $changeCents / 100);
        }
        if ($pointsEarned > 0) {
            $msg .= sprintf(' · +%d pts fidélité', $pointsEarned);
        }        return $msg;
    }
}
