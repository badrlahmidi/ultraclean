<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ajouter le palier "platinum" à l'enum loyalty_tier
        DB::statement("ALTER TABLE clients MODIFY loyalty_tier ENUM('standard','silver','gold','platinum') NOT NULL DEFAULT 'standard'");

        // Historique des transactions fidélité
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', ['earned', 'redeemed', 'adjusted', 'expired']);
            $table->integer('points');          // positif = gain, négatif = utilisation
            $table->unsignedInteger('balance_after')->default(0);
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');
        DB::statement("ALTER TABLE clients MODIFY loyalty_tier ENUM('standard','silver','gold') NOT NULL DEFAULT 'standard'");
    }
};
