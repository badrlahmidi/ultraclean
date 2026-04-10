<?php

namespace Tests\Unit;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests des Policies — Sprint 2 sécurité (HAUTE-4).
 *
 * Vérifie que l'autorisation fine respecte les règles métier :
 *  - Admin : accès total
 *  - Caissier : CRUD tickets/clients, shift propre, pas d'accès B2B
 *  - Laveur : lecture seule, uniquement ses tickets assignés
 */
class PolicyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $caissier;
    private User $laveur;
    private User $otherLaveur;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin       = User::factory()->admin()->create();
        $this->caissier    = User::factory()->caissier()->create();
        $this->laveur      = User::factory()->laveur()->create();
        $this->otherLaveur = User::factory()->laveur()->create();
    }

    // ════════════════════════════════════════════════════════════════════
    //  TicketPolicy
    // ════════════════════════════════════════════════════════════════════

    public function test_admin_can_do_everything_on_tickets(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertTrue($this->admin->can('view', $ticket));
        $this->assertTrue($this->admin->can('create', Ticket::class));
        $this->assertTrue($this->admin->can('update', $ticket));
        $this->assertTrue($this->admin->can('updateStatus', $ticket));
        $this->assertTrue($this->admin->can('pay', $ticket));
        $this->assertTrue($this->admin->can('delete', $ticket));
    }

    public function test_caissier_can_view_all_tickets(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertTrue($this->caissier->can('viewAny', Ticket::class));
        $this->assertTrue($this->caissier->can('view', $ticket));
    }

    public function test_caissier_can_create_tickets(): void
    {
        $this->assertTrue($this->caissier->can('create', Ticket::class));
    }

    public function test_caissier_can_update_and_pay_tickets(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertTrue($this->caissier->can('update', $ticket));
        $this->assertTrue($this->caissier->can('updateStatus', $ticket));
        $this->assertTrue($this->caissier->can('pay', $ticket));
    }

    public function test_caissier_cannot_delete_tickets(): void
    {
        $ticket = Ticket::factory()->create();
        $this->assertFalse($this->caissier->can('delete', $ticket));
    }

    public function test_laveur_can_view_own_assigned_ticket(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertTrue($this->laveur->can('view', $ticket));
    }

    public function test_laveur_cannot_view_other_laveur_ticket(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->otherLaveur->id]);

        $this->assertFalse($this->laveur->can('view', $ticket));
    }

    public function test_laveur_can_view_ticket_as_assistant(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->otherLaveur->id]);

        // Add laveur as assistant via pivot
        TicketWasher::create([
            'ticket_id' => $ticket->id,
            'user_id'   => $this->laveur->id,
            'role'      => TicketWasher::ROLE_ASSISTANT,
        ]);

        $this->assertTrue($this->laveur->can('view', $ticket));
    }

    public function test_laveur_can_update_status_own_ticket(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertTrue($this->laveur->can('updateStatus', $ticket));
    }

    public function test_laveur_cannot_update_status_other_ticket(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->otherLaveur->id]);

        $this->assertFalse($this->laveur->can('updateStatus', $ticket));
    }

    public function test_laveur_cannot_create_tickets(): void
    {
        $this->assertFalse($this->laveur->can('create', Ticket::class));
    }

    public function test_laveur_cannot_pay_tickets(): void
    {
        $ticket = Ticket::factory()->create(['assigned_to' => $this->laveur->id]);
        $this->assertFalse($this->laveur->can('pay', $ticket));
    }

    // ════════════════════════════════════════════════════════════════════
    //  ClientPolicy
    // ════════════════════════════════════════════════════════════════════

    public function test_admin_can_do_everything_on_clients(): void
    {
        $client = Client::factory()->create();

        $this->assertTrue($this->admin->can('viewAny', Client::class));
        $this->assertTrue($this->admin->can('view', $client));
        $this->assertTrue($this->admin->can('create', Client::class));
        $this->assertTrue($this->admin->can('update', $client));
        $this->assertTrue($this->admin->can('delete', $client));
    }

    public function test_caissier_can_crud_clients(): void
    {
        $client = Client::factory()->create();

        $this->assertTrue($this->caissier->can('viewAny', Client::class));
        $this->assertTrue($this->caissier->can('view', $client));
        $this->assertTrue($this->caissier->can('create', Client::class));
        $this->assertTrue($this->caissier->can('update', $client));
    }

    public function test_caissier_cannot_delete_clients(): void
    {
        $client = Client::factory()->create();
        $this->assertFalse($this->caissier->can('delete', $client));
    }

    public function test_laveur_can_only_view_clients(): void
    {
        $client = Client::factory()->create();

        $this->assertTrue($this->laveur->can('viewAny', Client::class));
        $this->assertTrue($this->laveur->can('view', $client));
        $this->assertFalse($this->laveur->can('create', Client::class));
        $this->assertFalse($this->laveur->can('update', $client));
        $this->assertFalse($this->laveur->can('delete', $client));
    }

    // ════════════════════════════════════════════════════════════════════
    //  ShiftPolicy
    // ════════════════════════════════════════════════════════════════════

    public function test_admin_can_do_everything_on_shifts(): void
    {
        $shift = Shift::create([
            'user_id'            => $this->caissier->id,
            'opened_at'          => now(),
            'opening_cash_cents' => 10000,
        ]);

        $this->assertTrue($this->admin->can('viewAny', Shift::class));
        $this->assertTrue($this->admin->can('view', $shift));
        $this->assertTrue($this->admin->can('close', $shift));
    }

    public function test_caissier_can_view_own_shift(): void
    {
        $shift = Shift::create([
            'user_id'            => $this->caissier->id,
            'opened_at'          => now(),
            'opening_cash_cents' => 10000,
        ]);

        $this->assertTrue($this->caissier->can('view', $shift));
        $this->assertTrue($this->caissier->can('close', $shift));
    }

    public function test_caissier_cannot_close_other_shift(): void
    {
        $otherCaissier = User::factory()->caissier()->create();
        $shift = Shift::create([
            'user_id'            => $otherCaissier->id,
            'opened_at'          => now(),
            'opening_cash_cents' => 10000,
        ]);

        $this->assertFalse($this->caissier->can('view', $shift));
        $this->assertFalse($this->caissier->can('close', $shift));
    }

    public function test_laveur_has_no_shift_access(): void
    {
        $shift = Shift::create([
            'user_id'            => $this->caissier->id,
            'opened_at'          => now(),
            'opening_cash_cents' => 10000,
        ]);

        $this->assertFalse($this->laveur->can('viewAny', Shift::class));
        $this->assertFalse($this->laveur->can('view', $shift));
        $this->assertFalse($this->laveur->can('close', $shift));
    }

    // ════════════════════════════════════════════════════════════════════
    //  InvoicePolicy — B2B admin-only
    // ════════════════════════════════════════════════════════════════════

    public function test_admin_can_manage_invoices(): void
    {
        $invoice = Invoice::factory()->create();

        $this->assertTrue($this->admin->can('viewAny', Invoice::class));
        $this->assertTrue($this->admin->can('view', $invoice));
        $this->assertTrue($this->admin->can('create', Invoice::class));
        $this->assertTrue($this->admin->can('update', $invoice));
        $this->assertTrue($this->admin->can('delete', $invoice));
        $this->assertTrue($this->admin->can('pay', $invoice));
    }

    public function test_caissier_cannot_access_invoices(): void
    {
        $invoice = Invoice::factory()->create();

        $this->assertFalse($this->caissier->can('viewAny', Invoice::class));
        $this->assertFalse($this->caissier->can('view', $invoice));
        $this->assertFalse($this->caissier->can('create', Invoice::class));
        $this->assertFalse($this->caissier->can('update', $invoice));
    }

    public function test_laveur_cannot_access_invoices(): void
    {
        $invoice = Invoice::factory()->create();

        $this->assertFalse($this->laveur->can('viewAny', Invoice::class));
        $this->assertFalse($this->laveur->can('view', $invoice));
    }

    // ════════════════════════════════════════════════════════════════════
    //  QuotePolicy — B2B admin-only
    // ════════════════════════════════════════════════════════════════════

    public function test_admin_can_manage_quotes(): void
    {
        $quote = Quote::factory()->create();

        $this->assertTrue($this->admin->can('viewAny', Quote::class));
        $this->assertTrue($this->admin->can('view', $quote));
        $this->assertTrue($this->admin->can('create', Quote::class));
        $this->assertTrue($this->admin->can('update', $quote));
        $this->assertTrue($this->admin->can('delete', $quote));
    }

    public function test_caissier_cannot_access_quotes(): void
    {
        $quote = Quote::factory()->create();

        $this->assertFalse($this->caissier->can('viewAny', Quote::class));
        $this->assertFalse($this->caissier->can('view', $quote));
        $this->assertFalse($this->caissier->can('create', Quote::class));
    }

    // ════════════════════════════════════════════════════════════════════
    //  AppointmentPolicy
    // ════════════════════════════════════════════════════════════════════

    public function test_admin_can_manage_appointments(): void
    {
        $appt = Appointment::factory()->create();

        $this->assertTrue($this->admin->can('viewAny', Appointment::class));
        $this->assertTrue($this->admin->can('view', $appt));
        $this->assertTrue($this->admin->can('create', Appointment::class));
        $this->assertTrue($this->admin->can('update', $appt));
        $this->assertTrue($this->admin->can('delete', $appt));
        $this->assertTrue($this->admin->can('convertToTicket', $appt));
    }

    public function test_caissier_can_view_and_convert_appointments(): void
    {
        $appt = Appointment::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertTrue($this->caissier->can('viewAny', Appointment::class));
        $this->assertTrue($this->caissier->can('view', $appt));
        $this->assertTrue($this->caissier->can('convertToTicket', $appt));
    }

    public function test_caissier_cannot_create_or_delete_appointments(): void
    {
        $appt = Appointment::factory()->create();

        $this->assertFalse($this->caissier->can('create', Appointment::class));
        $this->assertFalse($this->caissier->can('update', $appt));
        $this->assertFalse($this->caissier->can('delete', $appt));
    }

    public function test_laveur_can_view_own_appointments_only(): void
    {
        $ownAppt   = Appointment::factory()->create(['assigned_to' => $this->laveur->id]);
        $otherAppt = Appointment::factory()->create(['assigned_to' => $this->otherLaveur->id]);

        $this->assertTrue($this->laveur->can('viewAny', Appointment::class));
        $this->assertTrue($this->laveur->can('view', $ownAppt));
        $this->assertFalse($this->laveur->can('view', $otherAppt));
    }

    public function test_laveur_cannot_manage_appointments(): void
    {
        $appt = Appointment::factory()->create(['assigned_to' => $this->laveur->id]);

        $this->assertFalse($this->laveur->can('create', Appointment::class));
        $this->assertFalse($this->laveur->can('update', $appt));
        $this->assertFalse($this->laveur->can('delete', $appt));
        $this->assertFalse($this->laveur->can('convertToTicket', $appt));
    }    // ════════════════════════════════════════════════════════════════════
    //  HTTP integration — verify policies actually block requests
    // ════════════════════════════════════════════════════════════════════

    public function test_laveur_gets_403_on_ticket_show_for_unassigned_ticket(): void
    {        $ticket = Ticket::factory()->create(['assigned_to' => $this->otherLaveur->id]);

        // Pass model instance — route key is ulid (via getRouteKeyName)
        $this->actingAs($this->laveur)
             ->get(route('caissier.tickets.show', $ticket))
             ->assertForbidden();
    }

    public function test_caissier_gets_403_on_client_delete(): void
    {
        $client = Client::factory()->create();

        $this->actingAs($this->caissier)
             ->delete(route('caissier.clients.destroy', $client))
             ->assertForbidden();
    }

    public function test_caissier_gets_403_on_other_shift_close(): void
    {
        $otherCaissier = User::factory()->caissier()->create();
        $shift = Shift::create([
            'user_id'            => $otherCaissier->id,
            'opened_at'          => now(),
            'opening_cash_cents' => 10000,
        ]);

        $this->actingAs($this->caissier)
             ->patch(route('caissier.shift.close', $shift), [
                 'closing_cash_cents' => 15000,
             ])
             ->assertForbidden();
    }
}
