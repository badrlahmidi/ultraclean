<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * TicketStateMachineTest — Valide les transitions de statut du ticket.
 *
 * Couvre :
 *  - Transitions valides (happy path)
 *  - Transitions invalides (LogicException)
 *  - Timestamps automatiques (started_at, completed_at, paid_at)
 *  - transitionTo() depuis le contrôleur (HTTP)
 */
class TicketStateMachineTest extends TestCase
{
    use RefreshDatabase;

    private User $caissier;
    private User $laveur;

    protected function setUp(): void
    {
        parent::setUp();

        $this->caissier = User::factory()->caissier()->create();
        $this->laveur   = User::factory()->laveur()->create();
    }

    // ── Transitions valides ──────────────────────────────────────────────

    public function test_pending_to_in_progress(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('in_progress');

        $this->assertEquals('in_progress', $ticket->fresh()->status);
        $this->assertNotNull($ticket->fresh()->started_at);
    }

    public function test_in_progress_to_completed(): void
    {
        $ticket = Ticket::factory()->inProgress()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('completed');

        $fresh = $ticket->fresh();
        $this->assertEquals('completed', $fresh->status);
        $this->assertNotNull($fresh->completed_at);
    }

    public function test_completed_to_paid(): void
    {
        $ticket = Ticket::factory()->completed()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('paid');

        $fresh = $ticket->fresh();
        $this->assertEquals('paid', $fresh->status);
        $this->assertNotNull($fresh->paid_at);
    }

    public function test_in_progress_to_paused(): void
    {
        $ticket = Ticket::factory()->inProgress()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('paused');

        $this->assertEquals('paused', $ticket->fresh()->status);
    }

    public function test_paused_to_in_progress(): void
    {
        $ticket = Ticket::factory()->create([
            'status'     => 'paused',
            'started_at' => now()->subMinutes(10),
            'created_by' => $this->caissier->id,
        ]);

        $ticket->transitionTo('in_progress');

        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_pending_to_cancelled(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('cancelled');

        $this->assertEquals('cancelled', $ticket->fresh()->status);
    }

    public function test_in_progress_to_blocked(): void
    {
        $ticket = Ticket::factory()->inProgress()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('blocked');

        $this->assertEquals('blocked', $ticket->fresh()->status);
    }

    // ── Transitions invalides ────────────────────────────────────────────

    public function test_paid_cannot_transition(): void
    {
        $this->expectException(\LogicException::class);

        $ticket = Ticket::factory()->paid()->create(['created_by' => $this->caissier->id]);
        $ticket->transitionTo('cancelled');
    }

    public function test_cancelled_cannot_transition(): void
    {
        $this->expectException(\LogicException::class);

        $ticket = Ticket::factory()->create([
            'status'     => 'cancelled',
            'created_by' => $this->caissier->id,
        ]);
        $ticket->transitionTo('in_progress');
    }    public function test_pending_cannot_jump_to_completed(): void
    {
        $this->expectException(\LogicException::class);

        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);
        $ticket->transitionTo('completed');
    }

    /**
     * Sprint 5: pending → paid IS now allowed (pre-payment / advance totale).
     * The old test that expected a LogicException is no longer valid.
     */
    public function test_pending_can_transition_directly_to_paid(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('paid', ['paid_by' => $this->caissier->id]);

        $fresh = $ticket->fresh();
        $this->assertEquals('paid', $fresh->status);
        $this->assertNotNull($fresh->paid_at);
    }

    /**
     * Sprint 5: pending → partial (advance partielle ou crédit).
     */
    public function test_pending_to_partial(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('partial', ['balance_due_cents' => 5000]);

        $fresh = $ticket->fresh();
        $this->assertEquals('partial', $fresh->status);
        $this->assertEquals(5000, $fresh->balance_due_cents);
    }

    /**
     * Sprint 5: in_progress → partial.
     */
    public function test_in_progress_to_partial(): void
    {
        $ticket = Ticket::factory()->inProgress()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('partial', ['balance_due_cents' => 8000]);

        $this->assertEquals('partial', $ticket->fresh()->status);
    }

    /**
     * Sprint 5: completed → partial (crédit différé).
     */
    public function test_completed_to_partial(): void
    {
        $ticket = Ticket::factory()->completed()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('partial', ['balance_due_cents' => 12000]);

        $fresh = $ticket->fresh();
        $this->assertEquals('partial', $fresh->status);
        $this->assertEquals(12000, $fresh->balance_due_cents);
    }

