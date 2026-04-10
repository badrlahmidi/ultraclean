<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * InvoiceOverdue — notifie l'admin quand une facture émise dépasse sa date d'échéance.
 *
 * Canaux : database + mail (si email admin configuré).
 */
class InvoiceOverdue extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Invoice $invoice,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $client  = $this->invoice->client;
        $amount  = number_format($this->invoice->total_cents / 100, 2, ',', ' ') . ' MAD';
        $dueDate = $this->invoice->due_date->format('d/m/Y');

        return (new MailMessage)
            ->subject("⚠️ Facture {$this->invoice->invoice_number} en retard")
            ->greeting('Alerte facturation')
            ->line("La facture **{$this->invoice->invoice_number}** de **{$amount}** pour **{$client?->name}** est échue depuis le {$dueDate}.")
            ->action('Voir la facture', route('admin.invoices.show', $this->invoice))
            ->line('Merci de relancer le client ou de mettre à jour le statut de la facture.');
    }

    public function toArray(object $notifiable): array
    {
        $client  = $this->invoice->client;
        $amount  = number_format($this->invoice->total_cents / 100, 2, ',', ' ') . ' MAD';

        return [
            'type'           => 'invoice_overdue',
            'icon'           => '🧾',
            'title'          => "Facture en retard — {$this->invoice->invoice_number}",
            'body'           => "{$client?->name} · {$amount} · Échue le {$this->invoice->due_date->format('d/m/Y')}",
            'invoice_id'     => $this->invoice->id,
            'client_id'      => $client?->id,
            'invoice_number' => $this->invoice->invoice_number,
        ];
    }
}
