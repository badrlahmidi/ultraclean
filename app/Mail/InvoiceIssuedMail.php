<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * InvoiceIssuedMail — e-mail envoyé au client lorsqu'une facture est émise.
 *
 * Contient le PDF de la facture en pièce jointe.
 */
class InvoiceIssuedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invoice $invoice,
    ) {}

    public function envelope(): Envelope
    {
        $number = $this->invoice->invoice_number;

        return new Envelope(
            subject: "Facture {$number} — UltraClean",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.invoice-issued',
            with: [
                'invoice'      => $this->invoice,
                'client'       => $this->invoice->client,
                'totalFormatted' => number_format($this->invoice->total_cents / 100, 2, ',', ' ') . ' MAD',
                'dueDate'      => $this->invoice->due_date?->format('d/m/Y'),
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {        // Générer le PDF s'il n'existe pas encore
        if (! $this->invoice->pdf_path || ! Storage::disk('public')->exists($this->invoice->pdf_path)) {
            $this->invoice->generatePdf();
            $this->invoice->refresh();
        }

        if ($this->invoice->pdf_path && Storage::disk('public')->exists($this->invoice->pdf_path)) {
            return [
                Attachment::fromStorageDisk('public', $this->invoice->pdf_path)
                    ->as($this->invoice->invoice_number . '.pdf')
                    ->withMime('application/pdf'),
            ];
        }

        return [];
    }
}
