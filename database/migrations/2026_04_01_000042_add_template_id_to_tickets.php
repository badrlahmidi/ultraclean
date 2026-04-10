<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute ticket_template_id sur tickets pour identifier les tickets récurrents.
 * Utilisé pour le badge 🔄 dans les dashboards.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('ticket_template_id')
                  ->nullable()
                  ->after('shift_id')
                  ->constrained('ticket_templates')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\TicketTemplate::class);
            $table->dropColumn('ticket_template_id');
        });
    }
};
