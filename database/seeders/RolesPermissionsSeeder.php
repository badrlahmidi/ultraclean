<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Insère les permissions prédéfinies et les assigne aux 3 rôles système.
 *
 * Peut être re-exécuté sans problème (updateOrCreate).
 */
class RolesPermissionsSeeder extends Seeder
{
    /**
     * Toutes les permissions disponibles dans l'application.
     * Format : ['nom_technique' => ['display_name', 'group']]
     */
    private array $permissions = [
        // ── Tableau de bord ──────────────────────────────────────────────
        'admin.dashboard'       => ['Accès tableau de bord admin',         'dashboard'],
        'caissier.dashboard'    => ['Accès tableau de bord caisse',         'dashboard'],

        // ── Tickets ──────────────────────────────────────────────────────
        'tickets.view'          => ['Voir les tickets',                     'tickets'],
        'tickets.create'        => ['Créer des tickets',                    'tickets'],
        'tickets.update'        => ['Modifier des tickets',                 'tickets'],
        'tickets.pay'           => ['Encaisser des paiements',              'tickets'],
        'tickets.delete'        => ['Supprimer des tickets',                'tickets'],

        // ── Clients ──────────────────────────────────────────────────────
        'clients.view'          => ['Voir les clients',                     'clients'],
        'clients.create'        => ['Créer des clients',                    'clients'],
        'clients.update'        => ['Modifier des clients',                 'clients'],
        'clients.manage'        => ['Gestion complète des clients (admin)', 'clients'],

        // ── File d\'attente laveur ────────────────────────────────────────
        'queue.view'            => ['Voir la file d\'attente',              'laveur'],
        'queue.work'            => ['Travailler sur les tickets (laveur)',  'laveur'],
        'laveur.stats'          => ['Voir ses statistiques (laveur)',       'laveur'],

        // ── Caisse / Shifts ───────────────────────────────────────────────
        'shifts.manage'         => ['Gérer les shifts / caisse',            'shifts'],

        // ── Rendez-vous ──────────────────────────────────────────────────
        'admin.appointments'    => ['Gestion complète rendez-vous (admin)', 'appointments'],
        'caissier.appointments' => ['Voir et convertir les rendez-vous',    'appointments'],

        // ── Planning ─────────────────────────────────────────────────────
        'planning.view'         => ['Voir le planning des laveurs',         'planning'],

        // ── Promotions ───────────────────────────────────────────────────
        'promotions.view'       => ['Voir les promotions',                  'promotions'],

        // ── Devis & Factures ─────────────────────────────────────────────
        'quotes.manage'         => ['Gérer devis et factures',              'commercial'],

        // ── Stock ────────────────────────────────────────────────────────
        'stock.manage'          => ['Gérer le stock et les produits',       'stock'],

        // ── Rapports ─────────────────────────────────────────────────────
        'reports.view'          => ['Voir les rapports et exports',         'reports'],

        // ── Configuration ────────────────────────────────────────────────
        'settings.manage'       => ['Gérer les paramètres de l\'app',      'settings'],
        'users.manage'          => ['Gérer les utilisateurs',               'settings'],
        'roles.manage'          => ['Gérer les rôles et permissions',       'settings'],
    ];

    /**
     * Permissions attribuées à chaque rôle système.
     * admin = TOUT (via bypass dans hasPermission)
     */
    private array $rolePermissions = [
        'admin' => [
            'admin.dashboard',
            'tickets.view', 'tickets.create', 'tickets.update', 'tickets.pay', 'tickets.delete',
            'clients.view', 'clients.create', 'clients.update', 'clients.manage',
            'queue.view',
            'shifts.manage',
            'admin.appointments',
            'promotions.view',
            'quotes.manage',
            'stock.manage',
            'reports.view',
            'settings.manage', 'users.manage', 'roles.manage',
            'planning.view',
            'laveur.stats',
        ],
        'caissier' => [
            'caissier.dashboard',
            'tickets.view', 'tickets.create', 'tickets.update', 'tickets.pay',
            'clients.view', 'clients.create', 'clients.update',
            'queue.view',
            'shifts.manage',
            'caissier.appointments',
            'planning.view',
            'promotions.view',
        ],
        'laveur' => [
            'queue.view',
            'queue.work',
            'laveur.stats',
        ],
    ];

    public function run(): void
    {
        // ── 1. Créer / mettre à jour toutes les permissions ──────────────
        foreach ($this->permissions as $name => [$displayName, $group]) {
            Permission::updateOrCreate(
                ['name' => $name],
                ['display_name' => $displayName, 'group' => $group]
            );
        }

        $this->command->info('✅  ' . count($this->permissions) . ' permissions créées/mises à jour');

        // ── 2. Assigner les permissions aux rôles système ─────────────────
        foreach ($this->rolePermissions as $roleName => $permissionNames) {
            $role = Role::where('name', $roleName)->first();

            if (! $role) {
                $this->command->warn("⚠️  Rôle « {$roleName} » introuvable — ignoré");
                continue;
            }

            $permissionIds = Permission::whereIn('name', $permissionNames)->pluck('id');
            $role->permissions()->sync($permissionIds);

            $this->command->info("✅  {$role->display_name} : {$permissionIds->count()} permissions assignées");
        }
    }
}
