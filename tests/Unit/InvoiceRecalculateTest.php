<?php

namespace Tests\Unit;

use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * InvoiceRecalculateTest — Valide Invoice::recalculate() et la state machine.
 *
 * Couvre :
 *  - recalculate() : subtotal, tax, total corrects
 *  - recalculate() avec discount
 *  - recalculate() avec tax_rate = 0
 *  - Transitions valides (draft→issued→paid)
 *  - Transitions invalides (LogicException)
 *  - markPaid() : amount_paid_cents = total, statut = paid
 *  - recordPartialPayment() : partiel → STATUS_PARTIAL, soldé → STATUS_PAID
 *  - remainingCents() correct
 *  - generateNumber() : préfixe FAC-YYYYMM
 */
class InvoiceRecalculateTest extends TestCase
{
    use RefreshDatabase;

    private Client $client;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin  = User::factory()->admin()->create();
        $this->client = Client::factory()->create();
    }

    private function makeInvoice(array $attrs = []): Invoice
    {
        return Invoice::factory()->create(array_merge([
            'client_id'      => $this->client->id,
            'created_by'     => $this->admin->id,
            'status'         => Invoice::STATUS_DRAFT,
            'discount_cents' => 0,
            'tax_rate'       => 20.0,
        ], $attrs));
    }

    private function addLine(Invoice $invoice, int $unitPrice, int $qty = 1): InvoiceLine
    {
        return InvoiceLine::factory()->create([
            'invoice_id'       => $invoice->id,
            'unit_price_cents' => $unitPrice,
            'quantity'         => $qty,
            'line_total_cents' => $unitPrice * $qty,
            'sort_order'       => 1,
        ]);
    }

    // ── recalculate() ────────────────────────────────────────────────────

    public function test_recalculate_computes_correct_totals(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 20.0, 'discount_cents' => 0]);
        $this->addLine($invoice, 10000); // 100 MAD

        $invoice->recalculate();

        $fresh = $invoice->fresh();
        $this->assertEquals(10000, $fresh->subtotal_cents);           // 100
        $this->assertEquals(2000,  $fresh->tax_cents);                // 20% de 100
        $this->assertEquals(12000, $fresh->total_cents);              // 120
    }

    public function test_recalculate_with_two_lines(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 20.0, 'discount_cents' => 0]);
        $this->addLine($invoice, 5000);
        $this->addLine($invoice, 3000);

        $invoice->recalculate();

        $fresh = $invoice->fresh();
        $this->assertEquals(8000,  $fresh->subtotal_cents);
        $this->assertEquals(1600,  $fresh->tax_cents);    // 20% de 8000
        $this->assertEquals(9600,  $fresh->total_cents);
    }

    public function test_recalculate_applies_discount_before_tax(): void
    {
        // Subtotal 100 MAD, remise 20 MAD → taxable 80 MAD → TVA 20% = 16 MAD → total 96 MAD
        $invoice = $this->makeInvoice(['tax_rate' => 20.0, 'discount_cents' => 2000]);
        $this->addLine($invoice, 10000); // 100 MAD

        $invoice->recalculate();

        $fresh = $invoice->fresh();
        $this->assertEquals(10000, $fresh->subtotal_cents);
        $this->assertEquals(1600,  $fresh->tax_cents);    // 20% × (100 - 20) = 16
        $this->assertEquals(9600,  $fresh->total_cents);  // 80 + 16
    }

    public function test_recalculate_with_zero_tax_rate(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 0.0, 'discount_cents' => 0]);
        $this->addLine($invoice, 7500);

        $invoice->recalculate();

        $fresh = $invoice->fresh();
        $this->assertEquals(7500, $fresh->subtotal_cents);
        $this->assertEquals(0,    $fresh->tax_cents);
        $this->assertEquals(7500, $fresh->total_cents);
    }

    public function test_recalculate_with_quantity(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 0.0]);
        $this->addLine($invoice, 4000, 3); // 3 × 40 = 120 MAD

        $invoice->recalculate();

        $this->assertEquals(12000, $invoice->fresh()->subtotal_cents);
    }

    public function test_recalculate_no_lines_gives_zero_total(): void
    {
        $invoice = $this->makeInvoice(['tax_rate' => 20.0]);
        // Pas de lignes

        $invoice->recalculate();

        $fresh = $invoice->fresh();
        $this->assertEquals(0, $fresh->subtotal_cents);
        $this->assertEquals(0, $fresh->tax_cents);
        $this->assertEquals(0, $fresh->total_cents);
    }

    // ── State Machine ────────────────────────────────────────────────────

    public function test_draft_to_issued_transition(): void
    {
        $invoice = $this->makeInvoice();

        $invoice->transitionTo(Invoice::STATUS_ISSUED);

        $fresh = $invoice->fresh();
        $this->assertEquals(Invoice::STATUS_ISSUED, $fresh->status);
        $this->assertNotNull($fresh->issued_at);
    }

    public function test_issued_to_paid_transition(): void
    {
        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_ISSUED]);

        $invoice->transitionTo(Invoice::STATUS_PAID);

        $fresh = $invoice->fresh();
        $this->assertEquals(Invoice::STATUS_PAID, $fresh->status);
        $this->assertNotNull($fresh->paid_at);
    }

    public function test_draft_to_cancelled_transition(): void
    {
        $invoice = $this->makeInvoice();

        $invoice->transitionTo(Invoice::STATUS_CANCELLED);

        $this->assertEquals(Invoice::STATUS_CANCELLED, $invoice->fresh()->status);
    }

    public function test_paid_invoice_cannot_transition(): void
    {
        $this->expectException(\LogicException::class);

        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_PAID]);
        $invoice->transitionTo(Invoice::STATUS_CANCELLED);
    }

    public function test_draft_cannot_jump_to_paid(): void
    {
        $this->expectException(\LogicException::class);

        $invoice = $this->makeInvoice(['status' => Invoice::STATUS_DRAFT]);
        $invoice->transitionTo(Invoice::STATUS_PAID);
    }

    // ── markPaid ─────────────────────────────────────────────────────────

    public function test_mark_paid_sets_amount_and_status(): void
    {
        $invoice = $this->makeInvoice([
            'status'      => Invoice::STATUS_ISSUED,
            'total_cents' => 15000,
        ]);

        $invoice->markPaid('card');

        $fresh = $invoice->fresh();
        $this->assertEquals(Invoice::STATUS_PAID, $fresh->status);
        $this->assertEquals(15000, $fresh->amount_paid_cents);
        $this->assertEquals('card', $fresh->payment_method);
        $this->assertNotNull($fresh->paid_at);
    }

    // ── recordPartialPayment ──────────────────────────────────────────────

    public function test_partial_payment_sets_partial_status(): void
    {
        $invoice = $this->makeInvoice([
            'status'             => Invoice::STATUS_ISSUED,
            'total_cents'        => 10000,
            'amount_paid_cents'  => 0,
        ]);

        $invoice->recordPartialPayment(4000, 'cash');

        $fresh = $invoice->fresh();
        $this->assertEquals(Invoice::STATUS_PARTIAL, $fresh->status);
        $this->assertEquals(4000, $fresh->amount_paid_cents);
    }

    public function test_partial_payment_completes_to_paid(): void
    {
        $invoice = $this->makeInvoice([
            'status'            => Invoice::STATUS_ISSUED,
            'total_cents'       => 10000,
            'amount_paid_cents' => 0,
        ]);

        $invoice->recordPartialPayment(10000, 'cash');

        $this->assertEquals(Invoice::STATUS_PAID, $invoice->fresh()->status);
    }

    public function test_two_partial_payments_complete_invoice(): void
    {
        $invoice = $this->makeInvoice([
            'status'            => Invoice::STATUS_ISSUED,
            'total_cents'       => 10000,
            'amount_paid_cents' => 0,
        ]);

        $invoice->recordPartialPayment(6000, 'cash');
        $this->assertEquals(Invoice::STATUS_PARTIAL, $invoice->fresh()->status);

        $invoice->fresh()->recordPartialPayment(4000, 'cash');
        $this->assertEquals(Invoice::STATUS_PAID, $invoice->fresh()->status);
        $this->assertEquals(10000, $invoice->fresh()->amount_paid_cents);
    }

    // ── remainingCents ────────────────────────────────────────────────────

    public function test_remaining_cents_full_amount(): void
    {
        $invoice = $this->makeInvoice([
            'total_cents'       => 12000,
            'amount_paid_cents' => 0,
        ]);

        $this->assertEquals(12000, $invoice->remainingCents());
    }

    public function test_remaining_cents_partial(): void
    {
        $invoice = $this->makeInvoice([
            'total_cents'       => 12000,
            'amount_paid_cents' => 5000,
        ]);

        $this->assertEquals(7000, $invoice->remainingCents());
    }

    public function test_remaining_cents_fully_paid_is_zero(): void
    {
        $invoice = $this->makeInvoice([
            'total_cents'       => 12000,
            'amount_paid_cents' => 12000,
        ]);

        $this->assertEquals(0, $invoice->remainingCents());
    }

    // ── generateNumber ────────────────────────────────────────────────────

    public function test_generate_number_has_correct_prefix(): void
    {
        $number = Invoice::generateNumber();
        $prefix = 'FAC-' . now()->format('Ym') . '-';

        $this->assertStringStartsWith($prefix, $number);
    }

    public function test_generate_number_increments(): void
    {
        $first  = Invoice::generateNumber();
        // Créer une facture pour forcer l'incrément
        Invoice::factory()->create([
            'client_id'      => $this->client->id,
            'created_by'     => $this->admin->id,
            'invoice_number' => $first,
        ]);
        $second = Invoice::generateNumber();

        $this->assertNotEquals($first, $second);
        // Le second numéro doit être supérieur
        $this->assertGreaterThan($first, $second);
    }

    // ── Helpers booléens ──────────────────────────────────────────────────

    public function test_status_helpers(): void
    {
        $draft     = $this->makeInvoice(['status' => Invoice::STATUS_DRAFT]);
        $issued    = $this->makeInvoice(['status' => Invoice::STATUS_ISSUED]);
        $paid      = $this->makeInvoice(['status' => Invoice::STATUS_PAID]);
        $partial   = $this->makeInvoice(['status' => Invoice::STATUS_PARTIAL]);
        $cancelled = $this->makeInvoice(['status' => Invoice::STATUS_CANCELLED]);

        $this->assertTrue($draft->isDraft());
        $this->assertTrue($issued->isIssued());
        $this->assertTrue($paid->isPaid());
        $this->assertTrue($partial->isPartial());
        $this->assertTrue($cancelled->isCancelled());

        $this->assertFalse($draft->isPaid());
        $this->assertFalse($paid->isDraft());
    }
}
