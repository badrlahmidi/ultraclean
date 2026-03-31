<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DemoUsersSeeder extends Seeder
{
    /**
     * Crée l'équipe complète de démo :
     *  - 1 admin
     *  - 2 caissiers
     *  - 6 laveurs
     *
     * PINs : admin=1234 / caissiers=2222,3333 / laveurs=4001..4006
     */
    public function run(): void
    {
        $users = [
            // Admin
            ['name' => 'Youssef Admin',    'email' => 'admin@ultraclean.ma',    'role' => 'admin',    'pin' => '1234', 'phone' => '0600000001'],
            // Caissiers
            ['name' => 'Samira Caissière', 'email' => 'samira@ultraclean.ma',   'role' => 'caissier', 'pin' => '2222', 'phone' => '0600000002'],
            ['name' => 'Karim Caissier',   'email' => 'karim@ultraclean.ma',    'role' => 'caissier', 'pin' => '3333', 'phone' => '0600000003'],
            // Laveurs
            ['name' => 'Hassan Laveur',    'email' => 'hassan@ultraclean.ma',   'role' => 'laveur',   'pin' => '4001', 'phone' => '0600000004'],
            ['name' => 'Mehdi Laveur',     'email' => 'mehdi@ultraclean.ma',    'role' => 'laveur',   'pin' => '4002', 'phone' => '0600000005'],
            ['name' => 'Khalid Laveur',    'email' => 'khalid@ultraclean.ma',   'role' => 'laveur',   'pin' => '4003', 'phone' => '0600000006'],
            ['name' => 'Omar Laveur',      'email' => 'omar@ultraclean.ma',     'role' => 'laveur',   'pin' => '4004', 'phone' => '0600000007'],
            ['name' => 'Rachid Laveur',    'email' => 'rachid@ultraclean.ma',   'role' => 'laveur',   'pin' => '4005', 'phone' => '0600000008'],
            ['name' => 'Amine Laveur',     'email' => 'amine@ultraclean.ma',    'role' => 'laveur',   'pin' => '4006', 'phone' => '0600000009'],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name'      => $u['name'],
                    'role'      => $u['role'],
                    'password'  => Hash::make('Demo@2026!'),
                    'pin'       => Hash::make($u['pin']),
                    'phone'     => $u['phone'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('✅  ' . count($users) . ' utilisateurs créés (password: Demo@2026!)');
    }
}
