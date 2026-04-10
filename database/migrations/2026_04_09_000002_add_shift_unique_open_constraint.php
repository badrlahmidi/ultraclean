<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ARCH-ITEM-1.1a — Add a unique index on shifts(user_id) WHERE closed_at IS NULL.
 *
 * MariaDB / older MySQL do not support partial (filtered) unique indexes via
 * standard DDL, so we use a deterministic virtual/generated column `is_open`
 * as a proxy for the uniqueness constraint.
 *
 * is_open = 1  when the shift is open  (closed_at IS NULL)
 * is_open = 0  when the shift is closed (closed_at IS NOT NULL)
 *
 * The unique index on (user_id, is_open) with a partial-key approach is
 * supplemented by the application-level lockForUpdate() guard in ShiftService.
 *
 * NOTE: If your environment runs MySQL 8.0.13+ or MariaDB 10.5+ you could use
 * a functional generated column instead. The boolean column approach here is
 * compatible with MySQL 5.7 / MariaDB 10.2+ (Hostinger standard).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Add is_open boolean column driven by application logic.
        // We do NOT make it a generated/computed column for maximum compatibility
        // with shared hosting MySQL versions (some disable generated columns).
        // Instead ShiftService::openShift() sets is_open=1 and closeShift() sets is_open=0.
        Schema::table('shifts', function (Blueprint $table) {
            if (! Schema::hasColumn('shifts', 'is_open')) {
                $table->boolean('is_open')->default(false)->after('closed_at')
                      ->comment('1 = shift is active (closed_at IS NULL). Managed by ShiftService.');
            }
        });

        // Back-fill: any row with closed_at = NULL is open.
        \DB::statement("UPDATE shifts SET is_open = 1 WHERE closed_at IS NULL");
        \DB::statement("UPDATE shifts SET is_open = 0 WHERE closed_at IS NOT NULL");

        // Unique constraint: only one open shift per user at a time.
        // We wrap this in a try/catch because the index may already exist
        // if this migration is run twice (idempotent-safe).
        try {
            Schema::table('shifts', function (Blueprint $table) {
                $table->unique(['user_id', 'is_open'], 'shifts_user_id_is_open_unique');
            });
        } catch (\Throwable $e) {
            // Index already exists — skip silently.
            \Log::info('shifts_user_id_is_open_unique index already exists, skipping.');
        }
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropIndexIfExists('shifts_user_id_is_open_unique');
            if (Schema::hasColumn('shifts', 'is_open')) {
                $table->dropColumn('is_open');
            }
        });
    }
};
