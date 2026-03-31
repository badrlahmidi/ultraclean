<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajoute le regroupement par catégorie sur les services.
     *
     * Choix d'un VARCHAR plutôt qu'une table service_categories normalisée :
     * — Le nombre de catégories est faible et stable (Lavage, Esthétique, etc.)
     * — Permet un groupBy('category') direct en PHP et JS sans JOIN
     * — Une migration future pourra normaliser si nécessaire
     *
     * Exemples de valeurs attendues :
     *   'Lavage', 'Esthétique', 'Mécanique', 'Détailing', 'Autre'
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('category', 60)
                  ->nullable()
                  ->default('Lavage')
                  ->after('sort_order')
                  ->comment('Groupe d\'affichage UI — ex: Lavage, Esthétique, Détailing');

            // Index pour le groupBy dans le formulaire de réception
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });
    }
};
