<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-FIX: Add has_stock_warning column to tickets table.
 *
 * This flag is set when a payment is processed with insufficient stock
 * and strict_mode is disabled. It allows operators to track tickets
 * that may have caused negative stock.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->boolean('has_stock_warning')->default(false)->after('is_prepaid');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('has_stock_warning');
        });
    }
};
