<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Données de base (production) :
     *   php artisan db:seed
     *
     * Données de démo complètes (dev) :
     *   php artisan db:seed --class=DemoSeeder
     */
    public function run(): void
    {
        $this->call([
            SettingsSeeder::class,
            VehicleTypeSeeder::class,
            // Marques & Modèles — DOIT venir après VehicleTypeSeeder
            VehicleBrandModelSeeder::class,
            ServiceSeeder::class,
            AdminUserSeeder::class,
        ]);
    }
}
