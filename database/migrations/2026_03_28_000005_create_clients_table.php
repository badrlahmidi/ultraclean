<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Clients enregistrés — optionnels sur le ticket (client de passage = NULL).
     * Contient les colonnes fidélité (structure prête, feature inactive en MVP).
     * Dépend de : vehicle_types.
     */
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();

            $table->string('name', 100)->comment('Nom complet du client');

            // Téléphone = identifiant principal de recherche rapide en caisse
            $table->string('phone', 20)->unique()->comment('Format Maroc : 06XXXXXXXX ou +212XXXXXXXXX');

            $table->string('email', 150)->nullable()->unique();
            $table->string('vehicle_plate', 20)->nullable()->comment('Plaque mémorisée — format libre');

            $table->foreignId('preferred_vehicle_type_id')
                  ->nullable()
                  ->constrained('vehicle_types')
                  ->nullOnDelete();

            // ── Fidélité (colonnes prêtes — feature inactive MVP) ─────────
            $table->enum('loyalty_tier', ['standard', 'silver', 'gold'])->default('standard');
            $table->unsignedInteger('loyalty_points')->default(0);
            $table->unsignedInteger('total_visits')->default(0);
            $table->unsignedBigInteger('total_spent_cents')->default(0)->comment('Agrégat en centimes MAD');
            $table->date('last_visit_date')->nullable();
            // ─────────────────────────────────────────────────────────────

            $table->text('notes')->nullable()->comment('Notes internes caissier');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('phone');
            $table->index('vehicle_plate');
            $table->index('loyalty_tier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
