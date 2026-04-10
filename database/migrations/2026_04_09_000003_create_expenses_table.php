<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            // Shift optionnel : dépense peut être enregistrée hors shift
            $table->foreignId('shift_id')
                  ->nullable()
                  ->constrained('shifts')
                  ->nullOnDelete();

            // Caissier qui enregistre la dépense
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // Montant en centimes (ex : 5000 = 50,00 MAD)
            $table->unsignedInteger('amount_cents');

            // Catégorie libre (carburant, fournitures, entretien, autre…)
            $table->string('category', 60)->default('autre');

            // Libellé descriptif
            $table->string('label', 255);

            // Mode de règlement de la dépense
            $table->string('paid_with', 30)->default('cash'); // cash | card | wire | mobile

            // Date effective de la dépense (peut différer du created_at)
            $table->date('date');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
