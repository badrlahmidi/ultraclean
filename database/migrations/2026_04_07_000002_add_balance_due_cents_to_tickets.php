<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 5 — Payment audit fixes.
 *
 * Adds balance_due_cents to tickets to track remaining balance for:
 *   - advance (partial pre-payment): balance_due = total - advance_paid
 *   - credit (deferred payment):     balance_due = total (nothing paid now)
 *
 * A ticket with balance_due_cents > 0 and status = 'partial' is visible
 * to the caissier as an outstanding receivable.
 */
return new class extends Migration
{    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedInteger('balance_due_cents')
                  ->default(0)
                  ->after('total_cents')
                  ->comment('Solde restant dû (avance partielle ou crédit différé), en centimes MAD');
        });

        // Widen the tickets.status enum to include 'partial'.
        // Using ->change() works on all drivers:
        //   MySQL   → ALTER TABLE ... MODIFY COLUMN (handled by Laravel/Doctrine)
        //   SQLite  → table recreation (removes the old CHECK constraint and adds the new one)
        Schema::table('tickets', function (Blueprint $table) {
            $table->enum('status', [
                'pending',
                'in_progress',
                'paused',
                'blocked',
                'completed',
                'payment_pending',
                'paid',
                'partial',
                'cancelled',
            ])->default('pending')->change();
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('balance_due_cents');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->enum('status', [
                'pending',
                'in_progress',
                'paused',
                'blocked',
                'completed',
                'payment_pending',
                'paid',
                'cancelled',
            ])->default('pending')->change();
        });
    }
};
