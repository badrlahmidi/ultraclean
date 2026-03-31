<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_stock_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')
                  ->constrained('services')
                  ->cascadeOnDelete();
            $table->foreignId('stock_product_id')
                  ->constrained('stock_products')
                  ->cascadeOnDelete();
            $table->decimal('quantity_per_use', 10, 3)->default(1)
                  ->comment('Quantité consommée par prestation');
            $table->timestamps();

            $table->unique(['service_id', 'stock_product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_stock_products');
    }
};
