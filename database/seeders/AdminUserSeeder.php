<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Crée les comptes utilisateurs initiaux (admin, caissier, laveur).
     *
     * Passwords and PINs are read from environment variables so that no
     * credentials are ever hard-coded in version-controlled files.
     *
     * Required environment variables (set in .env on the server):
     *   SEED_ADMIN_EMAIL    — defaults to admin@example.com
     *   SEED_ADMIN_PASSWORD — defaults to a random string (printed to console)
     *   SEED_ADMIN_PIN      — defaults to a random 4-digit number (printed to console)
     *
     * ⚠️  CHANGE all passwords and PINs immediately after the first deployment.
     */
    public function run(): void
    {
        // Charger les rôles RBAC (créés par RolesPermissionsSeeder)
        $roles = Role::pluck('id', 'name');

        // Generate random defaults when env vars are absent (first-install safety net).
        $adminPassword = env('SEED_ADMIN_PASSWORD') ?: Str::password(16);
        $adminPin      = env('SEED_ADMIN_PIN')      ?: (string) random_int(1000, 9999);

        $caissierPassword = env('SEED_CAISSIER_PASSWORD') ?: Str::password(16);
        $caissierPin      = env('SEED_CAISSIER_PIN')      ?: (string) random_int(1000, 9999);

        $laveurPassword = env('SEED_LAVEUR_PASSWORD') ?: Str::password(16);
        $laveurPin      = env('SEED_LAVEUR_PIN')      ?: (string) random_int(1000, 9999);

        $users = [
            [
                'name'      => 'Administrateur',
                'email'     => env('SEED_ADMIN_EMAIL', 'admin@example.com'),
                'password'  => Hash::make($adminPassword),
                'role'      => 'admin',
                'role_id'   => $roles['admin'] ?? null,
                'pin'       => Hash::make($adminPin),
                'phone'     => '0600000001',
                'is_active' => true,
                '_label'    => 'Admin',
                '_password' => $adminPassword,
                '_pin'      => $adminPin,
            ],
            [
                'name'      => 'Caissier Démo',
                'email'     => env('SEED_CAISSIER_EMAIL', 'caissier@example.com'),
                'password'  => Hash::make($caissierPassword),
                'role'      => 'caissier',
                'role_id'   => $roles['caissier'] ?? null,
                'pin'       => Hash::make($caissierPin),
                'phone'     => '0600000002',
                'is_active' => true,
                '_label'    => 'Caissier',
                '_password' => $caissierPassword,
                '_pin'      => $caissierPin,
            ],
            [
                'name'      => 'Laveur Démo',
                'email'     => env('SEED_LAVEUR_EMAIL', 'laveur@example.com'),
                'password'  => Hash::make($laveurPassword),
                'role'      => 'laveur',
                'role_id'   => $roles['laveur'] ?? null,
                'pin'       => Hash::make($laveurPin),
                'phone'     => '0600000003',
                'is_active' => true,
                '_label'    => 'Laveur',
                '_password' => $laveurPassword,
                '_pin'      => $laveurPin,
            ],
        ];

        foreach ($users as $user) {
            $label    = $user['_label'];
            $password = $user['_password'];
            $pin      = $user['_pin'];

            $dbRow = array_diff_key($user, array_flip(['_label', '_password', '_pin']));

            DB::table('users')->updateOrInsert(
                ['email' => $dbRow['email']],
                array_merge($dbRow, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );

            // Only output credentials when running in non-production environments
            // or when the values were auto-generated (no env var set).
            if (! app()->isProduction() || ! env('SEED_ADMIN_PASSWORD')) {
                $this->command->warn("[$label] email={$dbRow['email']} password={$password} pin={$pin}");
            }
        }

        $this->command->info('⚠️  Change ALL passwords and PINs immediately after first login.');
    }
}
