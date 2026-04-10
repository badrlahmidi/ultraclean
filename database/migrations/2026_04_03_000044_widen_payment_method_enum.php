<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 4 — Widen payments.method enum to include wire, advance, credit.
 *
 * The PaymentController accepts these methods but the original migration
 * only defined ['cash', 'card', 'mobile', 'mixed']. This caused silent
 * truncation in MySQL (non-strict) and CHECK constraint failures in SQLite tests.
 *
 * MySQL  : uses ALTER TABLE MODIFY COLUMN (fast, in-place).
 * SQLite : must drop + re-add the column because CHECK constraints are immutable.
 *          DROP COLUMN requires SQLite ≥ 3.35 (bundled with PHP 8.1+).
 */
return new class extends Migration
{
    /** All valid payment methods — single source of truth. */
    private const METHODS = ['cash', 'card', 'mobile', 'mixed', 'wire', 'advance', 'credit'];

    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            $list = implode("','", self::METHODS);
            DB::statement("ALTER TABLE payments MODIFY COLUMN method ENUM('{$list}') NOT NULL COMMENT 'Méthode de paiement principale'");
            return;
        }

        if ($driver === 'sqlite') {
            // SQLite has no ALTER COLUMN — drop the old column (with its limited CHECK)
            // and re-add it with the full set. Safe during migrations because the table
            // is empty at this point (RefreshDatabase replays all migrations from scratch).
            Schema::table('payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->dropColumn('method');
            });
            Schema::table('payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->enum('method', self::METHODS)->after('amount_cents');
            });
        }
    }

    public function down(): void
    {
        $original = ['cash', 'card', 'mobile', 'mixed'];
        $driver   = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            $list = implode("','", $original);
            DB::statement("ALTER TABLE payments MODIFY COLUMN method ENUM('{$list}') NOT NULL COMMENT 'Méthode de paiement principale'");
            return;
        }

        if ($driver === 'sqlite') {
            Schema::table('payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->dropColumn('method');
            });
            Schema::table('payments', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->enum('method', $original)->after('amount_cents');
            });
        }
    }
};
