<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use App\Models\VehicleType;

class DemoClientsSeeder extends Seeder
{
    public function run(): void
    {
        $citadineId = VehicleType::where('slug', 'citadine')->value('id');
        $suvId      = VehicleType::where('slug', 'suv')->value('id');

        $clients = [
            ['name' => 'Mohamed Alaoui',    'phone' => '0661234501', 'email' => 'm.alaoui@gmail.com',    'vehicle_plate' => 'A-12345-B',  'preferred_vehicle_type_id' => $citadineId, 'loyalty_points' => 320,  'total_visits' => 18, 'total_spent_cents' => 189000,  'loyalty_tier' => 'silver'],
            ['name' => 'Fatima Benali',     'phone' => '0661234502', 'email' => null,                    'vehicle_plate' => 'B-98765-A',  'preferred_vehicle_type_id' => $suvId,      'loyalty_points' => 850,  'total_visits' => 42, 'total_spent_cents' => 532000,  'loyalty_tier' => 'gold'],
            ['name' => 'Ahmed Tazi',        'phone' => '0661234503', 'email' => 'a.tazi@hotmail.com',    'vehicle_plate' => 'D-44321-C',  'preferred_vehicle_type_id' => $suvId,      'loyalty_points' => 120,  'total_visits' => 8,  'total_spent_cents' => 78000,   'loyalty_tier' => 'standard'],
            ['name' => 'Nadia Berrada',     'phone' => '0661234504', 'email' => null,                    'vehicle_plate' => 'A-77010-C',  'preferred_vehicle_type_id' => $citadineId, 'loyalty_points' => 45,   'total_visits' => 4,  'total_spent_cents' => 28000,   'loyalty_tier' => 'standard'],
            ['name' => 'Rachid Chraibi',    'phone' => '0661234505', 'email' => 'r.chraibi@yahoo.fr',    'vehicle_plate' => 'H-55100-A',  'preferred_vehicle_type_id' => $citadineId, 'loyalty_points' => 680,  'total_visits' => 31, 'total_spent_cents' => 341000,  'loyalty_tier' => 'gold'],
            ['name' => 'Zineb Mansouri',    'phone' => '0661234506', 'email' => null,                    'vehicle_plate' => null,          'preferred_vehicle_type_id' => null,        'loyalty_points' => 0,    'total_visits' => 1,  'total_spent_cents' => 7000,    'loyalty_tier' => 'standard'],
            ['name' => 'Omar Kettani',      'phone' => '0661234507', 'email' => 'o.kettani@gmail.com',   'vehicle_plate' => 'W-30221-A',  'preferred_vehicle_type_id' => $suvId,      'loyalty_points' => 215,  'total_visits' => 14, 'total_spent_cents' => 182000,  'loyalty_tier' => 'silver'],
            ['name' => 'Sara El Fassi',     'phone' => '0661234508', 'email' => null,                    'vehicle_plate' => 'A-99001-B',  'preferred_vehicle_type_id' => $citadineId, 'loyalty_points' => 90,   'total_visits' => 6,  'total_spent_cents' => 54000,   'loyalty_tier' => 'standard'],
            ['name' => 'Karim Bensouda',    'phone' => '0661234509', 'email' => 'karim.b@outlook.com',   'vehicle_plate' => 'G-12003-B',  'preferred_vehicle_type_id' => $suvId,      'loyalty_points' => 430,  'total_visits' => 22, 'total_spent_cents' => 276000,  'loyalty_tier' => 'silver'],
            ['name' => 'Laila Ouazzani',    'phone' => '0661234510', 'email' => null,                    'vehicle_plate' => 'B-66543-A',  'preferred_vehicle_type_id' => $citadineId, 'loyalty_points' => 155,  'total_visits' => 11, 'total_spent_cents' => 121000,  'loyalty_tier' => 'silver'],
            ['name' => 'Yassir Filali',     'phone' => '0661234511', 'email' => null,                    'vehicle_plate' => 'A-34500-C',  'preferred_vehicle_type_id' => $suvId,      'loyalty_points' => 22,   'total_visits' => 2,  'total_spent_cents' => 20000,   'loyalty_tier' => 'standard'],
            ['name' => 'Houda Rhazali',     'phone' => '0661234512', 'email' => 'houda.r@gmail.com',     'vehicle_plate' => 'E-88432-B',  'preferred_vehicle_type_id' => $citadineId, 'loyalty_points' => 0,    'total_visits' => 1,  'total_spent_cents' => 3000,    'loyalty_tier' => 'standard'],
        ];

        foreach ($clients as $c) {
            Client::updateOrCreate(
                ['phone' => $c['phone']],
                array_merge($c, [
                    'last_visit_date' => now()->subDays(rand(1, 30))->toDateString(),
                    'is_active'       => true,
                ])
            );
        }

        $this->command->info('✅  ' . count($clients) . ' clients créés');
    }
}
