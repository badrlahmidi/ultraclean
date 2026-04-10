<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ticket_washers — table pivot multi-laveur.
 *
 * Un ticket peut avoir plusieurs laveurs (1 lead + N assistants).
 * assigned_to reste le lead (compat ascendante) ; cette table
 * stocke les temps individuels pour les stats de performance.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_washers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')
                  ->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')
                  ->constrained()->cascadeOnDelete();

            // lead = laveur principal (correspond à assigned_to)
            // assistant = laveur supplémentaire
            $table->enum('role', ['lead', 'assistant'])->default('lead');

            // Timestamps individuels de travail effectif
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();

            // Un laveur ne peut apparaître qu'une seule fois par ticket
            $table->unique(['ticket_id', 'user_id']);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_washers');
    }
};
