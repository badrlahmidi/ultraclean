<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make tickets.discount_value nullable.
 *
 * Previously the column was NOT NULL with a default of 0, which caused MySQL
 * strict-mode to reject an explicit NULL when a ticket is created without any
 * discount.  Making it nullable lets the application pass null (no discount)
 * without triggering a DB error.
 *
 * Ticket::recalculateTotals() already handles null gracefully (null > 0 is
 * false in PHP, so the discount branch is simply skipped).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->decimal('discount_value', 10, 2)
                  ->nullable()
                  ->default(null)
                  ->comment('Valeur de la remise (ex: 10 pour 10% ou 10 MAD) — null = pas de remise')
                  ->change();
        });
    }

    public function down(): void
    {
        // Restore to NOT NULL with default 0; coerce any existing NULLs first.
        \Illuminate\Support\Facades\DB::statement(
            "UPDATE tickets SET discount_value = 0 WHERE discount_value IS NULL"
        );

        Schema::table('tickets', function (Blueprint $table) {
            $table->decimal('discount_value', 10, 2)
                  ->default(0)
                  ->nullable(false)
                  ->change();
        });
    }
};
