<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->comment('Nom du produit (ex: Shampoing carrosserie)');
            $table->text('description')->nullable();
            $table->enum('category', ['produit_chimique', 'consommable', 'outil', 'autre'])
                  ->default('produit_chimique');
            $table->string('unit', 30)->default('L')
                  ->comment('Unité: L, kg, unité, rouleau, bidon, carton');
            $table->decimal('current_quantity', 10, 3)->default(0)
                  ->comment('Quantité actuelle en stock');
            $table->decimal('min_quantity', 10, 3)->default(1)
                  ->comment('Seuil alerte stock bas');
            $table->unsignedInteger('cost_price_cents')->default(0)
                  ->comment('Prix d\'achat en centimes');
            $table->string('supplier', 150)->nullable();
            $table->string('sku', 50)->nullable()->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_products');
    }
};
