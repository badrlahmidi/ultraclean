<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-FIX: Add a CHECK constraint on stock_products.current_quantity >= 0.
 *
 * This acts as the last line of defence against negative stock values that could
 * slip through if application-level guards are bypassed (e.g. direct DB writes,
 * concurrent transactions, or future code changes that forget the guard).
 *
 * MySQL / MariaDB: ALTER TABLE ... ADD CONSTRAINT CHECK
 * SQLite          : CHECK constraints must be specified at table creation time —
 *                   SQLite silently ignores ADD CONSTRAINT on existing tables in
 *                   older versions, so we skip it there (application guards still apply).
 */
return new class extends Migration
{
    private const CONSTRAINT = 'chk_stock_quantity_non_negative';

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite enforces CHECK at CREATE time; skip for dev/test environments.
            return;
        }

        // Clamp any existing negative rows to 0 before adding the constraint,
        // so the migration doesn't fail on a database with dirty data.
        DB::table('stock_products')
            ->where('current_quantity', '<', 0)
            ->update(['current_quantity' => 0]);

        DB::statement(
            'ALTER TABLE stock_products
             ADD CONSTRAINT ' . self::CONSTRAINT . '
             CHECK (current_quantity >= 0)'
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE stock_products DROP CONSTRAINT ' . self::CONSTRAINT);
    }
};
