<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute la colonne `service_id` à la table `appointments`.
 *
 * Contexte : la page publique de réservation applique la règle métier
 * "un seul service par heure" — pour l'appliquer on doit lier chaque RDV
 * à un service précis (un RDV issu du front admin peut ne pas avoir
 * de service pré-choisi, d'où le caractère nullable).
 *
 * Ajoute aussi un guest_name + guest_phone pour les réservations publiques
 * sans compte client.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('service_id')
                ->nullable()
                ->after('ticket_id')
                ->constrained('services')
                ->nullOnDelete();

            // Coordonnées visiteur (pas de compte client requis pour le flux public)
            $table->string('guest_name', 120)->nullable()->after('notes');
            $table->string('guest_phone', 30)->nullable()->after('guest_name');
            $table->string('guest_email', 180)->nullable()->after('guest_phone');

            // Index pour la requête "conflit même service même créneau"
            $table->index(['service_id', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['service_id', 'scheduled_at']);
            $table->dropConstrainedForeignId('service_id');
            $table->dropColumn(['guest_name', 'guest_phone', 'guest_email']);
        });
    }
};
