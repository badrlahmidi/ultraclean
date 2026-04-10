<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * WasherSchedulerTest — Valide le calcul de file d'attente des laveurs.
 *
 * Couvre :
 *  - Laveur libre → queueMinutes = 0
 *  - Un ticket pending → queueMinutes = estimated_duration
 *  - Un ticket in_progress → soustrait le temps écoulé
 *  - Un ticket paused → chrono figé
 *  - Multi-tickets → somme correcte
 *  - Rôle assistant → compté dans la file
 *  - applyBusinessHours → overflow → report lendemain
 *  - feasibilityCheck → tableau complet
 */
class WasherSchedulerTest extends TestCase
{
    use RefreshDatabase;

    private User $laveur;
    private User $caissier;    protected function setUp(): void
    {
        parent::setUp();

        // Fixer l'heure à 14h00 pour rendre tous les tests indépendants du moment d'exécution.
        // 14:00 + 30 min  = 14:30 < 21:00 → pas d'overflow pour les tests courts.
        // 14:00 + 600 min = 00:00+1j > 21:00 → overflow pour test_feasibility_includes_overflow_warning.
        Carbon::setTestNow(Carbon::today()->setTime(14, 0, 0));

        $this->laveur  = User::factory()->laveur()->create();
        $this->caissier = User::factory()->caissier()->create();        // Horaires standard pour les tests (clés canoniques lues par WasherScheduler)
        Setting::set('opening_time',  '08:00');
        Setting::set('closing_time',  '21:00');
        Setting::set('business_days', [1, 2, 3, 4, 5, 6]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow(); // réinitialise l'horloge Carbon
        parent::tearDown();
    }

    // ── File vide ────────────────────────────────────────────────────────

    public function test_free_washer_returns_zero_queue_minutes(): void
    {
        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(0, $minutes);
    }

    // ── Ticket pending ───────────────────────────────────────────────────

    public function test_one_pending_ticket_equals_estimated_duration(): void
    {
        Ticket::factory()->pending()->create([
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
            'estimated_duration' => 30,
        ]);

        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(30, $minutes);
    }

    public function test_two_pending_tickets_are_summed(): void
    {
        Ticket::factory()->pending()->create([
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
            'estimated_duration' => 20,
        ]);
        Ticket::factory()->pending()->create([
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
            'estimated_duration' => 15,
        ]);

        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(35, $minutes);
    }

    // ── Ticket in_progress ───────────────────────────────────────────────

    public function test_in_progress_ticket_subtracts_elapsed_time(): void
    {
        Ticket::factory()->create([
            'status'             => 'in_progress',
            'started_at'         => now()->subMinutes(10),
            'estimated_duration' => 30,
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
        ]);

        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        // 30 - 10 = 20 minutes restantes (± 1 min tolérance timing)
        $this->assertEqualsWithDelta(20, $minutes, 1);
    }

    public function test_completed_ticket_is_not_counted(): void
    {
        Ticket::factory()->completed()->create([
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
            'estimated_duration' => 30,
        ]);

        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(0, $minutes);
    }

    // ── Ticket paused ────────────────────────────────────────────────────

    public function test_paused_ticket_chrono_frozen(): void
    {
        // Ticket démarré il y a 5 min, pausé il y a 2 min → 5 - 2 = 3 min écoulées → reste 27 min
        $startedAt = now()->subMinutes(5);
        $pausedAt  = now()->subMinutes(2);

        Ticket::factory()->create([
            'status'             => 'paused',
            'started_at'         => $startedAt,
            'paused_at'          => $pausedAt,
            'total_paused_seconds' => 0,
            'estimated_duration' => 30,
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
        ]);

        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        // Attendu : 30 - 3 = 27 (± 1)
        $this->assertEqualsWithDelta(27, $minutes, 1);
    }

    // ── Rôle assistant ────────────────────────────────────────────────────

    public function test_assistant_role_counted_in_queue(): void
    {
        // Le laveur est assistant sur un ticket assigné à quelqu'un d'autre
        $otherLaveur = User::factory()->laveur()->create();

        $ticket = Ticket::factory()->pending()->create([
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $otherLaveur->id,
            'estimated_duration' => 25,
        ]);

        TicketWasher::create([
            'ticket_id' => $ticket->id,
            'user_id'   => $this->laveur->id,
            'role'      => TicketWasher::ROLE_ASSISTANT,
        ]);

        $minutes = \App\Services\WasherScheduler::queueMinutesForWasher($this->laveur->id);

        $this->assertEquals(25, $minutes);
    }

    // ── applyBusinessHours ────────────────────────────────────────────────

    public function test_within_hours_no_change(): void
    {
        // 14h00 → dans les horaires → pas de modification
        $rawEnd = now()->setTime(14, 0, 0);

        $result = \App\Services\WasherScheduler::applyBusinessHours($rawEnd);

        $this->assertEquals($rawEnd->toDateTimeString(), $result->toDateTimeString());
    }

    public function test_overflow_reports_to_next_morning(): void
    {
        // 21h30 → déborde de 30 min → lendemain 08h30
        $rawEnd = now()->setTime(21, 30, 0);

        $result = \App\Services\WasherScheduler::applyBusinessHours($rawEnd);

        $this->assertEquals(8,  $result->hour);
        $this->assertEquals(30, $result->minute);
        $this->assertEquals(now()->addDay()->toDateString(), $result->toDateString());
    }

    public function test_exactly_at_close_time_no_overflow(): void
    {
        // Exactement 21h00 → dans les horaires (lte closeToday)
        $rawEnd = now()->setTime(21, 0, 0);

        $result = \App\Services\WasherScheduler::applyBusinessHours($rawEnd);

        $this->assertEquals($rawEnd->toDateTimeString(), $result->toDateTimeString());
    }

    // ── feasibilityCheck ─────────────────────────────────────────────────

    public function test_feasibility_free_washer(): void
    {
        $result = \App\Services\WasherScheduler::feasibilityCheck($this->laveur->id, 0);

        $this->assertEquals(0, $result['queue_minutes']);
        $this->assertNull($result['due_at']);
        $this->assertFalse($result['overflow']);
        $this->assertNull($result['warning']);
    }

    public function test_feasibility_with_duration_computes_due_at(): void
    {
        $result = \App\Services\WasherScheduler::feasibilityCheck($this->laveur->id, 30);

        $this->assertEquals(0, $result['queue_minutes']);
        $this->assertNotNull($result['due_at']);
        $this->assertFalse($result['overflow']);
    }    public function test_feasibility_includes_overflow_warning(): void
    {
        // Force a 600-min queue so the result overflows well past 21:00 close.
        // (closing_time is already 21:00 from setUp)

        // Ticket pending de 600 minutes → dépasse largement 21h
        Ticket::factory()->pending()->create([
            'created_by'         => $this->caissier->id,
            'assigned_to'        => $this->laveur->id,
            'estimated_duration' => 600,
        ]);

        $result = \App\Services\WasherScheduler::feasibilityCheck($this->laveur->id, 0);

        $this->assertTrue($result['overflow']);
        $this->assertNotNull($result['warning']);
        $this->assertStringContainsString('demain', $result['warning']);
    }

    // ── computeDueAt ─────────────────────────────────────────────────────

    public function test_compute_due_at_returns_carbon_instance(): void
    {
        $dueAt = \App\Services\WasherScheduler::computeDueAt($this->laveur->id, 30);

        $this->assertInstanceOf(\Carbon\Carbon::class, $dueAt);
        $this->assertTrue($dueAt->gt(now()));
    }
}
