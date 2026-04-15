<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Inserts the POS (Point de Vente) permissions into the `permissions` table.
 *
 * Permissions:
 *   - pos.access  — Access the POS page (create/list sales) — for caissier role
 *   - pos.manage  — Admin-level POS access (cancel, reports) — for admin role
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('permissions')->insertOrIgnore([
            [
                'name'         => 'pos.access',
                'display_name' => 'Accès Point de Vente',
                'group'        => 'pos',
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'name'         => 'pos.manage',
                'display_name' => 'Gérer le Point de Vente (admin)',
                'group'        => 'pos',
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
        ]);
    }

    public function down(): void
    {
        DB::table('permissions')
            ->whereIn('name', ['pos.access', 'pos.manage'])
            ->delete();
    }
};
