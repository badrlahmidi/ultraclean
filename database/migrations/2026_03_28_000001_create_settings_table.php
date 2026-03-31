<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Paramètres globaux de l'application — stockage clé/valeur typé.
     * Pas de FK → première migration après les tables système.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique()->comment('Clé unique — ex: app.name, loyalty.points_per_mad');
            $table->text('value')->nullable()->comment('Valeur sérialisée selon le type');
            $table->enum('type', ['string', 'integer', 'boolean', 'json'])->default('string');
            $table->string('group', 50)->default('general')->comment('general|fiscal|loyalty|display|shift');
            $table->string('label', 150)->nullable()->comment('Libellé lisible pour le panneau admin');
            $table->timestamps();

            $table->index('group');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
