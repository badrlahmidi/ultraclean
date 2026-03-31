<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Grille tarifaire : 1 prix par combinaison service × type de véhicule.
     *
     * Exemple :
     *   Lavage Extérieur × Citadine  → 3000 centimes (30,00 MAD)
     *   Lavage Extérieur × SUV       → 4500 centimes (45,00 MAD)
     *   Aspiration       × Utilitaire → 3500 centimes (35,00 MAD)
     *
     * Avantage vs multiplicateur : chaque tarif est indépendant.
     * Dépend de : services, vehicle_types.
     */
    public function up(): void
    {
        Schema::create('service_vehicle_prices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('service_id')
                  ->constrained('services')
                  ->cascadeOnDelete()
                  ->comment('Référence au service du catalogue');

            $table->foreignId('vehicle_type_id')
                  ->constrained('vehicle_types')
                  ->cascadeOnDelete()
                  ->comment('Référence au type de véhicule');

            // Montant en CENTIMES MAD — jamais de DECIMAL pour les prix
            // 5000 = 50,00 MAD
            $table->unsignedInteger('price_cents')
                  ->comment('Prix en centimes MAD. Ex: 4500 = 45,00 MAD');

            $table->timestamps();

            // Un seul prix par combinaison service + véhicule
            $table->unique(['service_id', 'vehicle_type_id'], 'unique_service_vehicle_price');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_vehicle_prices');
    }
};
