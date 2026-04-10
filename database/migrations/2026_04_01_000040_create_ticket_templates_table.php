<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ticket_templates — templates de tickets récurrents.
 *
 * Permet de créer automatiquement un ticket selon un planning cron
 * (ex : lavage flotte tous les lundis à 8h).
 * Le Job GenerateRecurringTickets lit next_run_at pour déclencher.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_templates', function (Blueprint $table) {
            $table->id();

            // Client & véhicule cibles
            $table->foreignId('client_id')
                  ->constrained()->cascadeOnDelete();
            $table->string('vehicle_plate', 20)->nullable();
            $table->string('vehicle_brand', 80)->nullable();
            $table->foreignId('vehicle_type_id')
                  ->nullable()
                  ->constrained()->nullOnDelete();

            // Services à inclure (tableau d'IDs)
            $table->json('service_ids')->nullable();

            // Durée estimée en minutes (calculée ou forcée)
            $table->unsignedSmallInteger('estimated_duration')->default(30);

            // Laveur préféré (hint pour le scheduler, pas contrainte forte)
            $table->foreignId('assigned_to_preference')
                  ->nullable()
                  ->references('id')->on('users')->nullOnDelete();

            // Récurrence exprimée en cron string (ex: "0 8 * * 1" = lundi 8h)
            $table->string('recurrence_rule', 100)->default('0 8 * * 1');

            // Libellé affiché en front
            $table->string('label', 150)->nullable();
            $table->text('notes')->nullable();

            // Activation / désactivation sans suppression
            $table->boolean('is_active')->default(true);

            // Prochaine exécution planifiée (mis à jour après chaque run)
            $table->timestamp('next_run_at')->nullable()->index();

            // Dernière exécution (pour log/debug)
            $table->timestamp('last_run_at')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_templates');
    }
};
