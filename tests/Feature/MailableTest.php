<?php

namespace Tests\Feature;

use App\Mail\InvoiceIssuedMail;
use App\Mail\QuoteSentMail;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * MailableTest — Valide les Mailables et leur intégration contrôleur.
 *
 * Couvre :
 *  - InvoiceIssuedMail structure (subject, content, attachments)
 *  - QuoteSentMail structure (subject, content, attachments)
 *  - Invoice issue dispatches email
 *  - Quote send dispatches email
 *  - No email dispatched if client has no email
 */
class MailableTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    // ── InvoiceIssuedMail ─────────────────────────────────────────────────

    public function test_invoice_issued_mail_has_correct_subject(): void
    {
        $invoice = Invoice::factory()->issued()->create([
            'invoice_number' => 'FAC-202604-0001',
        ]);

        $mailable = new InvoiceIssuedMail($invoice);

        $mailable->assertHasSubject('Facture FAC-202604-0001 — UltraClean');
    }

    public function test_invoice_issued_mail_renders_content(): void
    {
        $client = Client::factory()->create(['name' => 'Ahmed Test']);
        $invoice = Invoice::factory()->issued()->create([
            'client_id'      => $client->id,
            'invoice_number' => 'FAC-202604-0099',
            'total_cents'    => 15000,
        ]);

        $mailable = new InvoiceIssuedMail($invoice);
        $rendered = $mailable->render();

        $this->assertStringContainsString('FAC-202604-0099', $rendered);
        $this->assertStringContainsString('Ahmed Test', $rendered);
    }

    // ── QuoteSentMail ─────────────────────────────────────────────────────

    public function test_quote_sent_mail_has_correct_subject(): void
    {
        $quote = Quote::factory()->create([
            'quote_number' => 'DEV-202604-0001',
            'status'       => Quote::STATUS_SENT,
            'sent_at'      => now(),
        ]);

        $mailable = new QuoteSentMail($quote);

        $mailable->assertHasSubject('Devis DEV-202604-0001 — UltraClean');
    }

    public function test_quote_sent_mail_renders_content(): void
    {
        $client = Client::factory()->create(['name' => 'Fatima Test']);
        $quote = Quote::factory()->create([
            'client_id'    => $client->id,
            'quote_number' => 'DEV-202604-0099',
            'total_cents'  => 25000,
            'status'       => Quote::STATUS_SENT,
            'sent_at'      => now(),
        ]);

        $mailable = new QuoteSentMail($quote);
        $rendered = $mailable->render();

        $this->assertStringContainsString('DEV-202604-0099', $rendered);
        $this->assertStringContainsString('Fatima Test', $rendered);
    }

    // ── Controller integration ────────────────────────────────────────────

    public function test_issuing_invoice_sends_email_to_client(): void
    {
        Mail::fake();

        $client = Client::factory()->create(['email' => 'client@test.com']);
        $invoice = Invoice::factory()->draft()->create(['client_id' => $client->id]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.invoices.issue', $invoice));

        $response->assertRedirect();

        Mail::assertQueued(InvoiceIssuedMail::class, function ($mail) {
            return $mail->hasTo('client@test.com');
        });
    }

    public function test_issuing_invoice_skips_email_if_no_client_email(): void
    {
        Mail::fake();

        $client = Client::factory()->create(['email' => null]);
        $invoice = Invoice::factory()->draft()->create(['client_id' => $client->id]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.invoices.issue', $invoice));

        $response->assertRedirect();

        Mail::assertNothingQueued();
    }    public function test_sending_quote_sends_email_to_client(): void
    {
        Mail::fake();

        $client = Client::factory()->create(['email' => 'devis@test.com']);
        $quote = Quote::factory()->create([
            'client_id' => $client->id,
            'status'    => Quote::STATUS_DRAFT,
        ]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.quotes.send', $quote));

        $response->assertRedirect();

        Mail::assertQueued(QuoteSentMail::class, function ($mail) {
            return $mail->hasTo('devis@test.com');
        });
    }

    public function test_sending_quote_skips_email_if_no_client_email(): void
    {
        Mail::fake();

        $client = Client::factory()->create(['email' => null]);
        $quote = Quote::factory()->create([
            'client_id' => $client->id,
            'status'    => Quote::STATUS_DRAFT,
        ]);

        $response = $this->actingAs($this->admin)
            ->post(route('admin.quotes.send', $quote));

        $response->assertRedirect();

        Mail::assertNothingQueued();
    }
}
