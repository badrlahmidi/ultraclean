<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Table des modèles automobiles, enfants des marques.
     *
     * La relation brand_id → vehicle_brands est RESTRICT (on ne peut pas
     * supprimer Dacia si des modèles Dacia existent).
     *
     * Le champ suggested_vehicle_type_id est une SUGGESTION de catégorie
     * de taille (Citadine, SUV...) afin de pré-remplir la sélection de
     * prix lors de la réception — le caissier reste libre de la changer.
     */
    public function up(): void
    {
        Schema::create('vehicle_models', function (Blueprint $table) {
            $table->id();

            $table->foreignId('brand_id')
                  ->constrained('vehicle_brands')
                  ->restrictOnDelete()
                  ->comment('Marque parente — CASCADE impossible car données de référence');

            $table->string('name', 80)
                  ->comment('Ex: Sandero, Logan, Duster, 208, 308, 3008');

            $table->string('slug', 80)
                  ->comment('Ex: sandero, logan, 208');

            /**
             * Suggestion de catégorie de taille pour pré-remplir le
             * sélecteur de prix. NULL = à déterminer par le caissier.
             * NullOnDelete pour ne pas bloquer si un vehicle_type est supprimé.
             */
            $table->foreignId('suggested_vehicle_type_id')
                  ->nullable()
                  ->constrained('vehicle_types')
                  ->nullOnDelete()
                  ->comment('Pré-remplit la catégorie de taille (SUV, Citadine...) — modifiable');

            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Un modèle doit être unique au sein d'une marque
            $table->unique(['brand_id', 'slug']);

            $table->index(['brand_id', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_models');
    }
};
