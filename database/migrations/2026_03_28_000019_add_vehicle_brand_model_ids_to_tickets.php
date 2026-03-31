<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajoute les FK structurées Marque/Modèle sur les tickets.
     *
     * On conserve la colonne vehicle_brand (VARCHAR libre, ajoutée en migration 11)
     * comme champ snapshot lisible — elle sera mise à jour automatiquement
     * par le controller lors de la création avec les nouvelles FKs.
     *
     * Contraintes NullOnDelete car si une marque/modèle est supprimée du
     * catalogue, les tickets historiques doivent rester intacts.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('vehicle_brand_id')
                  ->nullable()
                  ->after('vehicle_brand')
                  ->constrained('vehicle_brands')
                  ->nullOnDelete()
                  ->comment('FK vers vehicle_brands — NULL si marque non répertoriée');

            $table->foreignId('vehicle_model_id')
                  ->nullable()
                  ->after('vehicle_brand_id')
                  ->constrained('vehicle_models')
                  ->nullOnDelete()
                  ->comment('FK vers vehicle_models — NULL si modèle non répertorié');

            // Index pour les rapports filtrés par marque (ex: quels tickets Toyota ce mois)
            $table->index('vehicle_brand_id');
            $table->index('vehicle_model_id');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['vehicle_brand_id']);
            $table->dropForeign(['vehicle_model_id']);
            $table->dropIndex(['vehicle_brand_id']);
            $table->dropIndex(['vehicle_model_id']);
            $table->dropColumn(['vehicle_brand_id', 'vehicle_model_id']);
        });
    }
};
