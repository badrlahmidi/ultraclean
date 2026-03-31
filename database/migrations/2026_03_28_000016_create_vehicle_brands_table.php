<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Table des marques automobiles pré-populées.
     *
     * Séparée de vehicle_models pour permettre l'affichage des logos
     * et la sélection hiérarchique Marque → Modèle dans l'interface
     * de réception.
     *
     * Pas de soft delete : une marque désactivée (is_active=0) reste
     * lisible dans les tickets historiques via la FK de tickets.
     */
    public function up(): void
    {
        Schema::create('vehicle_brands', function (Blueprint $table) {
            $table->id();

            $table->string('name', 80)->unique()
                  ->comment('Ex: Dacia, Peugeot, Renault, Toyota');

            $table->string('slug', 80)->unique()
                  ->comment('Identifiant URL-safe — ex: dacia, peugeot');

            $table->string('logo_path', 255)->nullable()
                  ->comment('Chemin relatif Storage — ex: brands/dacia.svg');

            $table->string('country', 60)->nullable()
                  ->comment('Pays d\'origine — ex: France, Japon (affichage informatif)');

            $table->unsignedTinyInteger('sort_order')->default(0)
                  ->comment('Ordre d\'affichage dans la grille de sélection');

            $table->boolean('is_active')->default(true)
                  ->comment('Masquer une marque sans la supprimer');

            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_brands');
    }
};
