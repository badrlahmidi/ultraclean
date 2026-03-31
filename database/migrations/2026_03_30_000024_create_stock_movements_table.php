<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_product_id')
                  ->constrained('stock_products')
                  ->cascadeOnDelete();
            $table->enum('type', ['in', 'out', 'adjustment'])
                  ->comment('in=entrée, out=sortie, adjustment=ajustement inventaire');
            $table->decimal('quantity', 10, 3);
            $table->text('note')->nullable();
            $table->string('reference', 100)->nullable()
                  ->comment('Ex: numéro de ticket, BL fournisseur');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->timestamps();

            $table->index(['stock_product_id', 'created_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
