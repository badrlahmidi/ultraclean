<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{    public function up(): void
    {
        // duration_minutes existe déjà sur services (migration précédente)
        // On ajoute uniquement estimated_duration + due_at sur tickets
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedSmallInteger('estimated_duration')->nullable()
                  ->after('notes')
                  ->comment('Durée totale estimée en minutes (auto ou override)');
            $table->timestamp('due_at')->nullable()
                  ->after('estimated_duration')
                  ->comment('Heure de fin prévue = created_at + estimated_duration');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['estimated_duration', 'due_at']);
        });
    }
};
