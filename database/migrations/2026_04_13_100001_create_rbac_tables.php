<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration RBAC — Phase 1
 *
 * 1. Crée les tables `roles`, `permissions`, `role_permissions`
 * 2. Insère les 3 rôles système (admin, caissier, laveur)
 * 3. Ajoute `role_id` FK sur `users`
 * 4. Migre les données existantes (role string → role_id)
 * 5. Modifie la colonne `role` (enum → varchar) pour les rôles personnalisés
 *
 * BACKWARD COMPAT : la colonne `role` est conservée comme cache dénormalisé.
 * Tout le code existant qui lit `$user->role` continue de fonctionner.
 * `role_id` est la source de vérité ; `role` est synchronisé par le modèle.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Table roles ──────────────────────────────────────────────
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique()->comment('Clé technique (admin, caissier, laveur, …)');
            $table->string('display_name')->comment('Nom affiché dans l\'UI');
            $table->string('color', 30)->default('gray-500')->comment('Classe Tailwind bg-*');
            $table->boolean('is_system')->default(false)->comment('Rôle système — non supprimable');
            $table->timestamps();
        });

        // ─── 2. Table permissions ─────────────────────────────────────────
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique()->comment('Clé technique (tickets.view, …)');
            $table->string('display_name')->comment('Libellé affiché');
            $table->string('group', 50)->comment('Catégorie (tickets, clients, …)');
            $table->timestamps();
        });

        // ─── 3. Pivot role_permissions ────────────────────────────────────
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        // ─── 4. Insérer les rôles système ────────────────────────────────
        $now = now();
        DB::table('roles')->insert([
            ['name' => 'admin',    'display_name' => 'Administrateur', 'color' => 'purple-600', 'is_system' => true,  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'caissier', 'display_name' => 'Caissier',       'color' => 'blue-600',   'is_system' => true,  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'laveur',   'display_name' => 'Laveur',         'color' => 'green-600',  'is_system' => true,  'created_at' => $now, 'updated_at' => $now],
        ]);

        // ─── 5. Ajouter role_id sur users ────────────────────────────────
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('role')->constrained('roles')->nullOnDelete();
            $table->index('role_id');
        });

        // ─── 6. Migrer les données : role string → role_id ───────────────
        $roles = DB::table('roles')->pluck('id', 'name'); // ['admin' => 1, ...]

        foreach ($roles as $name => $id) {
            DB::table('users')
                ->where('role', $name)
                ->update(['role_id' => $id]);
        }

        // Utilisateurs sans rôle connu → caissier par défaut
        $caissierRoleId = $roles['caissier'] ?? null;
        if ($caissierRoleId) {
            DB::table('users')
                ->whereNull('role_id')
                ->update(['role_id' => $caissierRoleId]);
        }

        // ─── 7. Changer l'enum `role` en varchar ─────────────────────────
        // Permet les rôles personnalisés sans modifier les migrations
        DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'caissier'");
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropIndex(['role_id']);
            $table->dropColumn('role_id');
        });

        // Restaurer l'enum original
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','caissier','laveur') NOT NULL DEFAULT 'caissier'");

        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
