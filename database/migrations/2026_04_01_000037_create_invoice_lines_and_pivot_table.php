<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Lignes de facture ──────────────────────────────────────────────
        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();

            $table->string('description');
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->unsignedBigInteger('unit_price_cents')->default(0);
            $table->unsignedBigInteger('discount_cents')->default(0);

            // Calculé via saving event PHP
            $table->unsignedBigInteger('line_total_cents')->default(0);

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();
        });

        // ── Pivot facture ↔ tickets ────────────────────────────────────────
        Schema::create('invoice_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->unique(['invoice_id', 'ticket_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_tickets');
        Schema::dropIfExists('invoice_lines');
    }
};
