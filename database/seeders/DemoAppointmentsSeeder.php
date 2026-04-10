<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\User;
use App\Models\VehicleType;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * DemoAppointmentsSeeder — 15 rendez-vous réalistes à différents stades.
 *
 * Prérequis : DemoUsersSeeder + DemoClientsSeeder doivent avoir tourné.
 */
class DemoAppointmentsSeeder extends Seeder
{
    public function run(): void
    {
        $clients  = Client::pluck('id')->toArray();
        $laveurs  = User::where('role', 'laveur')->pluck('id')->toArray();
        $admin    = User::where('role', 'admin')->first();
        $caissier = User::where('role', 'caissier')->first();
        $vTypes   = VehicleType::pluck('id')->toArray();

        if (empty($clients) || empty($laveurs)) {
            $this->command->warn('⚠️  Clients ou laveurs manquants — ignoré.');
            return;
        }

        $creator = $admin ?? $caissier;

        $now = Carbon::now('Africa/Casablanca');

        $appointments = [
            // ── Passés (completed / no_show / cancelled) ──
            [
                'scheduled_at' => $now->copy()->subDays(5)->setTime(9, 0),
                'status'       => 'completed',
                'source'       => 'phone',
                'vehicle_plate'=> 'A-12345-B',
                'vehicle_brand'=> 'Dacia',
                'duration'     => 30,
            ],
            [
                'scheduled_at' => $now->copy()->subDays(4)->setTime(10, 30),
                'status'       => 'completed',
                'source'       => 'whatsapp',
                'vehicle_plate'=> 'B-98765-A',
                'vehicle_brand'=> 'Renault',
                'duration'     => 45,
            ],
            [
                'scheduled_at' => $now->copy()->subDays(3)->setTime(14, 0),
                'status'       => 'no_show',
                'source'       => 'online',
                'vehicle_plate'=> 'D-44321-C',
                'vehicle_brand'=> 'Peugeot',
                'duration'     => 30,
            ],
            [
                'scheduled_at' => $now->copy()->subDays(2)->setTime(11, 0),
                'status'       => 'cancelled',
                'source'       => 'phone',
                'vehicle_plate'=> 'H-55100-A',
                'vehicle_brand'=> 'Toyota',
                'duration'     => 60,
                'cancelled_reason' => 'Client a reporté au mois prochain',
            ],
            [
                'scheduled_at' => $now->copy()->subDay()->setTime(9, 30),
                'status'       => 'completed',
                'source'       => 'walk_in',
                'vehicle_plate'=> 'A-77010-C',
                'vehicle_brand'=> 'Hyundai',
                'duration'     => 25,
            ],

            // ── Aujourd'hui (pending / confirmed / arrived / in_progress) ──
            [
                'scheduled_at' => $now->copy()->setTime(8, 30),
                'status'       => 'completed',
                'source'       => 'phone',
                'vehicle_plate'=> 'W-30221-A',
                'vehicle_brand'=> 'Kia',
                'duration'     => 30,
            ],
            [
                'scheduled_at' => $now->copy()->setTime(10, 0),
                'status'       => 'in_progress',
                'source'       => 'whatsapp',
                'vehicle_plate'=> 'G-12003-B',
                'vehicle_brand'=> 'Ford',
                'duration'     => 45,
            ],
            [
                'scheduled_at' => $now->copy()->setTime(11, 30),
                'status'       => 'arrived',
                'source'       => 'phone',
                'vehicle_plate'=> 'A-99001-B',
                'vehicle_brand'=> 'Citroën',
                'duration'     => 30,
            ],
            [
                'scheduled_at' => $now->copy()->setTime(14, 0),
                'status'       => 'confirmed',
                'source'       => 'online',
                'vehicle_plate'=> 'B-66543-A',
                'vehicle_brand'=> 'VW',
                'duration'     => 40,
            ],
            [
                'scheduled_at' => $now->copy()->setTime(15, 30),
                'status'       => 'confirmed',
                'source'       => 'admin',
                'vehicle_plate'=> 'A-34500-C',
                'vehicle_brand'=> 'BMW',
                'duration'     => 60,
            ],
            [
                'scheduled_at' => $now->copy()->setTime(16, 30),
                'status'       => 'pending',
                'source'       => 'whatsapp',
                'vehicle_plate'=> 'E-88432-B',
                'vehicle_brand'=> 'Dacia',
                'duration'     => 25,
            ],

            // ── Futurs (pending / confirmed) ──
            [
                'scheduled_at' => $now->copy()->addDay()->setTime(9, 0),
                'status'       => 'confirmed',
                'source'       => 'phone',
                'vehicle_plate'=> 'A-12345-B',
                'vehicle_brand'=> 'Dacia',
                'duration'     => 30,
            ],
            [
                'scheduled_at' => $now->copy()->addDay()->setTime(14, 0),
                'status'       => 'pending',
                'source'       => 'online',
                'vehicle_plate'=> 'H-44567-B',
                'vehicle_brand'=> 'Renault',
                'duration'     => 45,
            ],
            [
                'scheduled_at' => $now->copy()->addDays(2)->setTime(10, 0),
                'status'       => 'pending',
                'source'       => 'whatsapp',
                'vehicle_plate'=> 'D-11223-C',
                'vehicle_brand'=> 'Toyota',
                'duration'     => 35,
            ],
            [
                'scheduled_at' => $now->copy()->addDays(3)->setTime(11, 0),
                'status'       => 'pending',
                'source'       => 'phone',
                'vehicle_plate'=> 'A-99001-C',
                'vehicle_brand'=> 'Peugeot',
                'duration'     => 40,
            ],
        ];

        $created = 0;
        foreach ($appointments as $i => $appt) {
            Appointment::create([
                'ulid'               => (string) Str::ulid(),
                'client_id'          => $clients[array_rand($clients)],
                'assigned_to'        => $laveurs[array_rand($laveurs)],
                'created_by'         => $creator->id,
                'ticket_id'          => null,
                'scheduled_at'       => $appt['scheduled_at'],
                'confirmed_at'       => in_array($appt['status'], ['confirmed', 'arrived', 'in_progress', 'completed'])
                    ? $appt['scheduled_at']->copy()->subHours(rand(1, 24))
                    : null,
                'estimated_duration' => $appt['duration'],
                'vehicle_plate'      => $appt['vehicle_plate'],
                'vehicle_brand'      => $appt['vehicle_brand'],
                'vehicle_type_id'    => $vTypes[array_rand($vTypes)] ?? null,
                'notes'              => $i % 3 === 0 ? 'Lavage complet demandé' : null,
                'cancelled_reason'   => $appt['cancelled_reason'] ?? null,
                'status'             => $appt['status'],
                'source'             => $appt['source'],
            ]);
            $created++;
        }

        $this->command->info("✅  {$created} rendez-vous créés");
    }
}
