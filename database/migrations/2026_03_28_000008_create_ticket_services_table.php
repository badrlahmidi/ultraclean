<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_services', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ticket_id')
                  ->constrained('tickets')
                  ->cascadeOnDelete()
                  ->comment('Suppression ticket = suppression des lignes');

            $table->foreignId('service_id')
                  ->constrained('services')
                  ->restrictOnDelete();

            // --- SNAPSHOT : on fige nom et prix au moment de la vente ---
            $table->string('service_name', 100)
                  ->comment('Snapshot du nom au moment de la vente');
            $table->unsignedInteger('unit_price_cents')
                  ->comment('Snapshot du prix unitaire en centimes MAD');

            $table->unsignedTinyInteger('quantity')->default(1);
            $table->unsignedInteger('discount_cents')->default(0);

            // line_total = (unit_price_cents * quantity) - discount_cents
            $table->unsignedInteger('line_total_cents');

            $table->timestamps();

            $table->index('ticket_id');
            $table->index('service_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_services');
    }
};
