<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add discount fields to tickets table.
 *
 * Supports:
 * - Global ticket discount (percent or fixed amount in MAD)
 * - Discount type: percent | fixed
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->enum('discount_type', ['percent', 'fixed'])->nullable()->after('discount_cents')
                  ->comment('Type de remise: percent = %, fixed = montant fixe');
            $table->decimal('discount_value', 10, 2)->default(0)->after('discount_type')
                  ->comment('Valeur de la remise (ex: 10 pour 10% ou 10 MAD)');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value']);
        });
    }
};
