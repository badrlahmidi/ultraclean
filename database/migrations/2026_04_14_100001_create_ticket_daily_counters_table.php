<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AUDIT-FIX: Atomic ticket-number sequence counter.
 *
 * Introduces a `ticket_daily_counters` table with one row per calendar day.
 * Each row is locked (SELECT … FOR UPDATE) when generating a new ticket number,
 * which serialises concurrent inserts and eliminates the race condition in
 * Ticket::generateTicketNumber().
 *
 * Fallback for SQLite (dev/test): the table still exists but no row-locking is
 * used; the UNIQUE constraint on tickets.ticket_number remains the last guard.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_daily_counters', function (Blueprint $table) {
            $table->date('date')->primary();
            $table->unsignedBigInteger('next_value')->default(1);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_daily_counters');
    }
};
