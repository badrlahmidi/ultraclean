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

        $response = $this->post(route('caissier.tickets.pay', $ticket->id), [
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
            route('caissier.tickets.pay', $ticket->id),
            ['method' => 'cash']
        );

        $response->assertRedirect(route('caissier.tickets.show', $ticket->id));
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
            route('caissier.tickets.pay', $ticket->id),
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
            route('caissier.tickets.pay', $ticket->id),
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
            route('caissier.tickets.pay', $ticket->id),
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

    // ─── Insufficient amount ─────────────────────────────────────────────

    public function test_insufficient_mixed_amount_returns_validation_error(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket->id),
            [
                'method'            => 'mixed',
                'amount_cash_cents' => 3000,
                'amount_card_cents' => 2000,
            ]
        );

        $response->assertSessionHasErrors('amount');
        $this->assertEquals('completed', $ticket->fresh()->status);
    }

    // ─── Wrong status ────────────────────────────────────────────────────

    public function test_cannot_pay_pending_ticket(): void
    {
        $ticket = Ticket::factory()->pending()->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket->id),
            ['method' => 'cash']
        );

        $response->assertStatus(422);
        $this->assertEquals('pending', $ticket->fresh()->status);
    }

    public function test_cannot_pay_already_paid_ticket(): void
    {
        $ticket = Ticket::factory()->paid()->create([
            'created_by' => $this->caissier->id,
        ]);

        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket->id),
            ['method' => 'cash']
        );

        $response->assertStatus(422);
    }

    // ─── Change calculation ───────────────────────────────────────────────

    public function test_change_is_included_in_success_message(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(5000)->create([
            'created_by' => $this->caissier->id,
        ]);

        // Pay 60 MAD for a 50 MAD ticket → 10 MAD change
        $response = $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket->id),
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
            route('caissier.tickets.pay', $ticket->id),
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
            route('caissier.tickets.pay', $ticket->id),
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
            route('caissier.tickets.pay', $ticket->id),
            ['method' => 'cash']
        );

        $response->assertSessionHas('success', fn ($msg) => str_contains($msg, '+10 points'));
    }

    public function test_payment_without_client_awards_no_points(): void
    {
        $ticket = Ticket::factory()->completed()->withTotal(10000)->create([
            'created_by' => $this->caissier->id,
            'client_id'  => null,
        ]);

        $this->actingAs($this->caissier)->post(
            route('caissier.tickets.pay', $ticket->id),
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
            route('caissier.tickets.pay', $ticket->id),
            ['method' => 'cash']
        );

        $this->assertEquals('silver', $client->fresh()->loyalty_tier);
        $this->assertEquals(10, $client->fresh()->total_visits);
    }
}
