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
            ],            [
                'key'   => 'loyalty.gold_discount_percent',
                'value' => '10',
                'type'  => 'integer',
                'group' => 'loyalty',
                'label' => 'Remise Gold (%)',
            ],

            // ── Commercial B2B (Devis / Factures) ────────────────────────
            [
                'key'   => 'default_tax_rate',
                'value' => '20',
                'type'  => 'float',
                'group' => 'fiscal',
                'label' => 'Taux de TVA par défaut (%)',
            ],
            [
                'key'   => 'invoice_due_days',
                'value' => '30',
                'type'  => 'integer',
                'group' => 'fiscal',
                'label' => "Délai d'échéance facture (jours)",
            ],
            [
                'key'   => 'quote_validity_days',
                'value' => '30',
                'type'  => 'integer',
                'group' => 'fiscal',
                'label' => 'Durée de validité devis (jours)',
            ],            // ── Horaires d'ouverture (WasherScheduler v2) ─────────────────
            [
                'key'   => 'business_open_hour',
                'value' => '8',
                'type'  => 'integer',
                'group' => 'horaires',
                'label' => "Heure d'ouverture (0-23)",
            ],
            [
                'key'   => 'business_open_minute',
                'value' => '0',
                'type'  => 'integer',
                'group' => 'horaires',
                'label' => "Minute d'ouverture (0-59)",
            ],
            [
                'key'   => 'business_close_hour',
                'value' => '21',
                'type'  => 'integer',
                'group' => 'horaires',
                'label' => 'Heure de fermeture (0-23)',
            ],
            [
                'key'   => 'business_close_minute',
                'value' => '0',
                'type'  => 'integer',
                'group' => 'horaires',
                'label' => 'Minute de fermeture (0-59)',
            ],
            [
                'key'   => 'business_days',
                'value' => '[1,2,3,4,5,6]',
                'type'  => 'json',
                'group' => 'horaires',
                'label' => 'Jours ouvrés (0=Dim, 1=Lun … 6=Sam)',
            ],            // ── Centre (identité) ────────────────────────────────────────
            [
                'key'   => 'center_subtitle',
                'value' => '',
                'type'  => 'string',
                'group' => 'centre',
                'label' => 'Slogan / description courte du centre (affiché sur les reçus)',
            ],

            // ── Impression & Reçus ───────────────────────────────────────
            [
                'key'   => 'receipt_paper_width',
                'value' => '80mm',
                'type'  => 'string',
                'group' => 'impression',
                'label' => 'Largeur papier reçu (58mm ou 80mm)',
            ],
            [
                'key'   => 'receipt_show_logo',
                'value' => 'true',
                'type'  => 'boolean',
                'group' => 'impression',
                'label' => 'Afficher le logo sur le reçu',
            ],
            [
                'key'   => 'receipt_show_qr',
                'value' => 'false',
                'type'  => 'boolean',
                'group' => 'impression',
                'label' => 'Afficher QR code suivi client sur le reçu',
            ],
            [
                'key'   => 'receipt_template',
                'value' => 'minimal',
                'type'  => 'string',
                'group' => 'impression',
                'label' => 'Modèle de reçu : minimal (compact) ou detailed (sectionné)',
            ],
            [
                'key'   => 'receipt_show_client_phone',
                'value' => 'true',
                'type'  => 'boolean',
                'group' => 'impression',
                'label' => 'Afficher le téléphone client sur le reçu',
            ],
            [
                'key'   => 'receipt_show_operator',
                'value' => 'true',
                'type'  => 'boolean',
                'group' => 'impression',
                'label' => 'Afficher le nom de l\'opérateur (laveur) sur le reçu',
            ],
            [
                'key'   => 'receipt_show_payment_detail',
                'value' => 'true',
                'type'  => 'boolean',
                'group' => 'impression',
                'label' => 'Afficher le détail Reçu/Dû si paiement encaissé ou partiel',
            ],
            [
                'key'   => 'receipt_show_dates',
                'value' => 'true',
                'type'  => 'boolean',
                'group' => 'impression',
                'label' => 'Afficher les dates Déposé / Livraison estimée',
            ],

            // ── Notifications ────────────────────────────────────────────
            [
                'key'   => 'notif.email_new_ticket',
                'value' => 'false',
                'type'  => 'boolean',
                'group' => 'notifications',
                'label' => 'Alerte email à chaque nouveau ticket',
            ],
            [
                'key'   => 'notif.email_daily_summary',
                'value' => 'false',
                'type'  => 'boolean',
                'group' => 'notifications',
                'label' => 'Résumé journalier par email',
            ],
            [
                'key'   => 'notif.alert_email',
                'value' => '',
                'type'  => 'string',
                'group' => 'notifications',
                'label' => 'Email destinataire des alertes',
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
