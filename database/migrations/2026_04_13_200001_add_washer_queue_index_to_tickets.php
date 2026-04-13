<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-FIX (M5) — Add composite index on tickets(assigned_to, status).
 *
 * Improves performance for laveur queue queries:
 *   Ticket::where('assigned_to', $id)->where('status', 'in_progress')
 *
 * The (client_id, created_at) index was already added in
 * 2026_04_09_000001_add_performance_indexes.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasIndex('tickets', 'idx_tickets_washer_queue')) {
                $table->index(['assigned_to', 'status'], 'idx_tickets_washer_queue');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_tickets_washer_queue');
        });
    }
};
