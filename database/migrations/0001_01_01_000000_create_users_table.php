<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // Rôle fixe : 3 profils métier définis — pas de RBAC dynamique en MVP
            $table->enum('role', ['admin', 'caissier', 'laveur'])->default('caissier');

            // Connexion rapide tablette — PIN 4 chiffres haché bcrypt
            $table->string('pin')->nullable()->comment('PIN 4 chiffres haché — connexion rapide caisse');

            $table->string('phone', 20)->nullable();
            $table->boolean('is_active')->default(true)->comment('Désactiver sans supprimer');
            $table->timestamp('last_login_at')->nullable();
            $table->string('avatar')->nullable();

            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index('role');
            $table->index('is_active');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
