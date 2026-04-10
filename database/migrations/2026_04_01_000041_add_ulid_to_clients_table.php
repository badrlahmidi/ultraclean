<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Ajoute un ULID unique sur la table clients.
 * Utilisé pour les URLs de checkin QR (évite d'exposer les IDs numériques).
 * Le ULID est généré pour tous les clients existants avant de passer non-nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Ajouter la colonne nullable
        Schema::table('clients', function (Blueprint $table) {
            $table->string('ulid', 26)->nullable()->unique()->after('id');
        });

        // 2. Remplir les lignes existantes
        DB::table('clients')->whereNull('ulid')->orderBy('id')->each(function ($row) {
            DB::table('clients')
                ->where('id', $row->id)
                ->update(['ulid' => (string) Str::ulid()]);
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('ulid');
        });
    }
};
