<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * ShiftService — Encapsulates all business logic for shift open/close.
 *
 * ARCH-ITEM-2.5 (F-08):
 * - Cash reconciliation arithmetic extracted from ShiftController::close().
 * - Race-condition-safe shift opening via DB::transaction + lockForUpdate().
 */
final class ShiftService
{
    /**
     * Open a new shift for the given user.
     *
     * Uses lockForUpdate() inside a transaction to prevent a double-submit race
     * from creating two open shifts for the same user simultaneously.
     *
     * @throws ValidationException  If an open shift already exists for this user.
     */
    public function openShift(User $user, int $openingCashCents): Shift
    {
        return DB::transaction(function () use ($user, $openingCashCents) {
            $existing = Shift::where('user_id', $user->id)
                ->whereNull('closed_at')
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw ValidationException::withMessages([
                    'shift' => 'Un shift est déjà ouvert pour cet utilisateur.',
                ]);
            }

            return tap(Shift::create([
                'user_id'            => $user->id,
                'opened_at'          => now(),
                'opening_cash_cents' => $openingCashCents,
                'is_open'            => true,
            ]), function () use ($user) {
                // Bust the cached active-shift so HandleInertiaRequests reflects
                // the new shift on the very next request.
                Cache::forget("active_shift:{$user->id}");
            });
        });
    }    /**
     * Close a shift and compute the cash reconciliation.
     *
     * Expected cash = opening float + net cash received during the shift
     * (amount_cash_cents − change_given_cents) − cash expenses.
     * Uses a time-window filter on payments.created_at so payments on tickets
     * created in earlier shifts are correctly attributed to THIS shift.
     *
     * @return array{shift: Shift, expected_cash_cents: int, difference_cents: int}
     */
    public function closeShift(Shift $shift, int $closingCashCents, ?string $notes = null): array
    {
        return DB::transaction(function () use ($shift, $closingCashCents, $notes) {
            // Expected cash = opening float + net cash received during the shift.
            // Uses time-window filter (not tickets.shift_id) so payments on
            // older tickets collected during THIS shift are counted correctly.
            $cashReceivedDuringShift = (int) Payment::where('processed_by', $shift->user_id)
                ->where('created_at', '>=', $shift->opened_at)
                ->sum(DB::raw('amount_cash_cents - change_given_cents'));

            $expensesCashDuringShift = 0;
            try {
                $expensesCashDuringShift = (int) \App\Models\Expense::where('shift_id', $shift->id)
                    ->where('paid_with', 'cash')
                    ->sum('amount_cents');
            } catch (\Throwable) {
                // expenses table may not exist yet
            }

            $expectedCashCents = $shift->opening_cash_cents
                + $cashReceivedDuringShift
                - $expensesCashDuringShift;

            $differenceCents = $closingCashCents - $expectedCashCents;

            $shift->update([
                'closed_at'           => now(),
                'closing_cash_cents'  => $closingCashCents,
                'expected_cash_cents' => $expectedCashCents,
                'difference_cents'    => $differenceCents,
                'notes'               => $notes,
                'is_open'             => false,
            ]);

            // Bust the cached active-shift so HandleInertiaRequests stops returning
            // the now-closed shift on subsequent requests.
            Cache::forget("active_shift:{$shift->user_id}");

            return [
                'shift'               => $shift->fresh(),
                'expected_cash_cents' => $expectedCashCents,
                'difference_cents'    => $differenceCents,
            ];
        });
    }
}
