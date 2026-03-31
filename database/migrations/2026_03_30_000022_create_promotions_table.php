<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique()->comment('Code promo (ex: ETE25)');
            $table->string('label', 100)->nullable()->comment('Description lisible');
            $table->enum('type', ['percent', 'fixed'])->default('percent')
                  ->comment('percent = %, fixed = MAD centimes');
            $table->unsignedInteger('value')->default(0)
                  ->comment('Valeur: 1000 = 10% ou 10 MAD (centimes)');
            $table->unsignedInteger('min_amount_cents')->default(0)
                  ->comment('Montant min du ticket pour appliquer');
            $table->unsignedInteger('max_uses')->nullable()
                  ->comment('Null = illimité');
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'valid_from', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
