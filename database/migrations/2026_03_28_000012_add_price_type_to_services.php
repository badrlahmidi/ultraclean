<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // 'fixed' = un seul prix pour tout véhicule (base_price_cents)
            // 'variant' = prix différent par catégorie (service_vehicle_prices)
            $table->enum('price_type', ['fixed', 'variant'])
                  ->default('fixed')
                  ->after('sort_order')
                  ->comment('fixed = prix unique, variant = prix par catégorie taille');

            $table->unsignedInteger('base_price_cents')
                  ->nullable()
                  ->after('price_type')
                  ->comment('Prix fixe unique en centimes MAD (si price_type=fixed)');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['price_type', 'base_price_cents']);
        });
    }
};
