<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Client;
use App\Models\Service;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\TicketService;
use App\Models\Payment;
use App\Models\VehicleType;
use Illuminate\Support\Str;

class DemoTicketsSeeder extends Seeder
{
    /**
     * Génère ~60 tickets réalistes sur les 30 derniers jours.
     * Chaque ticket a : shift, services, paiement (pour les paid).
     */
    public function run(): void
    {
        // Truncate demo data cleanly (keep base data)
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('payments')->truncate();
        DB::table('ticket_services')->truncate();
        DB::table('tickets')->truncate();
        DB::table('shifts')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Reset client visit counters
        Client::query()->update(['total_visits' => 0, 'total_spent_cents' => 0]);
        $caissiers = User::where('role', 'caissier')->pluck('id')->toArray();
        $laveurs   = User::where('role', 'laveur')->pluck('id')->toArray();
        $clients   = Client::pluck('id')->toArray();
        $vTypes    = VehicleType::pluck('id', 'slug')->toArray();
        $services  = Service::with('prices')->get();

        if (empty($caissiers) || empty($laveurs) || empty($vTypes)) {
            $this->command->warn('⚠️  Données de base manquantes — lancez d\'abord les autres seeders.');
            return;
        }

        $plates = [
            'A-12345-B', 'B-56789-A', 'D-11223-C', 'H-44567-B', 'A-99001-C',
            'W-30221-A', 'G-12003-B', 'E-88432-B', 'B-66543-A', 'A-34500-C',
            'A-77010-C', 'H-55100-A', 'D-44321-C', 'A-99001-B', 'B-98765-A',
        ];
        $brands = ['Dacia', 'Renault', 'Peugeot', 'Toyota', 'Hyundai', 'Kia', 'Ford', 'Citroën', 'VW', 'BMW'];

        $statuses = ['paid', 'paid', 'paid', 'paid', 'paid', 'completed', 'in_progress', 'pending', 'cancelled'];
        $vTypeSlugs = array_keys($vTypes);
        $methods = ['cash', 'cash', 'cash', 'card', 'mobile'];

        $ticketCount = 0;

        for ($dayOffset = 29; $dayOffset >= 0; $dayOffset--) {
            $date = Carbon::now()->subDays($dayOffset)->setTime(8, 0, 0);
            $ticketsPerDay = rand(1, 5);

            // Créer un shift pour ce jour (1 par caissier aléatoire)
            $caissier = $caissiers[array_rand($caissiers)];
            $shiftOpen = $date->copy()->setTime(8, 0, 0);
            $shiftClose = $date->copy()->setTime(20, 0, 0);

            $shift = Shift::create([
                'user_id'             => $caissier,
                'opened_at'           => $shiftOpen,
                'closed_at'           => $dayOffset > 0 ? $shiftClose : null,
                'opening_cash_cents'  => rand(20, 50) * 1000,
                'closing_cash_cents'  => rand(100, 300) * 1000,
                'expected_cash_cents' => rand(100, 300) * 1000,
                'difference_cents'    => rand(-500, 500),
                'created_at'          => $shiftOpen,
                'updated_at'          => $shiftOpen,
            ]);

            for ($t = 0; $t < $ticketsPerDay; $t++) {
                $createdAt = $date->copy()->addMinutes(rand(10, 600));
                $status    = $statuses[array_rand($statuses)];
                $vTypeSlug = $vTypeSlugs[array_rand($vTypeSlugs)];
                $vTypeId   = $vTypes[$vTypeSlug];
                $laveur    = $laveurs[array_rand($laveurs)];
                $clientId  = rand(0, 3) > 0 ? $clients[array_rand($clients)] : null;
                $plate     = $plates[array_rand($plates)];
                $brand     = $brands[array_rand($brands)];

                // Sélectionner 1 ou 2 services applicables
                $applicableServices = $services->filter(function ($svc) use ($vTypeId) {
                    return $svc->prices->where('vehicle_type_id', $vTypeId)->isNotEmpty();
                })->shuffle()->take(rand(1, 2));

                if ($applicableServices->isEmpty()) continue;

                // Calculer les totaux
                $subtotal = 0;
                $serviceLines = [];
                foreach ($applicableServices as $svc) {
                    $price = $svc->prices->where('vehicle_type_id', $vTypeId)->first()->price_cents ?? 0;
                    $serviceLines[] = ['service' => $svc, 'price' => $price];
                    $subtotal += $price;
                }

                $ticketNumber = sprintf('TK-%s-%04d', $date->format('Ymd'), $t + 1);

                // Timestamps métier
                $startedAt    = null;
                $completedAt  = null;
                $paidAt       = null;

                if (in_array($status, ['in_progress', 'completed', 'paid'])) {
                    $startedAt = $createdAt->copy()->addMinutes(rand(2, 10));
                }
                if (in_array($status, ['completed', 'paid'])) {
                    $duration  = $applicableServices->sum('duration_minutes') + rand(-5, 10);
                    $completedAt = $startedAt->copy()->addMinutes(max(5, $duration));
                }
                if ($status === 'paid') {
                    $paidAt = $completedAt->copy()->addMinutes(rand(1, 5));
                }

                $ticket = Ticket::create([
                    'ulid'           => (string) Str::ulid(),
                    'ticket_number'  => $ticketNumber,
                    'status'         => $status,
                    'vehicle_type_id'=> $vTypeId,
                    'vehicle_plate'  => $plate,
                    'vehicle_brand'  => $brand,
                    'client_id'      => $clientId,
                    'created_by'     => $caissier,
                    'assigned_to'    => $laveur,
                    'paid_by'        => $status === 'paid' ? $caissier : null,
                    'shift_id'       => $shift->id,
                    'subtotal_cents' => $subtotal,
                    'discount_cents' => 0,
                    'total_cents'    => $subtotal,
                    'started_at'     => $startedAt,
                    'completed_at'   => $completedAt,
                    'paid_at'        => $paidAt,
                    'created_at'     => $createdAt,
                    'updated_at'     => $paidAt ?? $completedAt ?? $startedAt ?? $createdAt,
                ]);

                // Lignes de services
                foreach ($serviceLines as $line) {
                    TicketService::create([
                        'ticket_id'          => $ticket->id,
                        'service_id'         => $line['service']->id,
                        'service_name'       => $line['service']->name,
                        'unit_price_cents'   => $line['price'],
                        'quantity'           => 1,
                        'discount_cents'     => 0,
                        'line_total_cents'   => $line['price'],
                        'created_at'         => $createdAt,
                        'updated_at'         => $createdAt,
                    ]);
                }

                // Paiement pour tickets paid
                if ($status === 'paid') {
                    $method = $methods[array_rand($methods)];
                    Payment::create([
                        'ticket_id'           => $ticket->id,
                        'processed_by'        => $caissier,
                        'method'              => $method,
                        'amount_cents'        => $subtotal,
                        'amount_cash_cents'   => $method === 'cash' ? $subtotal : 0,
                        'amount_card_cents'   => $method === 'card' ? $subtotal : 0,
                        'amount_mobile_cents' => $method === 'mobile' ? $subtotal : 0,
                        'change_given_cents'  => 0,
                        'created_at'          => $paidAt,
                        'updated_at'          => $paidAt,
                    ]);

                    // Mettre à jour les stats client si associé
                    if ($clientId) {
                        Client::where('id', $clientId)->increment('total_visits');
                        Client::where('id', $clientId)->increment('total_spent_cents', $subtotal);
                        Client::where('id', $clientId)->update(['last_visit_date' => $paidAt->toDateString()]);
                    }
                }

                $ticketCount++;
            }
        }

        $this->command->info("✅  {$ticketCount} tickets créés sur 30 jours");
    }
}
