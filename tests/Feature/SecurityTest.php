<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Ticket;
use App\Models\TicketWasher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * SecurityTest — Sprint 4.2 : Tests de sécurité transversaux.
 *
 * Couvre :
 *  - IDOR : un laveur ne peut pas agir sur le ticket d'un autre laveur
 *  - Rate limiting : le PIN login bloque après 5 tentatives
 *  - Role isolation : les laveurs ne peuvent pas accéder aux routes caissier/admin
 *  - RBAC middleware : vérification du middleware CheckRole
 */
class SecurityTest extends TestCase
{
    use RefreshDatabase;

    // ════════════════════════════════════════════════════════════════════
    //  IDOR — Protection contre l'accès inter-laveurs (HAUTE-2)
    // ════════════════════════════════════════════════════════════════════

    public function test_laveur_cannot_start_another_laveurs_ticket(): void
    {
        $laveur1 = User::factory()->laveur()->create();
        $laveur2 = User::factory()->laveur()->create();

        $ticket = Ticket::factory()->pending()->create([
            'assigned_to' => $laveur1->id,
        ]);

        // Laveur2 tries to start laveur1's ticket → 403
        $response = $this->actingAs($laveur2)
            ->patch(route('laveur.tickets.start', $ticket));

        $response->assertForbidden();
        $this->assertEquals('pending', $ticket->fresh()->status);
    }

    public function test_laveur_can_start_own_assigned_ticket(): void
    {
        $laveur = User::factory()->laveur()->create();

        $ticket = Ticket::factory()->pending()->create([
            'assigned_to' => $laveur->id,
        ]);

        $response = $this->actingAs($laveur)
            ->patch(route('laveur.tickets.start', $ticket));

        $response->assertRedirect();
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_laveur_cannot_complete_another_laveurs_ticket(): void
    {
        $laveur1 = User::factory()->laveur()->create();
        $laveur2 = User::factory()->laveur()->create();

        $ticket = Ticket::factory()->inProgress()->create([
            'assigned_to' => $laveur1->id,
        ]);

        $response = $this->actingAs($laveur2)
            ->patch(route('laveur.tickets.complete', $ticket));

        $response->assertForbidden();
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_admin_can_start_any_laveurs_ticket(): void
    {
        $admin  = User::factory()->admin()->create();
        $laveur = User::factory()->laveur()->create();

        $ticket = Ticket::factory()->pending()->create([
            'assigned_to' => $laveur->id,
        ]);

        $response = $this->actingAs($admin)
            ->patch(route('laveur.tickets.start', $ticket));

        $response->assertRedirect();
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    public function test_caissier_can_start_any_laveurs_ticket(): void
    {
        $caissier = User::factory()->caissier()->create();
        $laveur   = User::factory()->laveur()->create();

        $ticket = Ticket::factory()->pending()->create([
            'assigned_to' => $laveur->id,
        ]);

        $response = $this->actingAs($caissier)
            ->patch(route('laveur.tickets.start', $ticket));

        $response->assertRedirect();
        $this->assertEquals('in_progress', $ticket->fresh()->status);
    }

    // ════════════════════════════════════════════════════════════════════
    //  Rate Limiting — PIN login (CRITIQUE-1)
    // ════════════════════════════════════════════════════════════════════

    public function test_pin_login_blocks_after_5_failed_attempts(): void
    {
        $user = User::factory()->caissier()->create([
            'pin' => Hash::make('1234'),
        ]);

        // Clear any existing rate limiter state
        RateLimiter::clear("pin-login:127.0.0.1:{$user->id}");

        // 5 wrong attempts
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('login.pin'), [
                'user_id' => $user->id,
                'pin'     => '0000',
            ]);
        }

        // 6th attempt should be rate-limited
        $response = $this->post(route('login.pin'), [
            'user_id' => $user->id,
            'pin'     => '1234', // Even with correct PIN
        ]);

        $response->assertSessionHasErrors('pin');
        $this->assertGuest();
    }

    public function test_pin_login_succeeds_with_correct_pin(): void
    {
        $user = User::factory()->caissier()->create([
            'pin' => Hash::make('5678'),
        ]);

        RateLimiter::clear("pin-login:127.0.0.1:{$user->id}");

        $response = $this->post(route('login.pin'), [
            'user_id' => $user->id,
            'pin'     => '5678',
        ]);

        $response->assertRedirect();
        $this->assertAuthenticatedAs($user);
    }

    public function test_pin_login_rejects_inactive_user(): void
    {
        $user = User::factory()->caissier()->create([
            'pin'       => Hash::make('1234'),
            'is_active' => false,
        ]);

        $response = $this->post(route('login.pin'), [
            'user_id' => $user->id,
            'pin'     => '1234',
        ]);

        $response->assertSessionHasErrors('pin');
        $this->assertGuest();
    }

    // ════════════════════════════════════════════════════════════════════
    //  Role Isolation — CheckRole middleware
    // ════════════════════════════════════════════════════════════════════

    public function test_laveur_cannot_access_caissier_routes(): void
    {
        $laveur = User::factory()->laveur()->create();

        $this->actingAs($laveur)
            ->get(route('caissier.dashboard'))
            ->assertForbidden();
    }

    public function test_laveur_cannot_access_admin_routes(): void
    {
        $laveur = User::factory()->laveur()->create();

        $this->actingAs($laveur)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_caissier_cannot_access_admin_routes(): void
    {
        $caissier = User::factory()->caissier()->create();

        $this->actingAs($caissier)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_admin_can_access_all_route_groups(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk();

        $this->actingAs($admin)
            ->get(route('caissier.dashboard'))
            ->assertOk();

        $this->actingAs($admin)
            ->get(route('laveur.queue'))
            ->assertOk();
    }

    public function test_unauthenticated_user_is_redirected_to_login(): void
    {
        $this->get(route('caissier.dashboard'))
            ->assertRedirect(route('login'));
    }

    // ════════════════════════════════════════════════════════════════════
    //  Payment IDOR — Only pay own-scope tickets
    // ════════════════════════════════════════════════════════════════════

    public function test_laveur_cannot_pay_a_ticket(): void
    {
        $laveur = User::factory()->laveur()->create();
        $ticket = Ticket::factory()->completed()->create();

        $response = $this->actingAs($laveur)
            ->post(route('caissier.tickets.pay', $ticket), [
                'method' => 'cash',
            ]);

        // Should be blocked by role middleware (caissier routes)
        $response->assertForbidden();
    }

    // ════════════════════════════════════════════════════════════════════
    //  Security Headers
    // ════════════════════════════════════════════════════════════════════

    public function test_security_headers_are_present(): void
    {
        $user = User::factory()->admin()->create();

        $response = $this->actingAs($user)
            ->get(route('admin.dashboard'));

        $response->assertHeader('X-Frame-Options');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy');
    }

    // ════════════════════════════════════════════════════════════════════
    //  Signed URL — Public ticket tracking (MOY-5)
    // ════════════════════════════════════════════════════════════════════

    public function test_unsigned_public_ticket_url_is_rejected(): void
    {
        $ticket = Ticket::factory()->create();

        $this->get("/ticket/{$ticket->ulid}")
            ->assertForbidden();
    }
}
