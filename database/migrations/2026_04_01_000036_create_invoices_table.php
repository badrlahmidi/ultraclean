<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();
            $table->string('invoice_number', 30)->unique();

            $table->foreignId('quote_id')->nullable()->constrained('quotes')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            // Statut — draft|issued|paid|partial|cancelled
            $table->string('status', 20)->default('draft');

            // Mode de règlement
            $table->string('payment_method', 30)->nullable(); // cash|card|wire|mixed

            // Snapshot facturation
            $table->string('billing_name')->nullable();
            $table->string('billing_address')->nullable();
            $table->string('billing_city')->nullable();
            $table->string('billing_zip')->nullable();
            $table->string('billing_ice')->nullable();

            // Montants
            $table->unsignedBigInteger('subtotal_cents')->default(0);
            $table->unsignedBigInteger('discount_cents')->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0.00);
            $table->unsignedBigInteger('tax_cents')->default(0);
            $table->unsignedBigInteger('total_cents')->default(0);
            $table->unsignedBigInteger('amount_paid_cents')->default(0);

            $table->text('notes')->nullable();
            $table->date('due_date')->nullable();

            // Timestamps métier
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('pdf_path')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'status']);
            $table->index('status');
            $table->index('quote_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
