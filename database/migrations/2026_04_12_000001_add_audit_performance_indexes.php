<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-FIX: Add missing performance indexes identified in the architecture review.
 *
 * These indexes improve query performance for:
 *  - Appointment scheduling queries (scheduled_at + status)
 *  - Invoice due date filtering (status + due_date)
 *  - Expense reporting (date + category)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── appointments ─────────────────────────────────────────────────────
        // Used by: AppointmentController@index, calendar views, conflict detection
        Schema::table('appointments', function (Blueprint $table) {
            if (! Schema::hasIndex('appointments', 'appointments_scheduled_at_status_index')) {
                $table->index(['scheduled_at', 'status'], 'appointments_scheduled_at_status_index');
            }
        });

        // ── invoices ─────────────────────────────────────────────────────────
        // Used by: InvoiceController@index, dashboard due invoices widget
        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasIndex('invoices', 'invoices_status_due_date_index')) {
                $table->index(['status', 'due_date'], 'invoices_status_due_date_index');
            }
        });

        // ── expenses ─────────────────────────────────────────────────────────
        // Used by: ReportsController@gatherData, expense analytics
        Schema::table('expenses', function (Blueprint $table) {
            if (! Schema::hasIndex('expenses', 'expenses_date_category_index')) {
                $table->index(['date', 'category'], 'expenses_date_category_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndexIfExists('appointments_scheduled_at_status_index');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndexIfExists('invoices_status_due_date_index');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndexIfExists('expenses_date_category_index');
        });
    }
};
