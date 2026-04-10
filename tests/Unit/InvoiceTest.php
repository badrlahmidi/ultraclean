<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * InvoiceTest — Valide Invoice::recalculate() et la state machine.
 *
 * Couvre :
 *  - recalculate() : subtotal, tax, total cohérents
 *  - recalculate() avec discount
 *  - recalculate() avec tax_rate = 0
 *  - Transitions valides (draft→issued, issued→paid, issued→partial→paid)
 *  - Transitions invalides (LogicException)
 *  - markPaid() et recordPartialPayment()
 *  - generateNumber() unicité + format
 *  - remainingCents()
 */
class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeInvoice(array $attrs = []): Invoice
    {
        $client = Client::factory()->create();
        $user   = User::factory()->admin()->create();

        return Invoice::create(array_merge([
            'client_id'        => $client->id,
            'created_by'       => $user->id,
            'status'           => Invoice::STATUS_DRAFT,
            'subtotal_cents'   => 0,
            'discount_cents'   => 0,
            'tax_rate'         => 20.0,
            'tax_cents'        => 0,
            'total_cents'      => 0,
            'amount_paid_cents'=> 0,
        ], $attrs));
    }    private function addLine(Invoice $invoice, int $priceCents, int $qty = 1): InvoiceLine
    {
        return $invoice->lines()->create([
            'description'     => 'Service test',
            'quantity'        => $qty,
            'unit_price_cents'=> $priceCents,
            'discount_cents'  => 0,
            'line_total_cents'=> $priceCents * $qty,
            'sort_order'      => 0,
        ]);
    }

    // ── recalculate() ────────────────────────────────────────────────────

    public function test_recalculate_simple(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 20.0]);
        $this->addLine($invoice, 10000); // 100 MAD

        $invoice->recalculate();
        $invoice->refresh();

        $this->assertEquals(10000, $invoice->subtotal_cents);
        $this->assertEquals(2000,  $invoice->tax_cents);     // 20% de 10000
        $this->assertEquals(12000, $invoice->total_cents);
    }

    public function test_recalculate_with_discount(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 20.0, 'discount_cents' => 2000]);
        $this->addLine($invoice, 10000);

        $invoice->recalculate();
        $invoice->refresh();

        $this->assertEquals(10000, $invoice->subtotal_cents);
        // taxable = 10000 - 2000 = 8000
        $this->assertEquals(1600,  $invoice->tax_cents);     // 20% de 8000
        $this->assertEquals(9600,  $invoice->total_cents);   // 8000 + 1600
    }

    public function test_recalculate_zero_tax(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 0.0]);
        $this->addLine($invoice, 5000);
        $this->addLine($invoice, 3000);

        $invoice->recalculate();
        $invoice->refresh();

        $this->assertEquals(8000, $invoice->subtotal_cents);
        $this->assertEquals(0,    $invoice->tax_cents);
        $this->assertEquals(8000, $invoice->total_cents);
    }

    public function test_recalculate_multiple_lines(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 20.0]);
        $this->addLine($invoice, 5000, 2);  // 100 MAD
        $this->addLine($invoice, 3000, 1);  // 30 MAD
        // subtotal = 13000

        $invoice->recalculate();
        $invoice->refresh();

        $this->assertEquals(13000, $invoice->subtotal_cents);
        $this->assertEquals(2600,  $invoice->tax_cents);
        $this->assertEquals(15600, $invoice->total_cents);
    }

    public function test_recalculate_discount_cannot_make_taxable_negative(): void
    {
        $invoice = $this->makeInvoice([
            'tax_rate'       => 20.0,
            'discount_cents' => 99999, // discount > subtotal
        ]);
        $this->addLine($invoice, 1000);

        $invoice->recalculate();
        $invoice->refresh();

        // max(0, 1000 - 99999) = 0 → tax = 0, total = 0
        $this->assertEquals(0, $invoice->tax_cents);
        $this->assertEquals(0, $invoice->total_cents);
    }

    // ── State machine ────────────────────────────────────────────────────

    public function test_draft_to_issued(): void
    {
        $invoice = $this->makeInvoice();
        $invoice->transitionTo(Invoice::STATUS_ISSUED);

        $this->assertEquals(Invoice::STATUS_ISSUED, $invoice->fresh()->status);
        $this->assertNotNull($invoice->fresh()->issued_at);
    }

    public function test_issued_to_paid(): void
    {
        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_ISSUED, 'total_cents' => 5000]);
        $invoice->transitionTo(Invoice::STATUS_PAID);

        $fresh = $invoice->fresh();
        $this->assertEquals(Invoice::STATUS_PAID, $fresh->status);
        $this->assertNotNull($fresh->paid_at);
    }

    public function test_issued_to_cancelled(): void
    {
        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_ISSUED]);
        $invoice->transitionTo(Invoice::STATUS_CANCELLED);

        $this->assertEquals(Invoice::STATUS_CANCELLED, $invoice->fresh()->status);
    }

    public function test_paid_cannot_transition(): void
    {
        $this->expectException(\LogicException::class);

        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_PAID]);
        $invoice->transitionTo(Invoice::STATUS_CANCELLED);
    }

    public function test_cancelled_cannot_transition(): void
    {
        $this->expectException(\LogicException::class);

        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_CANCELLED]);
        $invoice->transitionTo(Invoice::STATUS_ISSUED);
    }

    public function test_draft_cannot_jump_to_paid(): void
    {
        $this->expectException(\LogicException::class);

        $invoice = $this->makeInvoice();
        $invoice->transitionTo(Invoice::STATUS_PAID);
    }

    // ── markPaid() ───────────────────────────────────────────────────────

    public function test_mark_paid_sets_amount_and_status(): void
    {
        $invoice = $this->makeInvoice([
            'status'       => Invoice::STATUS_ISSUED,
            'total_cents'  => 8000,
        ]);

        $invoice->markPaid('card');
        $fresh = $invoice->fresh();

        $this->assertEquals(Invoice::STATUS_PAID, $fresh->status);
        $this->assertEquals(8000, $fresh->amount_paid_cents);
        $this->assertEquals('card', $fresh->payment_method);
    }

    // ── recordPartialPayment() ───────────────────────────────────────────

    public function test_partial_payment_sets_partial_status(): void
    {
        $invoice = $this->makeInvoice([
            'status'      => Invoice::STATUS_ISSUED,
            'total_cents' => 10000,
        ]);

        $invoice->recordPartialPayment(4000, 'cash');
        $fresh = $invoice->fresh();

        $this->assertEquals(Invoice::STATUS_PARTIAL, $fresh->status);
        $this->assertEquals(4000, $fresh->amount_paid_cents);
        $this->assertEquals(6000, $fresh->remainingCents());
    }

    public function test_partial_payment_completes_when_full(): void
    {
        $invoice = $this->makeInvoice([
            'status'             => Invoice::STATUS_PARTIAL,
            'total_cents'        => 10000,
            'amount_paid_cents'  => 6000,
        ]);

        $invoice->recordPartialPayment(4000, 'cash');

        $this->assertEquals(Invoice::STATUS_PAID, $invoice->fresh()->status);
        $this->assertEquals(0, $invoice->fresh()->remainingCents());
    }

    public function test_partial_payment_caps_at_total(): void
    {
        $invoice = $this->makeInvoice([
            'status'             => Invoice::STATUS_ISSUED,
            'total_cents'        => 5000,
            'amount_paid_cents'  => 0,
        ]);

        // Overpay → plafonné à total
        $invoice->recordPartialPayment(9999, 'cash');

        $this->assertEquals(5000, $invoice->fresh()->amount_paid_cents);
    }

    // ── generateNumber() ─────────────────────────────────────────────────

    public function test_generate_number_format(): void
    {
        $number = Invoice::generateNumber();

        $this->assertMatchesRegularExpression('/^FAC-\d{6}-\d{4}$/', $number);
    }

    public function test_generate_number_is_unique(): void
    {
        $n1 = Invoice::generateNumber();
        $this->makeInvoice(); // crée une facture → compteur avance
        $n2 = Invoice::generateNumber();

        $this->assertNotEquals($n1, $n2);
    }

    // ── remainingCents() ────────────────────────────────────────────────

    public function test_remaining_cents_calculation(): void
    {
        $invoice = $this->makeInvoice([
            'total_cents'        => 10000,
            'amount_paid_cents'  => 3000,
        ]);

        $this->assertEquals(7000, $invoice->remainingCents());
    }

    public function test_remaining_cents_never_negative(): void
    {
        $invoice = $this->makeInvoice([
            'total_cents'        => 5000,
            'amount_paid_cents'  => 7000, // surpaiement
        ]);

        $this->assertEquals(0, $invoice->remainingCents());
    }
}
