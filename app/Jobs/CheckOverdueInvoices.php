<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Models\User;
use App\Notifications\InvoiceOverdue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

/**
 * CheckOverdueInvoices
 *
 * Exécuté quotidiennement à 9h.
 * Vérifie les factures émises dont due_date < today() et envoie
 * une notification aux admins (une par facture en retard).
 * Évite les doublons via un cache journalier par facture.
 */
class CheckOverdueInvoices implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $overdueInvoices = Invoice::where('status', Invoice::STATUS_ISSUED)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', today())
            ->with('client')
            ->get();

        if ($overdueInvoices->isEmpty()) {
            return;
        }

        $admins = User::where('role', 'admin')
            ->where('is_active', true)
            ->get();

        if ($admins->isEmpty()) {
            return;
        }

        foreach ($overdueInvoices as $invoice) {
            $cacheKey = "invoice_overdue_{$invoice->id}_" . today()->toDateString();

            if (cache()->has($cacheKey)) {
                continue;
            }

            Notification::send($admins, new InvoiceOverdue($invoice));
            cache()->put($cacheKey, true, now()->endOfDay());
        }
    }
}
