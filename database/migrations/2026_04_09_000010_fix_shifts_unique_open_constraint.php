<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FIX BUG-1 — Drop the `shifts_user_id_is_open_unique` composite index.
 *
 * The original index on (user_id, is_open) was intended to prevent two
 * simultaneous open shifts for the same user, but it also prevents multiple
 * CLOSED shifts per user — blocking every shift-close after the first one.
 *
 * The race-condition protection is already correctly handled at the
 * application layer by ShiftService::openShift() using DB::transaction +
 * lockForUpdate(), which is sufficient.
 *
 * The `is_open` boolean column is kept (ShiftService still sets it), but the
 * uniqueness constraint is dropped entirely.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            // Drop the broken composite unique index if it exists
            $indexes = Schema::getIndexes('shifts');
            $exists  = collect($indexes)->contains(
                fn ($idx) => $idx['name'] === 'shifts_user_id_is_open_unique'
            );

            if ($exists) {
                $table->dropUnique('shifts_user_id_is_open_unique');
            }
        });
    }

    public function down(): void
    {
        // Intentionally not re-adding the broken constraint in rollback.
        // If you need to re-add it, refer to the original migration.
    }
};
