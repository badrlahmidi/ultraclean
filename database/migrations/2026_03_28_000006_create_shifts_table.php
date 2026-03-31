<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->unsignedInteger('opening_cash_cents')->default(0);
            $table->unsignedInteger('closing_cash_cents')->default(0);
            $table->unsignedInteger('expected_cash_cents')->default(0);
            $table->integer('difference_cents')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'closed_at']);
            $table->index('opened_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
