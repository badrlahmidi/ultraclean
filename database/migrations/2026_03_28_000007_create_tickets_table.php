<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique()->comment('Identifiant public URL-safe (Str::ulid())');
            $table->string('ticket_number', 20)->unique()->comment('Ex: TK-20260328-0001');

            $table->enum('status', ['pending', 'in_progress', 'completed', 'paid', 'cancelled'])
                  ->default('pending');

            $table->foreignId('vehicle_type_id')->constrained('vehicle_types')->restrictOnDelete();
            $table->string('vehicle_plate', 20)->nullable();

            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete()
                  ->comment('Caissier créateur');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete()
                  ->comment('Laveur assigné');
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete()
                  ->comment('Caissier encaisseur');
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();

            // Montants en centimes MAD
            $table->unsignedInteger('subtotal_cents')->default(0);
            $table->unsignedInteger('discount_cents')->default(0);
            $table->unsignedInteger('total_cents')->default(0);

            // Fidélité (colonnes prêtes, inactives MVP)
            $table->unsignedInteger('loyalty_points_earned')->default(0);
            $table->unsignedInteger('loyalty_points_used')->default(0);

            $table->text('notes')->nullable();
            $table->string('cancelled_reason', 255)->nullable();

            // Timestamps métier
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Index performance (requêtes fréquentes)
            $table->index(['status', 'created_at']);
            $table->index(['shift_id', 'status']);
            $table->index(['assigned_to', 'status']);
            $table->index('vehicle_plate');
            $table->index('paid_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
