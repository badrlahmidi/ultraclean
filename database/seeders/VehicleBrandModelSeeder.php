<?php

namespace Database\Seeders;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use Illuminate\Database\Seeder;

/**
 * Pré-popule les marques et modèles automobiles les plus courants au Maroc.
 * Les logo_path sont NULL par défaut — l'admin peut les uploader via l'interface.
 * Les suggested_vehicle_type_id pointent vers les slugs Citadine/SUV/Utilitaire.
 */
class VehicleBrandModelSeeder extends Seeder
{
    public function run(): void
    {
        // Récupérer les types de véhicules pour les suggestions
        $citadine   = VehicleType::where('slug', 'citadine')->first()?->id;
        $suv        = VehicleType::where('slug', 'suv')->first()?->id;
        $utilitaire = VehicleType::where('slug', 'utilitaire')->first()?->id;

        $catalogue = [
            [
                'name' => 'Dacia', 'slug' => 'dacia', 'country' => 'Roumanie', 'sort_order' => 1,
                'models' => [
                    ['name' => 'Sandero',     'slug' => 'sandero',     'type' => $citadine],
                    ['name' => 'Logan',       'slug' => 'logan',       'type' => $citadine],
                    ['name' => 'Duster',      'slug' => 'duster',      'type' => $suv],
                    ['name' => 'Lodgy',       'slug' => 'lodgy',       'type' => $utilitaire],
                    ['name' => 'Dokker',      'slug' => 'dokker',      'type' => $utilitaire],
                    ['name' => 'Spring',      'slug' => 'spring',      'type' => $citadine],
                ],
            ],
            [
                'name' => 'Peugeot', 'slug' => 'peugeot', 'country' => 'France', 'sort_order' => 2,
                'models' => [
                    ['name' => '208',  'slug' => '208',  'type' => $citadine],
                    ['name' => '308',  'slug' => '308',  'type' => $citadine],
                    ['name' => '3008', 'slug' => '3008', 'type' => $suv],
                    ['name' => '5008', 'slug' => '5008', 'type' => $suv],
                    ['name' => '2008', 'slug' => '2008', 'type' => $suv],
                    ['name' => 'Partner', 'slug' => 'partner', 'type' => $utilitaire],
                    ['name' => 'Expert', 'slug' => 'expert', 'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Renault', 'slug' => 'renault', 'country' => 'France', 'sort_order' => 3,
                'models' => [
                    ['name' => 'Clio',    'slug' => 'clio',    'type' => $citadine],
                    ['name' => 'Megane',  'slug' => 'megane',  'type' => $citadine],
                    ['name' => 'Captur',  'slug' => 'captur',  'type' => $suv],
                    ['name' => 'Kadjar',  'slug' => 'kadjar',  'type' => $suv],
                    ['name' => 'Koleos',  'slug' => 'koleos',  'type' => $suv],
                    ['name' => 'Kangoo',  'slug' => 'kangoo',  'type' => $utilitaire],
                    ['name' => 'Trafic',  'slug' => 'trafic',  'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Toyota', 'slug' => 'toyota', 'country' => 'Japon', 'sort_order' => 4,
                'models' => [
                    ['name' => 'Yaris',     'slug' => 'yaris',     'type' => $citadine],
                    ['name' => 'Corolla',   'slug' => 'corolla',   'type' => $citadine],
                    ['name' => 'RAV4',      'slug' => 'rav4',      'type' => $suv],
                    ['name' => 'Land Cruiser', 'slug' => 'land-cruiser', 'type' => $suv],
                    ['name' => 'Hilux',     'slug' => 'hilux',     'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Hyundai', 'slug' => 'hyundai', 'country' => 'Corée du Sud', 'sort_order' => 5,
                'models' => [
                    ['name' => 'i10',   'slug' => 'i10',   'type' => $citadine],
                    ['name' => 'i20',   'slug' => 'i20',   'type' => $citadine],
                    ['name' => 'i30',   'slug' => 'i30',   'type' => $citadine],
                    ['name' => 'Tucson', 'slug' => 'tucson', 'type' => $suv],
                    ['name' => 'Santa Fe', 'slug' => 'santa-fe', 'type' => $suv],
                ],
            ],
            [
                'name' => 'Kia', 'slug' => 'kia', 'country' => 'Corée du Sud', 'sort_order' => 6,
                'models' => [
                    ['name' => 'Picanto', 'slug' => 'picanto', 'type' => $citadine],
                    ['name' => 'Rio',     'slug' => 'rio',     'type' => $citadine],
                    ['name' => 'Cerato',  'slug' => 'cerato',  'type' => $citadine],
                    ['name' => 'Sportage', 'slug' => 'sportage', 'type' => $suv],
                    ['name' => 'Sorento',  'slug' => 'sorento',  'type' => $suv],
                ],
            ],
            [
                'name' => 'Volkswagen', 'slug' => 'volkswagen', 'country' => 'Allemagne', 'sort_order' => 7,
                'models' => [
                    ['name' => 'Polo',   'slug' => 'polo',   'type' => $citadine],
                    ['name' => 'Golf',   'slug' => 'golf',   'type' => $citadine],
                    ['name' => 'Passat', 'slug' => 'passat', 'type' => $citadine],
                    ['name' => 'Tiguan', 'slug' => 'tiguan', 'type' => $suv],
                    ['name' => 'Touareg','slug' => 'touareg','type' => $suv],
                    ['name' => 'Caddy',  'slug' => 'caddy',  'type' => $utilitaire],
                    ['name' => 'Transporter', 'slug' => 'transporter', 'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Mercedes-Benz', 'slug' => 'mercedes-benz', 'country' => 'Allemagne', 'sort_order' => 8,
                'models' => [
                    ['name' => 'Classe A', 'slug' => 'classe-a', 'type' => $citadine],
                    ['name' => 'Classe C', 'slug' => 'classe-c', 'type' => $citadine],
                    ['name' => 'Classe E', 'slug' => 'classe-e', 'type' => $citadine],
                    ['name' => 'GLC',      'slug' => 'glc',      'type' => $suv],
                    ['name' => 'GLE',      'slug' => 'gle',      'type' => $suv],
                    ['name' => 'Sprinter', 'slug' => 'sprinter', 'type' => $utilitaire],
                    ['name' => 'Vito',     'slug' => 'vito',     'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'BMW', 'slug' => 'bmw', 'country' => 'Allemagne', 'sort_order' => 9,
                'models' => [
                    ['name' => 'Série 1', 'slug' => 'serie-1', 'type' => $citadine],
                    ['name' => 'Série 3', 'slug' => 'serie-3', 'type' => $citadine],
                    ['name' => 'Série 5', 'slug' => 'serie-5', 'type' => $citadine],
                    ['name' => 'X3',      'slug' => 'x3',      'type' => $suv],
                    ['name' => 'X5',      'slug' => 'x5',      'type' => $suv],
                ],
            ],
            [
                'name' => 'Ford', 'slug' => 'ford', 'country' => 'États-Unis', 'sort_order' => 10,
                'models' => [
                    ['name' => 'Fiesta',  'slug' => 'fiesta',  'type' => $citadine],
                    ['name' => 'Focus',   'slug' => 'focus',   'type' => $citadine],
                    ['name' => 'Kuga',    'slug' => 'kuga',    'type' => $suv],
                    ['name' => 'Ranger',  'slug' => 'ranger',  'type' => $utilitaire],
                    ['name' => 'Transit', 'slug' => 'transit', 'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Citroën', 'slug' => 'citroen', 'country' => 'France', 'sort_order' => 11,
                'models' => [
                    ['name' => 'C3',        'slug' => 'c3',        'type' => $citadine],
                    ['name' => 'C4',        'slug' => 'c4',        'type' => $citadine],
                    ['name' => 'C5 Aircross','slug' => 'c5-aircross','type' => $suv],
                    ['name' => 'Berlingo',  'slug' => 'berlingo',  'type' => $utilitaire],
                    ['name' => 'Jumper',    'slug' => 'jumper',    'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Fiat', 'slug' => 'fiat', 'country' => 'Italie', 'sort_order' => 12,
                'models' => [
                    ['name' => 'Punto',   'slug' => 'punto',   'type' => $citadine],
                    ['name' => 'Tipo',    'slug' => 'tipo',    'type' => $citadine],
                    ['name' => 'Doblo',   'slug' => 'doblo',   'type' => $utilitaire],
                    ['name' => 'Ducato',  'slug' => 'ducato',  'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Nissan', 'slug' => 'nissan', 'country' => 'Japon', 'sort_order' => 13,
                'models' => [
                    ['name' => 'Micra',  'slug' => 'micra',  'type' => $citadine],
                    ['name' => 'Juke',   'slug' => 'juke',   'type' => $suv],
                    ['name' => 'Qashqai','slug' => 'qashqai','type' => $suv],
                    ['name' => 'X-Trail','slug' => 'x-trail','type' => $suv],
                    ['name' => 'Navara', 'slug' => 'navara', 'type' => $utilitaire],
                ],
            ],
            [
                'name' => 'Seat', 'slug' => 'seat', 'country' => 'Espagne', 'sort_order' => 14,
                'models' => [
                    ['name' => 'Ibiza',  'slug' => 'ibiza',  'type' => $citadine],
                    ['name' => 'Leon',   'slug' => 'leon',   'type' => $citadine],
                    ['name' => 'Ateca',  'slug' => 'ateca',  'type' => $suv],
                    ['name' => 'Tarraco','slug' => 'tarraco','type' => $suv],
                ],
            ],
            [
                'name' => 'Opel', 'slug' => 'opel', 'country' => 'Allemagne', 'sort_order' => 15,
                'models' => [
                    ['name' => 'Corsa',    'slug' => 'corsa',    'type' => $citadine],
                    ['name' => 'Astra',    'slug' => 'astra',    'type' => $citadine],
                    ['name' => 'Mokka',    'slug' => 'mokka',    'type' => $suv],
                    ['name' => 'Crossland','slug' => 'crossland','type' => $suv],
                    ['name' => 'Vivaro',   'slug' => 'vivaro',   'type' => $utilitaire],
                ],
            ],
        ];

        foreach ($catalogue as $brandData) {
            $brand = VehicleBrand::firstOrCreate(
                ['slug' => $brandData['slug']],
                [
                    'name'       => $brandData['name'],
                    'country'    => $brandData['country'],
                    'sort_order' => $brandData['sort_order'],
                    'is_active'  => true,
                ]
            );

            foreach ($brandData['models'] as $i => $modelData) {
                VehicleModel::firstOrCreate(
                    ['brand_id' => $brand->id, 'slug' => $modelData['slug']],
                    [
                        'name'                    => $modelData['name'],
                        'suggested_vehicle_type_id' => $modelData['type'],
                        'sort_order'              => $i,
                        'is_active'               => true,
                    ]
                );
            }
        }

        $this->command->info('✅ ' . VehicleBrand::count() . ' marques et ' . VehicleModel::count() . ' modèles chargés.');
    }
}
