<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sellable Product Movements — Track stock movements for sellable products
 *
 * Types:
 * - in: Purchase/receipt
 * - out: Sale or workshop use
 * - adjustment: Inventory correction
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellable_product_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sellable_product_id')
                  ->constrained('sellable_products')
                  ->cascadeOnDelete();

            $table->foreignId('ticket_id')
                  ->nullable()
                  ->constrained('tickets')
                  ->nullOnDelete();

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->enum('type', ['in', 'out', 'adjustment'])->comment('in=entrée, out=sortie, adjustment=correction');
            $table->decimal('quantity', 10, 2);
            $table->string('note', 255)->nullable();
            $table->string('reference', 100)->nullable()->comment('Référence achat/vente');
            $table->boolean('is_free')->default(false)->comment('True if workshop internal use');

            $table->timestamps();

            $table->index(['sellable_product_id', 'created_at']);
            $table->index('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sellable_product_movements');
    }
};
