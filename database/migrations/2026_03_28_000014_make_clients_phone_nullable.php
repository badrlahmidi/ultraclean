<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Le téléphone client n'est pas obligatoire (client de passage).
     * On rend la colonne nullable tout en conservant l'unicité.
     * MySQL autorise plusieurs NULLs dans une colonne UNIQUE.
     */    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique('clients_phone_unique');
            $table->string('phone', 20)->nullable()->change();
            $table->unique('phone');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('phone', 20)->nullable(false)->change();
        });
    }
};
