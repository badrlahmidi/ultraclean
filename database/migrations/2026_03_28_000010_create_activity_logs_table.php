<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Journal d'audit — toutes les actions importantes sont tracées ici.
     * Exemples : ticket.status_changed, payment.processed, user.login
     * Jamais de suppression sur cette table (audit immuable).
     * Dépend de : users (nullable — action système possible sans user).
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            // Utilisateur auteur de l'action (NULL = action système/cron)
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('action', 100)
                  ->comment('Ex: ticket.status_changed, payment.processed, user.login');

            // Entité concernée (polymorphique simplifié)
            $table->string('subject_type', 100)->nullable()
                  ->comment('Ex: App\Models\Ticket');
            $table->unsignedBigInteger('subject_id')->nullable()
                  ->comment("ID de l'entité concernée");

            // Données contextuelles : avant/après, détails
            $table->json('properties')->nullable()
                  ->comment('Ex: {"before":{"status":"pending"},"after":{"status":"paid"}}');

            $table->string('ip_address', 45)->nullable();

            $table->timestamps();

            $table->index(['subject_type', 'subject_id'], 'idx_activity_subject');
            $table->index('user_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};