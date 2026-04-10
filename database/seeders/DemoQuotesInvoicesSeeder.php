<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\Quote;
use App\Models\QuoteLine;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * DemoQuotesInvoicesSeeder — 6 devis + 5 factures B2B réalistes.
 *
 * Prérequis : DemoUsersSeeder + DemoClientsSeeder + ServiceSeeder.
 */
class DemoQuotesInvoicesSeeder extends Seeder
{
    public function run(): void
    {
        $admin    = User::where('role', 'admin')->first();
        $services = Service::limit(6)->get();
        $clients  = Client::limit(6)->get();

        if (! $admin || $clients->isEmpty() || $services->isEmpty()) {
            $this->command->warn('⚠️  Données de base manquantes — ignoré.');
            return;
        }

        $taxRate = 20.0;

        // ═══════════════════════════════════════════════════════════════
        // DEVIS
        // ═══════════════════════════════════════════════════════════════

        $quoteData = [
            ['status' => 'draft',    'days_ago' => 2,  'valid_days' => 30],
            ['status' => 'sent',     'days_ago' => 7,  'valid_days' => 30],
            ['status' => 'sent',     'days_ago' => 14, 'valid_days' => 30],
            ['status' => 'accepted', 'days_ago' => 20, 'valid_days' => 30],
            ['status' => 'refused',  'days_ago' => 25, 'valid_days' => 15],
            ['status' => 'expired',  'days_ago' => 45, 'valid_days' => 15],
        ];

        $quotesCreated = 0;
        $createdQuotes = [];

        foreach ($quoteData as $i => $qd) {
            $client  = $clients[$i % $clients->count()];
            $created = now()->subDays($qd['days_ago']);

            $quote = Quote::create([
                'ulid'            => (string) Str::ulid(),
                'client_id'       => $client->id,
                'created_by'      => $admin->id,
                'status'          => $qd['status'],
                'billing_name'    => $client->is_company ? $client->name : 'Entreprise ' . $client->name,
                'billing_address' => 'Bd Mohammed V, ' . ($i + 10),
                'billing_city'    => 'Casablanca',
                'billing_zip'     => '20000',
                'billing_ice'     => $client->ice ?? ('00000' . rand(10000, 99999) . '0000' . rand(10, 99)),
                'subtotal_cents'  => 0,
                'discount_cents'  => $i % 3 === 0 ? 5000 : 0,
                'tax_rate'        => $taxRate,
                'tax_cents'       => 0,
                'total_cents'     => 0,
                'notes'           => $i === 0 ? 'Forfait mensuel lavage flotte 5 véhicules' : null,
                'valid_until'     => $created->copy()->addDays($qd['valid_days'])->toDateString(),
                'sent_at'         => in_array($qd['status'], ['sent', 'accepted', 'refused', 'expired']) ? $created->copy()->addDay() : null,
                'accepted_at'     => $qd['status'] === 'accepted' ? $created->copy()->addDays(3) : null,
                'created_at'      => $created,
                'updated_at'      => $created,
            ]);

            // Add 2-3 lines
            $lineServices = $services->shuffle()->take(rand(2, 3));
            $sort = 1;
            foreach ($lineServices as $svc) {
                $qty   = rand(1, 5);
                $price = $svc->base_price_cents ?: rand(3000, 15000);

                QuoteLine::create([
                    'quote_id'        => $quote->id,
                    'service_id'      => $svc->id,
                    'description'     => $svc->name,
                    'quantity'         => $qty,
                    'unit_price_cents' => $price,
                    'discount_cents'   => 0,
                    'line_total_cents' => $qty * $price,
                    'sort_order'       => $sort++,
                ]);
            }

            // Recalculate will be triggered by QuoteLine::saved
            $quote->recalculate();

            $createdQuotes[] = $quote;
            $quotesCreated++;
        }

        $this->command->info("✅  {$quotesCreated} devis créés");

        // ═══════════════════════════════════════════════════════════════
        // FACTURES
        // ═══════════════════════════════════════════════════════════════

        $invoiceData = [
            ['status' => 'draft',  'days_ago' => 1,  'due_days' => 30],
            ['status' => 'draft',  'days_ago' => 3,  'due_days' => 30],
            ['status' => 'issued', 'days_ago' => 10, 'due_days' => 30],
            ['status' => 'issued', 'days_ago' => 40, 'due_days' => 30],  // celle-ci sera en retard!
            ['status' => 'paid',   'days_ago' => 15, 'due_days' => 30],
        ];

        $invoicesCreated = 0;

        foreach ($invoiceData as $j => $id) {
            $client  = $clients[$j % $clients->count()];
            $created = now()->subDays($id['days_ago']);

            // Link first paid invoice to the accepted quote
            $quoteId = null;
            if ($id['status'] === 'paid' && isset($createdQuotes[3])) {
                $quoteId = $createdQuotes[3]->id;
            }

            $invoice = Invoice::create([
                'ulid'              => (string) Str::ulid(),
                'quote_id'          => $quoteId,
                'client_id'         => $client->id,
                'created_by'        => $admin->id,
                'status'            => $id['status'],
                'payment_method'    => $id['status'] === 'paid' ? 'wire' : null,
                'billing_name'      => $client->is_company ? $client->name : 'Entreprise ' . $client->name,
                'billing_address'   => 'Av Hassan II, ' . ($j + 50),
                'billing_city'      => 'Casablanca',
                'billing_zip'       => '20000',
                'billing_ice'       => $client->ice ?? ('00000' . rand(10000, 99999) . '0000' . rand(10, 99)),
                'subtotal_cents'    => 0,
                'discount_cents'    => $j === 0 ? 3000 : 0,
                'tax_rate'          => $taxRate,
                'tax_cents'         => 0,
                'total_cents'       => 0,
                'amount_paid_cents' => 0,
                'notes'             => $j === 3 ? '⚠️ Relance envoyée le ' . now()->subDays(5)->format('d/m/Y') : null,
                'due_date'          => $created->copy()->addDays($id['due_days'])->toDateString(),
                'issued_at'         => in_array($id['status'], ['issued', 'paid']) ? $created->copy()->addDay() : null,
                'paid_at'           => $id['status'] === 'paid' ? $created->copy()->addDays(10) : null,
                'created_at'        => $created,
                'updated_at'        => $created,
            ]);

            // Add 2-4 lines
            $lineServices = $services->shuffle()->take(rand(2, 4));
            $sort = 1;
            foreach ($lineServices as $svc) {
                $qty   = rand(1, 8);
                $price = $svc->base_price_cents ?: rand(3000, 15000);

                InvoiceLine::create([
                    'invoice_id'       => $invoice->id,
                    'service_id'       => $svc->id,
                    'description'      => $svc->name,
                    'quantity'         => $qty,
                    'unit_price_cents' => $price,
                    'discount_cents'   => 0,
                    'line_total_cents' => $qty * $price,
                    'sort_order'       => $sort++,
                ]);
            }

            // Recalculate triggered by InvoiceLine::saved
            $invoice->refresh();

            // Set amount_paid for paid invoices
            if ($id['status'] === 'paid') {
                $invoice->update(['amount_paid_cents' => $invoice->total_cents]);
            }

            $invoicesCreated++;
        }

        $this->command->info("✅  {$invoicesCreated} factures créées (1 en retard de paiement)");
    }
}
