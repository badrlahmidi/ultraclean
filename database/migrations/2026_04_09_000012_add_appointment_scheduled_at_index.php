<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P1 — Add performance index on appointments.scheduled_at.
 *
 * AppointmentController::index() filters with:
 *   whereDate('scheduled_at', '>=', today())
 * and calendar views also filter on a single day. Without an index this
 * becomes a full-table scan as the appointment count grows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (! Schema::hasIndex('appointments', 'appointments_scheduled_at_status_index')) {
                $table->index(['scheduled_at', 'status'], 'appointments_scheduled_at_status_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndexIfExists('appointments_scheduled_at_status_index');
        });
    }
};
