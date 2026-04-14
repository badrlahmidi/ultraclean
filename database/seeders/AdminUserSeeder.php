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
     * Passwords and PINs are read from config/seeding.php (which reads from
     * environment variables) so that no credentials are ever hard-coded in
     * version-controlled files.
     *
     * Required .env variables (set BEFORE running db:seed, delete after):
     *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_PIN
     *   SEED_CAISSIER_EMAIL, SEED_CAISSIER_PASSWORD, SEED_CAISSIER_PIN
     *   SEED_LAVEUR_EMAIL,   SEED_LAVEUR_PASSWORD,   SEED_LAVEUR_PIN
     *
     * When a password/PIN env var is absent a secure random value is generated
     * and printed to the console so you can log in for the first time.
     *
     * ⚠️  CHANGE all passwords and PINs immediately after the first deployment.
     */
    public function run(): void
    {
        // Charger les rôles RBAC (créés par RolesPermissionsSeeder)
        $roles = Role::pluck('id', 'name');

        // Resolve seed values via config (safe with cached config).
        $adminPassword = config('seeding.admin_password') ?: Str::password(16);
        $adminPin      = config('seeding.admin_pin')      ?: (string) random_int(1000, 9999);

        $caissierPassword = config('seeding.caissier_password') ?: Str::password(16);
        $caissierPin      = config('seeding.caissier_pin')      ?: (string) random_int(1000, 9999);

        $laveurPassword = config('seeding.laveur_password') ?: Str::password(16);
        $laveurPin      = config('seeding.laveur_pin')      ?: (string) random_int(1000, 9999);

        $users = [
            [
                'name'      => 'Administrateur',
                'email'     => config('seeding.admin_email'),
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
                'email'     => config('seeding.caissier_email'),
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
                'email'     => config('seeding.laveur_email'),
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

            // Only reveal credentials when running outside production or when
            // they were auto-generated (no SEED_* env var was provided).
            // Use explicit config keys to avoid coupling to the _label field value.
            $configKey = match ($label) {
                'Admin'    => 'seeding.admin_password',
                'Caissier' => 'seeding.caissier_password',
                'Laveur'   => 'seeding.laveur_password',
                default    => null,
            };
            if (! app()->isProduction() || ($configKey && ! config($configKey))) {
                $this->command->warn("[$label] email={$dbRow['email']} password={$password} pin={$pin}");
            }
        }

        $this->command->info('⚠️  Change ALL passwords and PINs immediately after first login.');
    }
}
