<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajoute le support Entreprise/Particulier sur la table clients.
     *
     * Règles métier :
     *  - is_company = false (Particulier) → ice DOIT être NULL
     *  - is_company = true  (Entreprise)  → ice DOIT être renseigné (15 chiffres ICE Maroc)
     *
     * La contrainte d'intégrité conditionnelle est appliquée au niveau
     * applicatif (FormRequest) et non en base pour rester compatible
     * MySQL 5.7 / Hostinger shared (pas de CHECK constraint).
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Type de client : particulier (défaut) ou entreprise
            $table->boolean('is_company')
                  ->default(false)
                  ->after('name')
                  ->comment('false = Particulier, true = Entreprise (ICE obligatoire)');

            // ICE = Identifiant Commun de l\'Entreprise (15 chiffres, Maroc)
            // NULL pour les particuliers, renseigné pour les entreprises.
            $table->string('ice', 15)
                  ->nullable()
                  ->unique()
                  ->after('is_company')
                  ->comment('Identifiant Commun de l\'Entreprise — 15 chiffres — NULL si particulier');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique(['ice']);
            $table->dropColumn(['is_company', 'ice']);
        });
    }
};
