<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-FIX: Missing composite indexes identified in the holistic audit.
 *
 * 1. activity_logs (action, created_at)
 *    Used by dashboard widgets and reporting that filter/aggregate by action
 *    type within a date range.  Without this, each query full-scans the table.
 *
 * 2. ticket_services (ticket_id, service_id)
 *    Supplements the existing single-column index on ticket_id.
 *    Covers queries that JOIN tickets + ticket_services and then filter on
 *    service_id (e.g. top-services report).  The covering composite avoids a
 *    second random-access lookup into the table.
 *
 * Note: loyalty_transactions(client_id, created_at) already exists in
 * 2026_03_30_000026_create_loyalty_transactions_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── activity_logs ────────────────────────────────────────────────────
        Schema::table('activity_logs', function (Blueprint $table) {
            if (! Schema::hasIndex('activity_logs', 'activity_logs_action_created_at_index')) {
                $table->index(['action', 'created_at'], 'activity_logs_action_created_at_index');
            }
        });

        // ── ticket_services ──────────────────────────────────────────────────
        Schema::table('ticket_services', function (Blueprint $table) {
            if (! Schema::hasIndex('ticket_services', 'ticket_services_ticket_id_service_id_index')) {
                $table->index(['ticket_id', 'service_id'], 'ticket_services_ticket_id_service_id_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndexIfExists('activity_logs_action_created_at_index');
        });

        Schema::table('ticket_services', function (Blueprint $table) {
            $table->dropIndexIfExists('ticket_services_ticket_id_service_id_index');
        });
    }
};
