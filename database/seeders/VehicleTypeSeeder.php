<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VehicleTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'name'       => 'Citadine / Berline',
                'slug'       => 'citadine',
                'icon'       => 'car',
                'sort_order' => 1,
                'is_active'  => true,
            ],
            [
                'name'       => 'SUV / 4x4',
                'slug'       => 'suv',
                'icon'       => 'car-front',
                'sort_order' => 2,
                'is_active'  => true,
            ],
            [
                'name'       => 'Utilitaire / Van',
                'slug'       => 'utilitaire',
                'icon'       => 'truck',
                'sort_order' => 3,
                'is_active'  => true,
            ],
            [
                'name'       => 'Moto / Scooter',
                'slug'       => 'moto',
                'icon'       => 'bike',
                'sort_order' => 4,
                'is_active'  => true,
            ],
        ];

        foreach ($types as $type) {
            DB::table('vehicle_types')->updateOrInsert(
                ['slug' => $type['slug']],
                array_merge($type, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
