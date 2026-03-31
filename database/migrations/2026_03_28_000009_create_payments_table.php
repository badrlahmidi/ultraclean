<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enregistrements de paiement — un paiement par ticket paid.
     * Gestion du paiement mixte (especes + carte + mobile).
     * Tous les montants en centimes MAD.
     * Depends de : tickets, users.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ticket_id')
                  ->constrained('tickets')
                  ->restrictOnDelete();

            $table->unsignedInteger('amount_cents')
                  ->comment('Montant total encaissé en centimes MAD');

            $table->enum('method', ['cash', 'card', 'mobile', 'mixed'])
                  ->comment('Méthode de paiement principale');

            // Détail du paiement mixte (tous en centimes MAD)
            $table->unsignedInteger('amount_cash_cents')->default(0);
            $table->unsignedInteger('amount_card_cents')->default(0);
            $table->unsignedInteger('amount_mobile_cents')->default(0);

            // Monnaie rendue au client (uniquement si espèces)
            $table->unsignedInteger('change_given_cents')->default(0)
                  ->comment('Monnaie rendue = montant_remis - total_dû');

            $table->string('reference', 100)->nullable()
                  ->comment('Référence TPE ou transaction mobile');

            $table->foreignId('processed_by')
                  ->constrained('users')
                  ->restrictOnDelete()
                  ->comment('Caissier ayant validé le paiement');

            $table->timestamps();

            $table->index('ticket_id');
            $table->index('processed_by');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
