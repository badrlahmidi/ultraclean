<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FIX BUG-2 — Add 'platinum' to clients.loyalty_tier enum.
 *
 * LoyaltyService::calculateTier() returns 'platinum' for clients with >= 50
 * visits, but the original migration only included ('standard','silver','gold').
 * Attempting to store 'platinum' caused a MySQL SQLSTATE[22007] enum violation,
 * crashing the loyalty award for high-visit clients.
 */
return new class extends Migration
{
    public function up(): void
    {
        // MySQL requires re-declaring the full enum list on ALTER COLUMN.
        \DB::statement(
            "ALTER TABLE clients MODIFY COLUMN loyalty_tier ENUM('standard','silver','gold','platinum') NOT NULL DEFAULT 'standard'"
        );
    }

    public function down(): void
    {
        // Before rolling back, update any 'platinum' clients to 'gold'
        // to avoid data loss on the constraint reversal.
        \DB::table('clients')
            ->where('loyalty_tier', 'platinum')
            ->update(['loyalty_tier' => 'gold']);

        \DB::statement(
            "ALTER TABLE clients MODIFY COLUMN loyalty_tier ENUM('standard','silver','gold') NOT NULL DEFAULT 'standard'"
        );
    }
};
