<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Véhicules d'un client — relation 1:N (un client peut avoir plusieurs voitures).
     */
    public function up(): void
    {
        Schema::create('client_vehicles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('client_id')
                  ->constrained('clients')
                  ->cascadeOnDelete();

            $table->string('plate', 20)->nullable()->comment('Immatriculation — ex: A-12345-B');
            $table->string('brand', 80)->nullable()->comment('Marque — ex: Toyota');
            $table->string('model', 80)->nullable()->comment('Modèle — ex: Yaris');
            $table->string('color', 50)->nullable()->comment('Couleur — ex: Blanc');
            $table->unsignedSmallInteger('year')->nullable()->comment('Année — ex: 2021');

            $table->foreignId('vehicle_type_id')
                  ->nullable()
                  ->constrained('vehicle_types')
                  ->nullOnDelete()
                  ->comment('Catégorie de prix');

            $table->boolean('is_primary')->default(false)->comment('Véhicule principal du client');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('client_id');
            $table->index('plate');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_vehicles');
    }
};
