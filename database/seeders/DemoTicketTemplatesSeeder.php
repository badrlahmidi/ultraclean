<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use App\Models\Service;
use App\Models\TicketTemplate;
use App\Models\User;
use App\Models\VehicleType;

/**
 * DemoTicketTemplatesSeeder — 4 templates de tickets récurrents.
 *
 * Prérequis : DemoClientsSeeder, services & vehicle_types de base.
 */
class DemoTicketTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        // Nettoyage
        TicketTemplate::query()->forceDelete();

        // Données de référence
        $clients   = Client::pluck('id')->toArray();
        $services  = Service::pluck('id')->toArray();
        $vTypes    = VehicleType::pluck('id', 'slug')->toArray();
        $laveurs   = User::where('role', User::ROLE_LAVEUR)->where('is_active', true)->pluck('id')->toArray();

        if (empty($clients) || empty($services)) {
            $this->command->warn('⚠️  Clients ou services manquants, DemoTicketTemplatesSeeder ignoré.');
            return;
        }

        // Pick helper
        $pick = fn (array $arr) => $arr[array_rand($arr)];

        $templates = [
            [
                'label'                   => 'Lavage hebdo VIP — Fatima Benali',
                'client_id'               => Client::where('phone', '0661234502')->value('id') ?? $pick($clients),
                'vehicle_plate'           => 'B-98765-A',
                'vehicle_brand'           => 'Mercedes Classe C',
                'vehicle_type_id'         => $vTypes['berline'] ?? $vTypes['suv'] ?? $pick(array_values($vTypes)),
                'service_ids'             => array_slice($services, 0, 3), // 3 premiers services
                'estimated_duration'      => 60,
                'assigned_to_preference'  => $laveurs[0] ?? null,
                'recurrence_rule'         => '0 8 * * 1',      // Chaque lundi 8h
                'notes'                   => 'Client VIP — toujours le même laveur si dispo.',
                'is_active'               => true,
            ],
            [
                'label'                   => 'Nettoyage quotidien flotte — Rachid Chraibi',
                'client_id'               => Client::where('phone', '0661234505')->value('id') ?? $pick($clients),
                'vehicle_plate'           => 'H-55100-A',
                'vehicle_brand'           => 'Dacia Duster',
                'vehicle_type_id'         => $vTypes['suv'] ?? $pick(array_values($vTypes)),
                'service_ids'             => array_slice($services, 0, 1), // lavage simple
                'estimated_duration'      => 30,
                'assigned_to_preference'  => null,
                'recurrence_rule'         => '0 8 * * 1-5',    // Jours ouvrés 8h
                'notes'                   => 'Flotte entreprise — lavage express quotidien.',
                'is_active'               => true,
            ],
            [
                'label'                   => 'Polissage mensuel — Mohamed Alaoui',
                'client_id'               => Client::where('phone', '0661234501')->value('id') ?? $pick($clients),
                'vehicle_plate'           => 'A-12345-B',
                'vehicle_brand'           => 'Volkswagen Golf',
                'vehicle_type_id'         => $vTypes['citadine'] ?? $pick(array_values($vTypes)),
                'service_ids'             => count($services) >= 3 ? [$services[2]] : [$pick($services)],
                'estimated_duration'      => 90,
                'assigned_to_preference'  => $laveurs[1] ?? null,
                'recurrence_rule'         => '0 8 1 * *',      // 1er du mois 8h
                'notes'                   => 'Polissage + protection carrosserie mensuel.',
                'is_active'               => true,
            ],
            [
                'label'                   => '(Inactif) Bi-hebdo — Omar Kettani',
                'client_id'               => Client::where('phone', '0661234507')->value('id') ?? $pick($clients),
                'vehicle_plate'           => 'W-30221-A',
                'vehicle_brand'           => 'BMW X3',
                'vehicle_type_id'         => $vTypes['suv'] ?? $pick(array_values($vTypes)),
                'service_ids'             => array_slice($services, 0, 2),
                'estimated_duration'      => 45,
                'assigned_to_preference'  => null,
                'recurrence_rule'         => '0 9 * * 2,5',    // Mardi & vendredi 9h
                'notes'                   => 'Template suspendu temporairement.',
                'is_active'               => false,
            ],
        ];

        foreach ($templates as $data) {
            TicketTemplate::create($data);
        }

        $this->command->info('✅  ' . count($templates) . ' ticket templates créés');
    }
}
