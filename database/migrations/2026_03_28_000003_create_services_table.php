<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catalogue des prestations de lavage.
     * Les prix sont dans service_vehicle_prices (1 prix par service × type véhicule).
     */
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->comment('Ex: Lavage Extérieur, Lavage Complet, Aspiration');
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#3B82F6')->comment('Code HEX pour badge UI');
            $table->unsignedTinyInteger('duration_minutes')->default(15)->comment('Durée estimée pour planification');
            $table->boolean('is_active')->default(true);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