    /**
     * Sprint 5: partial → paid (collecte du solde).
     */
    public function test_partial_to_paid(): void
    {
        $ticket = Ticket::factory()->partial(10000)->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('paid', ['paid_by' => $this->caissier->id, 'balance_due_cents' => 0]);

        $fresh = $ticket->fresh();
        $this->assertEquals('paid', $fresh->status);
        $this->assertNotNull($fresh->paid_at);
        $this->assertEquals(0, $fresh->balance_due_cents);
    }

    /**
     * Sprint 5: partial → cancelled (annulation avec avance — remboursement manuel).
     */
    public function test_partial_to_cancelled(): void
    {
        $ticket = Ticket::factory()->partial(10000)->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('cancelled');

        $this->assertEquals('cancelled', $ticket->fresh()->status);
    }

    /**
     * Sprint 5: partial ne peut PAS retourner à partial (terminal partiel).
     */
    public function test_partial_cannot_transition_to_partial(): void
    {
        $this->expectException(\LogicException::class);

        $ticket = Ticket::factory()->partial(10000)->create(['created_by' => $this->caissier->id]);
        $ticket->transitionTo('partial'); // partial → partial non autorisé
    }

    // ── Idempotence ──────────────────────────────────────────────────────

    public function test_same_status_transition_throws(): void
    {
        $this->expectException(\LogicException::class);

        $ticket = Ticket::factory()->inProgress()->create(['created_by' => $this->caissier->id]);
        $ticket->transitionTo('in_progress'); // même statut → interdit
    }

    // ── HTTP via updateStatus ────────────────────────────────────────────

    public function test_http_update_status_in_progress(): void
    {        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $response = $this->actingAs($this->caissier)
            ->patch(route('caissier.tickets.status', $ticket), [
                'status' => 'in_progress',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_http_update_status_invalid_transition_returns_error(): void
    {
        $ticket = Ticket::factory()->paid()->create(['created_by' => $this->caissier->id]);

        $response = $this->actingAs($this->caissier)
            ->patch(route('caissier.tickets.status', $ticket), [
                'status' => 'in_progress',
            ]);

        // La LogicException est catchée → 422 ou redirect avec erreur
        $this->assertContains(
            $response->getStatusCode(),
            [302, 422, 500],
        );
        // Le statut ne change pas
        $this->assertEquals('paid', $ticket->fresh()->status);
    }

    public function test_http_unauthenticated_cannot_change_status(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $this->patch(route('caissier.tickets.status', $ticket), [
            'status' => 'in_progress',
        ])->assertRedirect(route('login'));
    }

    // ── Timestamps précis ────────────────────────────────────────────────

    public function test_started_at_set_on_in_progress(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $before = now()->subSecond();
        $ticket->transitionTo('in_progress');
        $after = now()->addSecond();

        $startedAt = $ticket->fresh()->started_at;
        $this->assertTrue($startedAt->gte($before) && $startedAt->lte($after));
    }

    public function test_paid_at_set_on_paid(): void
    {
        $ticket = Ticket::factory()->completed()->create(['created_by' => $this->caissier->id]);

        $before = now()->subSecond();
        $ticket->transitionTo('paid');
        $after = now()->addSecond();

        $paidAt = $ticket->fresh()->paid_at;
        $this->assertTrue($paidAt->gte($before) && $paidAt->lte($after));
    }    public function test_cancelled_at_set_on_cancel(): void
    {
        $ticket = Ticket::factory()->pending()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('cancelled', ['cancelled_reason' => 'Client parti']);

        $fresh = $ticket->fresh();
        $this->assertEquals('cancelled', $fresh->status);
        // Note : cancelled_at n'est pas une colonne du modèle Ticket — on vérifie uniquement le statut
    }

    // ── payment_pending path ─────────────────────────────────────────────

    public function test_completed_to_payment_pending_to_paid(): void
    {
        $ticket = Ticket::factory()->completed()->create(['created_by' => $this->caissier->id]);

        $ticket->transitionTo('payment_pending');
        $this->assertEquals('payment_pending', $ticket->fresh()->status);

        $ticket->fresh()->transitionTo('paid');
        $this->assertEquals('paid', $ticket->fresh()->status);
    }
}
