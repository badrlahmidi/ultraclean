<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Ticket;
use App\Models\User;
use App\Models\LoyaltyTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $caissier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->caissier = User::factory()->create([
            'role'     => 'caissier',
            'is_active' => true,
        ]);
    }

    // ─── Auth ────────────────────────────────────────────────────────────

    public function test_unauthenticated_user_is_redirected(): void
    {
        $ticket = Ticket::factory()->completed()->create(['created_by' => $this->caissier->id]);

        $response = $this->post(route('caissier.tickets.pay', $ticket), [
            'method' => 'cash',
        ]);

        $response->assertRedirect(route('login'));
    }

    // ─── Happy path: cash payment ────────────────────────────────────────

    public function test_cash_payment_transitions_ticket_to_paid(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
        $response->assertSessionHas('success');

        $this->assertEquals('paid', $ticket->fresh()->status);
        $this->assertNotNull($ticket->fresh()->paid_at);
    }

    public function test_cash_payment_creates_payment_record(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $this->assertDatabaseHas('payments', [
            'ticket_id'         => $ticket->id,
            'method'            => 'cash',
            'amount_cents'      => 5000,
            'amount_cash_cents' => 5000,
        ]);
    }

    // ─── Card & mobile ───────────────────────────────────────────────────

    public function test_card_payment_records_correct_amounts(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(8000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'card']
        );

        $this->assertDatabaseHas('payments', [
            'ticket_id'         => $ticket->id,
            'method'            => 'card',
            'amount_card_cents' => 8000,
            'amount_cash_cents' => 0,
        ]);
    }

    // ─── Mixed payment ───────────────────────────────────────────────────

    public function test_mixed_payment_accepts_correct_split(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'mixed',
                'amount_cash_cents' => 6000,
                'amount_card_cents' => 4000,
            ]
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('payments', [
            'ticket_id'         => $ticket->id,
            'method'            => 'mixed',
            'amount_cash_cents' => 6000,
            'amount_card_cents' => 4000,
        ]);
    }

    public function test_mixed_payment_with_wire_channel_transitions_to_paid(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'mixed',
                'amount_cash_cents' => 5000,
                'amount_wire_cents' => 5000,
            ]
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
        $this->assertEquals('paid', $ticket->fresh()->status);
        $this->assertDatabaseHas('payments', [
            'ticket_id'         => $ticket->id,
            'method'            => 'mixed',
            'amount_cash_cents' => 5000,
            'amount_wire_cents' => 5000,
        ]);
    }

    // ─── Wire (bank-transfer) single-channel ─────────────────────────────

    public function test_wire_payment_transitions_ticket_to_paid(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(50000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'wire']
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
        $this->assertEquals('paid', $ticket->fresh()->status);
    }

    public function test_wire_payment_records_correct_amounts(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(50000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'wire']
        );

        $this->assertDatabaseHas('payments', [
            'ticket_id'         => $ticket->id,
            'method'            => 'wire',
            'amount_cents'      => 50000,
            'amount_wire_cents' => 50000,
            'amount_cash_cents' => 0,
            'amount_card_cents' => 0,
        ]);
    }

    // ─── Mobile single-channel ───────────────────────────────────────────

    public function test_mobile_payment_transitions_ticket_to_paid(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(7500)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'mobile']
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
        $this->assertEquals('paid', $ticket->fresh()->status);
    }

    public function test_mobile_payment_records_correct_amounts(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(7500)->create([
            'created_by' => $this->caissier->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'mobile']
        );

        $this->assertDatabaseHas('payments', [
            'ticket_id'           => $ticket->id,
            'method'              => 'mobile',
            'amount_cents'        => 7500,
            'amount_mobile_cents' => 7500,
            'amount_cash_cents'   => 0,
            'amount_wire_cents'   => 0,
        ]);
    }

    // ─── Insufficient amount ─────────────────────────────────────────────

    public function test_insufficient_mixed_amount_returns_validation_error(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'mixed',
                'amount_cash_cents' => 3000,
                'amount_card_cents' => 2000,
            ]
        );

        $response->assertSessionHasErrors('amount');
        $this->assertEquals('completed', $ticket->fresh()->status);
    }    // ─── Wrong status ────────────────────────────────────────────────────

    /**
     * Cash (full) payment on a pending ticket is now valid — it acts as a
     * pre-payment (is_prepaid=true) and transitions the ticket to `paid`.
     * Sprint 5: pending → paid is an allowed transition.
     */
    public function test_cash_payment_on_pending_ticket_transitions_to_paid(): void
    {
        $ticket = Ticket::factory()->pending()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
        $this->assertEquals('paid', $ticket->fresh()->status);
        $this->assertTrue((bool) $ticket->fresh()->is_prepaid);
    }

    public function test_cannot_pay_paused_ticket(): void
    {
        $ticket = Ticket::factory()->paused()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $response->assertStatus(422);
        $this->assertEquals('paused', $ticket->fresh()->status);
    }

    public function test_cannot_pay_already_paid_ticket(): void
    {
        $ticket = Ticket::factory()->paid()->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $response->assertStatus(422);
    }

    // ─── Sprint 5: advance partial (TC-13) ──────────────────────────────

    /**
     * TC-13 — Advance < total → STATUS_PARTIAL with balance_due tracked.
     * BUG-2 regression test.
     */
    public function test_advance_partial_transitions_ticket_to_partial(): void
    {
        $ticket = Ticket::factory()->pending()->withTotal(20000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'advance',
                'amount_cash_cents' => 8000,
            ]
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));
        $response->assertSessionHas('success');

        $fresh = $ticket->fresh();
        $this->assertEquals('partial', $fresh->status);
        $this->assertEquals(12000, $fresh->balance_due_cents);
        $this->assertFalse((bool) $fresh->is_prepaid);

        $this->assertDatabaseHas('payments', [
            'ticket_id'   => $ticket->id,
            'method'      => 'advance',
            'amount_cents' => 8000,
        ]);
    }

    /**
     * TC-13 flash — advance partial success message contains remaining balance.
     */
    public function test_advance_partial_success_message_contains_balance_due(): void
    {
        $ticket = Ticket::factory()->pending()->withTotal(20000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'advance',
                'amount_cash_cents' => 8000,
            ]
        );

        $response->assertSessionHas('success', fn ($msg) =>
            str_contains($msg, '80.00 MAD') && str_contains($msg, '120.00 MAD')
        );
    }

    /**
     * TC-11 — Advance >= total on pending ticket → STATUS_PAID, is_prepaid=true.
     */
    public function test_advance_full_prepayment_transitions_to_paid(): void
    {
        $ticket = Ticket::factory()->pending()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'advance',
                'amount_cash_cents' => 10000,
            ]
        );

        $fresh = $ticket->fresh();
        $this->assertEquals('paid', $fresh->status);
        $this->assertTrue((bool) $fresh->is_prepaid);
        $this->assertEquals(0, $fresh->balance_due_cents);
    }

    /**
     * TC-15 — Advance = 0 is rejected with validation error.
     */
    public function test_advance_zero_amount_returns_validation_error(): void
    {
        $ticket = Ticket::factory()->pending()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'advance',
                'amount_cash_cents' => 0,
            ]
        );

        $response->assertSessionHasErrors('amount');
        $this->assertEquals('pending', $ticket->fresh()->status);
    }

    // ─── Sprint 5: credit / deferred (TC-18) ────────────────────────────

    /**
     * TC-18 — Credit on completed ticket → STATUS_PARTIAL with full balance_due.
     * BUG-3 regression test.
     */
    public function test_credit_transitions_ticket_to_partial_with_full_balance_due(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(18000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'credit']
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));

        $fresh = $ticket->fresh();
        $this->assertEquals('partial', $fresh->status);
        $this->assertEquals(18000, $fresh->balance_due_cents);
        $this->assertFalse((bool) $fresh->is_prepaid);

        $this->assertDatabaseHas('payments', [
            'ticket_id'    => $ticket->id,
            'method'       => 'credit',
            'amount_cents' => 0,
        ]);
    }

    /**
     * TC-18 flash — credit success message mentions balance and deferred wording.
     */
    public function test_credit_success_message_mentions_deferred_balance(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(18000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'credit']
        );

        $response->assertSessionHas('success', fn ($msg) =>
            str_contains($msg, '180.00 MAD') && str_contains($msg, 'différé')
        );
    }

    /**
     * TC-35 — Credit does NOT award loyalty points even if client is attached.
     */
    public function test_credit_does_not_award_loyalty_points(): void
    {
        $client = Client::factory()->create(['loyalty_points' => 0]);

        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => $client->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'credit']
        );

        $this->assertEquals(0, $client->fresh()->loyalty_points);
        $this->assertDatabaseCount('loyalty_transactions', 0);
    }

    // ─── Sprint 5: balance collection on partial ticket (TC-16) ─────────

    /**
     * TC-16 — Collecting the remaining balance on a partial ticket → STATUS_PAID.
     */
    public function test_balance_collection_on_partial_ticket_transitions_to_paid(): void
    {
        // Ticket already partial with 12000 balance remaining (advance of 8000 on 20000 total)
        $ticket = Ticket::factory()->partial(12000)->withTotal(20000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'cash',
                'amount_cash_cents' => 12000,
            ]
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->ulid));

        $fresh = $ticket->fresh();
        $this->assertEquals('paid', $fresh->status);
        $this->assertEquals(0, $fresh->balance_due_cents);
        $this->assertNotNull($fresh->paid_at);
    }

    /**
     * TC-16 — requiredCents for balance collection is balance_due, not total.
     * Paying exactly balance_due (12000) on a 20000 ticket must succeed.
     */
    public function test_balance_collection_requires_only_balance_due_not_total(): void
    {
        $ticket = Ticket::factory()->partial(12000)->withTotal(20000)->create([
            'created_by' => $this->caissier->id,
        ]);

        // Paying 12000 (= balance_due) on a 20000 ticket — would fail if total were checked
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'cash',
                'amount_cash_cents' => 12000,
            ]
        );

        $response->assertRedirect();
        $this->assertEquals('paid', $ticket->fresh()->status);
    }

    /**
     * TC-16 — Loyalty is awarded at balance collection (final paid), not at advance.
     */
    public function test_loyalty_awarded_at_balance_collection_not_at_advance(): void
    {
        $client = Client::factory()->create(['loyalty_points' => 0]);

        $ticket = Ticket::factory()->partial(12000)->withTotal(20000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => $client->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'cash',
                'amount_cash_cents' => 12000,
            ]
        );

        // Points > 0 — loyalty awarded on final collection (20 pts for 200 MAD total)
        $this->assertGreaterThan(0, $client->fresh()->loyalty_points);
        $this->assertDatabaseHas('loyalty_transactions', [
            'client_id' => $client->id,
            'ticket_id' => $ticket->id,
            'type'      => 'earned',
        ]);
    }

    /**
     * TC-22 — Double credit on an already-partial ticket is blocked at the
     * backend: a credit on a partial ticket resolves to STATUS_PAID (amount=0),
     * but the UI must prevent this. Verify the backend behaviour matches the spec.
     */
    public function test_credit_on_partial_ticket_resolves_to_paid_not_double_partial(): void
    {
        $ticket = Ticket::factory()->partial(18000)->withTotal(18000)->create([
            'created_by' => $this->caissier->id,
        ]);

        // Backend: partial → resolveTargetStatus returns STATUS_PAID regardless of method
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'credit']
        );

        // Should redirect (not 422), and ticket ends up paid (backend closes it)
        $response->assertRedirect();
        $this->assertEquals('paid', $ticket->fresh()->status);
        $this->assertEquals(0, $ticket->fresh()->balance_due_cents);
    }

    // ─── Change calculation ───────────────────────────────────────────────

    public function test_change_is_included_in_success_message(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
        ]);

        // Pay 60 MAD for a 50 MAD ticket → 10 MAD change
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            [
                'method'            => 'mixed',
                'amount_cash_cents' => 6000,
                'amount_card_cents' => 0,
            ]
        );

        $response->assertSessionHas('success', fn ($msg) => str_contains($msg, '10.00 MAD'));

        $this->assertDatabaseHas('payments', [
            'ticket_id'          => $ticket->id,
            'change_given_cents' => 1000,
        ]);
    }

    // ─── Loyalty points ──────────────────────────────────────────────────

    public function test_payment_awards_loyalty_points_to_linked_client(): void
    {
        $client = Client::factory()->create([
            'loyalty_points'    => 0,
            'total_visits'      => 0,
            'total_spent_cents' => 0,
        ]);

        // 100 MAD ticket → 10 points (1pt/10 MAD)
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => $client->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $this->assertEquals(10, $client->fresh()->loyalty_points);
        $this->assertEquals(1,  $client->fresh()->total_visits);
        $this->assertEquals(10000, $client->fresh()->total_spent_cents);
    }

    public function test_payment_creates_loyalty_transaction_record(): void
    {
        $client = Client::factory()->create();
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => $client->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $this->assertDatabaseHas('loyalty_transactions', [
            'client_id' => $client->id,
            'ticket_id' => $ticket->id,
            'type'      => 'earned',
            'points'    => 10,
        ]);
    }

    public function test_success_message_mentions_loyalty_points(): void
    {
        $client = Client::factory()->create();
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => $client->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $response->assertSessionHas('success', fn ($msg) => str_contains($msg, '+10 pts fidélité'));
    }

    public function test_payment_without_client_awards_no_points(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => null,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $this->assertDatabaseCount('loyalty_transactions', 0);
    }

    public function test_tier_upgrades_to_silver_after_10_visits(): void
    {
        $client = Client::factory()->create([
            'loyalty_tier'  => 'standard',
            'total_visits'  => 9,
        ]);

        $ticket = Ticket::factory()->completed()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => $client->id,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket),
            ['method' => 'cash']
        );

        $this->assertEquals('silver', $client->fresh()->loyalty_tier);
        $this->assertEquals(10, $client->fresh()->total_visits);
    }
}
