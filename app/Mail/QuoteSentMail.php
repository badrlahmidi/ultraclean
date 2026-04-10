<?php

namespace App\Mail;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * QuoteSentMail — e-mail envoyé au client lorsqu'un devis est transmis.
 *
 * Contient le PDF du devis en pièce jointe.
 */
class QuoteSentMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Quote $quote,
    ) {}

    public function envelope(): Envelope
    {
        $number = $this->quote->quote_number;

        return new Envelope(
            subject: "Devis {$number} — UltraClean",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.quote-sent',
            with: [
                'quote'          => $this->quote,
                'client'         => $this->quote->client,
                'totalFormatted' => number_format($this->quote->total_cents / 100, 2, ',', ' ') . ' MAD',
                'validUntil'     => $this->quote->valid_until?->format('d/m/Y'),
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {        // Générer le PDF s'il n'existe pas encore
        if (! $this->quote->pdf_path || ! Storage::disk('public')->exists($this->quote->pdf_path)) {
            $this->quote->generatePdf();
            $this->quote->refresh();
        }

        if ($this->quote->pdf_path && Storage::disk('public')->exists($this->quote->pdf_path)) {
            return [
                Attachment::fromStorageDisk('public', $this->quote->pdf_path)
                    ->as($this->quote->quote_number . '.pdf')
                    ->withMime('application/pdf'),
            ];
        }

        return [];
    }
}
