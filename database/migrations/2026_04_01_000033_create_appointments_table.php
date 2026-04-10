<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();

            // Participants
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');

            // Ticket créé lors de la conversion
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->nullOnDelete();

            // Planification
            $table->dateTime('scheduled_at');
            $table->dateTime('confirmed_at')->nullable();
            $table->unsignedSmallInteger('estimated_duration')->default(30); // minutes

            // Véhicule
            $table->string('vehicle_plate', 20)->nullable();
            $table->string('vehicle_brand', 80)->nullable();
            $table->foreignId('vehicle_brand_id')->nullable()->constrained('vehicle_brands')->nullOnDelete();
            $table->foreignId('vehicle_model_id')->nullable()->constrained('vehicle_models')->nullOnDelete();
            $table->foreignId('vehicle_type_id')->nullable()->constrained('vehicle_types')->nullOnDelete();

            // Informations
            $table->text('notes')->nullable();
            $table->string('cancelled_reason', 255)->nullable();

            // État
            $table->enum('status', [
                'pending',      // créé, en attente de confirmation
                'confirmed',    // confirmé par l'équipe ou le client
                'arrived',      // client arrivé sur place
                'in_progress',  // lavage en cours (ticket actif)
                'completed',    // terminé avec succès
                'cancelled',    // annulé
                'no_show',      // client ne s'est pas présenté
            ])->default('pending');

            // Source du RDV
            $table->enum('source', [
                'walk_in', 'phone', 'online', 'whatsapp', 'admin',
            ])->default('phone');

            $table->timestamps();
            $table->softDeletes();

            // Index pour les requêtes fréquentes
            $table->index('scheduled_at');
            $table->index(['assigned_to', 'scheduled_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
