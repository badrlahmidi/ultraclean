<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Types de véhicules — détermine le prix via service_vehicle_prices.
     * Pas de FK sortantes → peut être créé tôt.
     */
    public function up(): void
    {
        Schema::create('vehicle_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->comment('Ex: Citadine, SUV, Utilitaire, Moto');
            $table->string('slug', 50)->unique()->comment('Ex: citadine, suv, utilitaire, moto');
            $table->string('icon', 50)->nullable()->comment('Nom icône Lucide — ex: car, truck, bike');
            $table->boolean('is_active')->default(true);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_types');
    }
};
