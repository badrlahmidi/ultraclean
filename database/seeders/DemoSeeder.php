<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder de données de démo — NE PAS lancer en production.
 *
 * Usage :
 *   php artisan db:seed --class=DemoSeeder
 *
 * Prérequis : les seeders de base doivent déjà avoir tourné.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('🌱  Génération des données de démo UltraClean...');
        $this->command->info('');

        $this->call([
            RolesPermissionsSeeder::class,         // Rôles RBAC + permissions (DOIT précéder DemoUsersSeeder)
            DemoUsersSeeder::class,            // 9 utilisateurs (admin + 2 caissiers + 6 laveurs)
            DemoClientsSeeder::class,          // 12 clients avec historique fidélité
            DemoTicketsSeeder::class,          // ~60 tickets sur 30 jours
            DemoStockSeeder::class,            // 10 produits stock (3 en stock bas)
            DemoPromotionsSeeder::class,       // 4 codes promo
            DemoAppointmentsSeeder::class,     // 15 rendez-vous (passés, aujourd'hui, futurs)
            DemoQuotesInvoicesSeeder::class,   // 6 devis + 5 factures avec lignes
            DemoTicketTemplatesSeeder::class,  // 4 templates récurrents (3 actifs, 1 inactif)
        ]);

        $this->command->info('');
        $this->command->info('✅  Données de démo créées avec succès !');
        $this->command->info('');
        $this->command->table(
            ['Rôle', 'Email', 'Mot de passe', 'PIN'],
            [
                ['Admin',    'admin@ultraclean.ma',   'Demo@2026!', '1234'],
                ['Caissier', 'samira@ultraclean.ma',  'Demo@2026!', '2222'],
                ['Caissier', 'karim@ultraclean.ma',   'Demo@2026!', '3333'],
                ['Laveur',   'hassan@ultraclean.ma',  'Demo@2026!', '4001'],
                ['Laveur',   'mehdi@ultraclean.ma',   'Demo@2026!', '4002'],
                ['Laveur',   '...etc',                'Demo@2026!', '4003-6'],
            ]
        );
    }
}
