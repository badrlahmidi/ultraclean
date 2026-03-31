<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceSeeder extends Seeder
{
    /**
     * Catalogue de services par défaut + grille de prix.
     * Tous les prix en centimes MAD.
     *
     * Grille tarifaire initiale :
     * ┌─────────────────────────┬──────────┬───────┬────────────┬──────┐
     * │ Service                 │ Citadine │ SUV   │ Utilitaire │ Moto │
     * ├─────────────────────────┼──────────┼───────┼────────────┼──────┤
     * │ Lavage extérieur        │   30 MAD │ 45 MAD│   60 MAD   │ 20 MAD│
     * │ Lavage complet          │   70 MAD │100 MAD│  130 MAD   │ 40 MAD│
     * │ Aspiration intérieure   │   20 MAD │ 30 MAD│   35 MAD   │  —   │
     * │ Lavage moteur           │   50 MAD │ 70 MAD│   90 MAD   │ 30 MAD│
     * │ Lustrage / Polish       │   80 MAD │120 MAD│  150 MAD   │  —   │
     * └─────────────────────────┴──────────┴───────┴────────────┴──────┘
     */
    public function run(): void
    {
        // Récupérer les IDs des types de véhicules
        $vt = DB::table('vehicle_types')->pluck('id', 'slug');

        $services = [
            [
                'name'             => 'Lavage Extérieur',
                'description'      => 'Lavage carrosserie, vitres et jantes',
                'color'            => '#3B82F6', // bleu
                'duration_minutes' => 15,
                'sort_order'       => 1,
                'prices'           => [
                    'citadine'   => 3000,
                    'suv'        => 4500,
                    'utilitaire' => 6000,
                    'moto'       => 2000,
                ],
            ],
            [
                'name'             => 'Lavage Complet',
                'description'      => 'Extérieur + aspiration + vitres intérieures',
                'color'            => '#8B5CF6', // violet
                'duration_minutes' => 30,
                'sort_order'       => 2,
                'prices'           => [
                    'citadine'   => 7000,
                    'suv'        => 10000,
                    'utilitaire' => 13000,
                    'moto'       => 4000,
                ],
            ],
            [
                'name'             => 'Aspiration Intérieure',
                'description'      => 'Aspiration sièges, tapis et coffre',
                'color'            => '#10B981', // vert
                'duration_minutes' => 15,
                'sort_order'       => 3,
                'prices'           => [
                    'citadine'   => 2000,
                    'suv'        => 3000,
                    'utilitaire' => 3500,
                    // Moto : non applicable
                ],
            ],
            [
                'name'             => 'Lavage Moteur',
                'description'      => 'Dégraissage et nettoyage du compartiment moteur',
                'color'            => '#F59E0B', // orange
                'duration_minutes' => 20,
                'sort_order'       => 4,
                'prices'           => [
                    'citadine'   => 5000,
                    'suv'        => 7000,
                    'utilitaire' => 9000,
                    'moto'       => 3000,
                ],
            ],
            [
                'name'             => 'Lustrage / Polish',
                'description'      => 'Polish carrosserie et protection brillance',
                'color'            => '#EC4899', // rose
                'duration_minutes' => 45,
                'sort_order'       => 5,
                'prices'           => [
                    'citadine'   => 8000,
                    'suv'        => 12000,
                    'utilitaire' => 15000,
                    // Moto : non applicable
                ],
            ],
        ];

        foreach ($services as $serviceData) {
            $prices = $serviceData['prices'];
            unset($serviceData['prices']);

            // Upsert du service
            $serviceId = DB::table('services')->updateOrInsert(
                ['name' => $serviceData['name']],
                array_merge($serviceData, [
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );

            // Récupérer l'ID (updateOrInsert ne retourne pas l'ID)
            $serviceId = DB::table('services')->where('name', $serviceData['name'])->value('id');

            // Upsert des prix par type de véhicule
            foreach ($prices as $slug => $priceCents) {
                if (isset($vt[$slug])) {
                    DB::table('service_vehicle_prices')->updateOrInsert(
                        [
                            'service_id'      => $serviceId,
                            'vehicle_type_id' => $vt[$slug],
                        ],
                        [
                            'price_cents' => $priceCents,
                            'created_at'  => now(),
                            'updated_at'  => now(),
                        ]
                    );
                }
            }
        }
    }
}
