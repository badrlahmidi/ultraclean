<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Marque/modèle libre — ex: "Toyota Yaris", "Dacia Sandero"
            $table->string('vehicle_brand', 80)
                  ->nullable()
                  ->after('vehicle_plate')
                  ->comment('Marque et modèle saisie libre — ex: Toyota Yaris');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn('vehicle_brand');
        });
    }
};
