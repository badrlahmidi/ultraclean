<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sellable Products — Products that can be sold directly to customers
 * Distinct from StockProducts which are internal consumables for services.
 *
 * Features:
 * - Barcode for quick scanning
 * - Purchase and selling prices
 * - Alert threshold for low stock warnings
 * - Free option for workshop (atelier) internal use
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellable_products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->comment('Nom du produit');
            $table->string('barcode', 50)->nullable()->unique()->comment('Code-barres EAN/UPC');
            $table->text('description')->nullable();
            $table->unsignedInteger('purchase_price_cents')->default(0)->comment('Prix d\'achat en centimes');
            $table->unsignedInteger('selling_price_cents')->default(0)->comment('Prix de vente en centimes');
            $table->decimal('current_stock', 10, 2)->default(0)->comment('Quantité en stock actuelle');
            $table->decimal('alert_threshold', 10, 2)->default(5)->comment('Seuil alerte stock bas');
            $table->string('unit', 30)->default('unité')->comment('Unité de mesure');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'name']);
            $table->index('barcode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sellable_products');
    }
};
