<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ARCH-ITEM-1.1b — Add missing performance indexes identified in the audit.
 *
 * These indexes target the most common query patterns on Hostinger shared hosting
 * where full table scans cause 504 Gateway Timeouts under moderate load.
 *
 * Cross-database compatible (MySQL, MariaDB, SQLite) — uses Schema::hasIndex()
 * which was introduced in Laravel 11 and is available in Laravel 12.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── tickets ──────────────────────────────────────────────────────────
        Schema::table('tickets', function (Blueprint $table) {
            // Report date-range queries (Admin Reports — most frequent filter)
            if (! Schema::hasIndex('tickets', 'tickets_created_at_status_index')) {
                $table->index(['created_at', 'status'], 'tickets_created_at_status_index');
            }
            // Shift close reconciliation (ShiftService::closeShift)
            if (! Schema::hasIndex('tickets', 'tickets_shift_id_status_index')) {
                $table->index(['shift_id', 'status'], 'tickets_shift_id_status_index');
            }
            // Client ticket history (Caissier/Clients/Show + Admin/Loyalty)
            if (! Schema::hasIndex('tickets', 'tickets_client_id_created_at_index')) {
                $table->index(['client_id', 'created_at'], 'tickets_client_id_created_at_index');
            }
        });

        // ── payments ─────────────────────────────────────────────────────────
        Schema::table('payments', function (Blueprint $table) {
            // Payment reports filtered by method + date (Admin/Payments)
            if (! Schema::hasIndex('payments', 'payments_created_at_method_index')) {
                $table->index(['created_at', 'method'], 'payments_created_at_method_index');
            }
        });

        // ── loyalty_transactions ─────────────────────────────────────────────
        Schema::table('loyalty_transactions', function (Blueprint $table) {
            // Loyalty history per client (Admin/Loyalty/Show)
            if (! Schema::hasIndex('loyalty_transactions', 'loyalty_transactions_client_id_created_at_index')) {
                $table->index(['client_id', 'created_at'], 'loyalty_transactions_client_id_created_at_index');
            }
        });

        // ── stock_movements ──────────────────────────────────────────────────
        Schema::table('stock_movements', function (Blueprint $table) {
            // Movement history per product (Admin/Stock/{id}/movements)
            if (! Schema::hasIndex('stock_movements', 'stock_movements_product_id_created_at_index')) {
                $table->index(['stock_product_id', 'created_at'], 'stock_movements_product_id_created_at_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndexIfExists('tickets_created_at_status_index');
            $table->dropIndexIfExists('tickets_shift_id_status_index');
            $table->dropIndexIfExists('tickets_client_id_created_at_index');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndexIfExists('payments_created_at_method_index');
        });

        Schema::table('loyalty_transactions', function (Blueprint $table) {
            $table->dropIndexIfExists('loyalty_transactions_client_id_created_at_index');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndexIfExists('stock_movements_product_id_created_at_index');
        });
    }
};
