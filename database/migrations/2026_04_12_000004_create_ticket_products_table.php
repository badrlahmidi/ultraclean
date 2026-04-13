<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ticket Products — Products sold on a ticket (like TicketService but for products)
 *
 * Supports:
 * - Regular product sales
 * - Free products for workshop (atelier) internal use
 * - Snapshot pricing to preserve historical data
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_products', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ticket_id')
                  ->constrained('tickets')
                  ->cascadeOnDelete();

            $table->foreignId('sellable_product_id')
                  ->constrained('sellable_products')
                  ->restrictOnDelete();

            // Snapshot data at time of sale
            $table->string('product_name', 150)->comment('Snapshot du nom au moment de la vente');
            $table->unsignedInteger('unit_price_cents')->comment('Snapshot du prix unitaire');
            $table->decimal('quantity', 10, 2)->default(1);
            $table->unsignedInteger('discount_cents')->default(0);
            $table->unsignedInteger('line_total_cents');

            // Free product flag for workshop (atelier) internal use
            $table->boolean('is_free')->default(false)->comment('Gratuit pour usage atelier');

            $table->timestamps();

            $table->index('ticket_id');
            $table->index('sellable_product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_products');
    }
};
