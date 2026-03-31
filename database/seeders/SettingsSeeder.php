<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingsSeeder extends Seeder
{
    /**
     * Valeurs par défaut de la configuration RitajPOS Lavage.
     * Stockage clé/valeur typé — modifiable via le panneau admin.
     */
    public function run(): void
    {
        $settings = [
            // ── Général ──────────────────────────────────────────────
            [
                'key'   => 'app.name',
                'value' => 'RitajPOS Lavage',
                'type'  => 'string',
                'group' => 'general',
                'label' => "Nom affiché de l'application",
            ],
            [
                'key'   => 'app.currency',
                'value' => 'MAD',
                'type'  => 'string',
                'group' => 'general',
                'label' => 'Code devise (ISO 4217)',
            ],
            [
                'key'   => 'app.timezone',
                'value' => 'Africa/Casablanca',
                'type'  => 'string',
                'group' => 'general',
                'label' => 'Fuseau horaire',
            ],

            // ── Caisse & Shifts ────────────────────────────────────
            [
                'key'   => 'shift.require_opening_cash',
                'value' => 'true',
                'type'  => 'boolean',
                'group' => 'shift',
                'label' => "Obliger la saisie du fond de caisse à l'ouverture",
            ],
            [
                'key'   => 'shift.alert_difference_cents',
                'value' => '5000',
                'type'  => 'integer',
                'group' => 'shift',
                'label' => 'Seuil alerte écart de caisse (centimes MAD) — 5000 = 50,00 MAD',
            ],

            // ── Tickets ────────────────────────────────────────────
            [
                'key'   => 'ticket.pending_alert_minutes',
                'value' => '20',
                'type'  => 'integer',
                'group' => 'ticket',
                'label' => 'Minutes avant alerte ticket en attente',
            ],
            [
                'key'   => 'ticket.auto_assign',
                'value' => 'false',
                'type'  => 'boolean',
                'group' => 'ticket',
                'label' => 'Assigner automatiquement un laveur à la création',
            ],

            // ── Fidélité (structure prête — feature inactive MVP) ──
            [
                'key'   => 'loyalty.enabled',
                'value' => 'false',
                'type'  => 'boolean',
                'group' => 'loyalty',
                'label' => 'Activer le programme de fidélité',
            ],
            [
                'key'   => 'loyalty.points_per_mad',
                'value' => '1',
                'type'  => 'integer',
                'group' => 'loyalty',
                'label' => 'Points gagnés par MAD dépensé',
            ],
            [
                'key'   => 'loyalty.silver_threshold',
                'value' => '1000',
                'type'  => 'integer',
                'group' => 'loyalty',
                'label' => 'Points requis pour niveau Silver',
            ],
            [
                'key'   => 'loyalty.gold_threshold',
                'value' => '5000',
                'type'  => 'integer',
                'group' => 'loyalty',
                'label' => 'Points requis pour niveau Gold',
            ],
            [
                'key'   => 'loyalty.silver_discount_percent',
                'value' => '5',
                'type'  => 'integer',
                'group' => 'loyalty',
                'label' => 'Remise Silver (%)',
            ],
            [
                'key'   => 'loyalty.gold_discount_percent',
                'value' => '10',
                'type'  => 'integer',
                'group' => 'loyalty',
                'label' => 'Remise Gold (%)',
            ],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
