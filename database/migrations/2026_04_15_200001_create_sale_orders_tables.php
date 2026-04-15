<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * POS — Point de Vente
 *
 * Crée trois tables :
 *   1. sale_daily_counters — compteur de séquence journalière pour VTE-YYYYMMDD-XXXX
 *   2. sale_orders         — en-tête d'une vente express (sans véhicule/laveur)
 *   3. sale_order_lines    — lignes de produits d'une vente
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Compteur journalier pour les numéros de vente ─────────────
        Schema::create('sale_daily_counters', function (Blueprint $table) {
            $table->date('date')->primary();
            $table->unsignedBigInteger('next_value')->default(1);
        });

        // ─── 2. Table sale_orders ─────────────────────────────────────────
        Schema::create('sale_orders', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique()->comment('URL-safe unique identifier');
            $table->string('sale_number', 25)->unique()->comment('Ex: VTE-20260415-0001');

            // Associations
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Totaux
            $table->unsignedBigInteger('subtotal_cents')->default(0);
            $table->string('discount_type', 10)->nullable()->comment('percent | fixed | null');
            $table->decimal('discount_value', 10, 2)->nullable();
            $table->unsignedBigInteger('discount_cents')->default(0);
            $table->unsignedBigInteger('total_cents')->default(0);

            // Paiement
            $table->string('payment_method', 20)->nullable()->comment('cash|card|mobile|wire|mixed');
            $table->string('payment_reference', 100)->nullable();

            // Statut simplifié
            $table->string('status', 20)->default('paid')->comment('paid | cancelled');

            // Divers
            $table->text('notes')->nullable();
            $table->string('cancelled_reason', 500)->nullable();

            // Horodatage
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Index de recherche fréquents
            $table->index('status');
            $table->index('created_by');
            $table->index('shift_id');
            $table->index(['created_at', 'status']);
        });

        // ─── 3. Table sale_order_lines ────────────────────────────────────
        Schema::create('sale_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sellable_product_id')->nullable()->constrained()->nullOnDelete();

            // Snapshots produit au moment de la vente
            $table->string('product_name', 150);
            $table->string('product_sku', 50)->nullable();

            // Tarification
            $table->unsignedBigInteger('unit_price_cents')->default(0);
            $table->decimal('quantity', 10, 2)->default(1);
            $table->unsignedBigInteger('discount_cents')->default(0);
            $table->unsignedBigInteger('line_total_cents')->default(0);
            $table->boolean('is_free')->default(false);

            $table->timestamps();

            $table->index('sale_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_order_lines');
        Schema::dropIfExists('sale_orders');
        Schema::dropIfExists('sale_daily_counters');
    }
};
