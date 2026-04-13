<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Crée le compte administrateur initial.
     * ⚠️  CHANGER le mot de passe après le premier déploiement !
     *
     * Credentials de démo (centre Ultra Clean) :
     *   Admin   : admin@ritajpos.ma     / Admin@2026!
     *   Caissier: caissier@ritajpos.ma  / Caissier@2026
     *   Laveur  : laveur@ritajpos.ma    / Laveur@2026
     */
    public function run(): void
    {
        // Charger les rôles RBAC (créés par RolesPermissionsSeeder)
        $roles = Role::pluck('id', 'name');

        $users = [
            [
                'name'      => 'Administrateur',
                'email'     => 'admin@ritajpos.ma',
                'password'  => Hash::make('Admin@2026!'),
                'role'      => 'admin',
                'role_id'   => $roles['admin'] ?? null,
                'pin'       => Hash::make('1234'),
                'phone'     => '0600000001',
                'is_active' => true,
            ],
            [
                'name'      => 'Caissier Démo',
                'email'     => 'caissier@ritajpos.ma',
                'password'  => Hash::make('Caissier@2026'),
                'role'      => 'caissier',
                'role_id'   => $roles['caissier'] ?? null,
                'pin'       => Hash::make('2222'),
                'phone'     => '0600000002',
                'is_active' => true,
            ],
            [
                'name'      => 'Laveur Démo',
                'email'     => 'laveur@ritajpos.ma',
                'password'  => Hash::make('Laveur@2026'),
                'role'      => 'laveur',
                'role_id'   => $roles['laveur'] ?? null,
                'pin'       => Hash::make('3333'),
                'phone'     => '0600000003',
                'is_active' => true,
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                array_merge($user, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
