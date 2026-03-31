<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{    public function up(): void
    {
        Schema::table('ticket_services', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_services', 'price_variant_id')) {
                $table->foreignId('price_variant_id')
                      ->nullable()
                      ->after('ticket_id')
                      ->constrained('vehicle_types')
                      ->nullOnDelete()
                      ->comment('Catégorie de taille choisie (si service à prix variant)');
            }
            if (!Schema::hasColumn('ticket_services', 'price_variant_label')) {
                $table->string('price_variant_label', 50)
                      ->nullable()
                      ->after('price_variant_id')
                      ->comment('Snapshot du nom catégorie — ex: Petite voiture');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ticket_services', function (Blueprint $table) {
            $table->dropForeign(['price_variant_id']);
            $table->dropColumn(['price_variant_id', 'price_variant_label']);
        });
    }
};
