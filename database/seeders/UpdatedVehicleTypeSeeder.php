<?php

namespace Database\Seeders;

use App\Models\VehicleType;
use Illuminate\Database\Seeder;

class UpdatedVehicleTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['slug' => 'petite',    'name' => 'Petite voiture',  'icon' => '🚗', 'sort_order' => 1],
            ['slug' => 'grande',    'name' => 'Grande voiture',   'icon' => '🚙', 'sort_order' => 2],
            ['slug' => 'suv',       'name' => '4×4 / SUV',        'icon' => '🚙', 'sort_order' => 3],
            ['slug' => 'monospace', 'name' => 'Monospace / Van',  'icon' => '🚐', 'sort_order' => 4],
            ['slug' => 'utilitaire','name' => 'Utilitaire',       'icon' => '🚚', 'sort_order' => 5],
            ['slug' => 'moto',      'name' => 'Moto / Scooter',   'icon' => '🏍', 'sort_order' => 6],
        ];

        foreach ($types as $type) {
            VehicleType::updateOrCreate(
                ['slug' => $type['slug']],
                [
                    'name'       => $type['name'],
                    'icon'       => $type['icon'],
                    'sort_order' => $type['sort_order'],
                    'is_active'  => true,
                ]
            );
        }

        // Désactiver les anciens slugs non reconnus
        VehicleType::whereNotIn('slug', array_column($types, 'slug'))->update(['is_active' => false]);
    }
}
