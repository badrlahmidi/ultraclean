<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * vehicle_type_id est facultatif sur le ticket.
     * Le type de véhicule est sélectionné au niveau de chaque ligne de service
     * (price_variant_id) pour la tarification différenciée.
     * Le champ global sur le ticket sert uniquement au reporting.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('vehicle_type_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('vehicle_type_id')->nullable(false)->change();
        });
    }
};
