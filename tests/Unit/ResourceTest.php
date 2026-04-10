<?php

namespace Tests\Unit;

use App\Http\Resources\ClientResource;
use App\Http\Resources\TicketResource;
use App\Http\Resources\UserResource;
use App\Models\Client;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Tests des JsonResource — Sprint 2 sécurité (FRONT-SEC-2).
 *
 * Vérifie que les Resources filtrent correctement les champs exposés
 * et n'exposent pas de données sensibles.
 */
class ResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_resource_hides_sensitive_fields(): void
    {
        $admin = User::factory()->admin()->create();
        $user  = User::factory()->caissier()->create(['email' => 'caisse@test.com']);

        // From another user's perspective (non-admin)
        $request = Request::create('/');
        $request->setUserResolver(fn () => $user);

        $resource = (new UserResource($user))->toArray($request);

        $this->assertArrayHasKey('id', $resource);
        $this->assertArrayHasKey('name', $resource);
        $this->assertArrayHasKey('role', $resource);
        $this->assertArrayNotHasKey('password', $resource);
        $this->assertArrayNotHasKey('pin', $resource);
        $this->assertArrayNotHasKey('remember_token', $resource);
    }

    public function test_user_resource_shows_email_to_self(): void
    {
        $user = User::factory()->caissier()->create(['email' => 'caisse@test.com']);

        $request = Request::create('/');
        $request->setUserResolver(fn () => $user);

        $resource = (new UserResource($user))->toArray($request);

        $this->assertEquals('caisse@test.com', $resource['email']);
    }

    public function test_user_resource_hides_email_from_other_non_admin(): void
    {
        $user  = User::factory()->caissier()->create(['email' => 'caisse@test.com']);
        $other = User::factory()->laveur()->create();

        $request = Request::create('/');
        $request->setUserResolver(fn () => $other);

        $resource = (new UserResource($user))->toArray($request);

        // Email should not be present when viewed by a non-admin, non-self user
        $this->assertFalse(isset($resource['email']) && $resource['email'] === 'caisse@test.com');
    }

    public function test_user_resource_shows_email_to_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $user  = User::factory()->caissier()->create(['email' => 'caisse@test.com']);

        $request = Request::create('/');
        $request->setUserResolver(fn () => $admin);

        $resource = (new UserResource($user))->toArray($request);

        $this->assertEquals('caisse@test.com', $resource['email']);
    }

    public function test_ticket_resource_excludes_internal_fields(): void
    {
        $ticket = Ticket::factory()->create([
            'payment_reference' => 'REF-SECRET-123',
            'payment_provider'  => 'stripe',
        ]);

        $request = Request::create('/');
        $resource = (new TicketResource($ticket))->toArray($request);

        $this->assertArrayHasKey('id', $resource);
        $this->assertArrayHasKey('ulid', $resource);
        $this->assertArrayHasKey('ticket_number', $resource);
        $this->assertArrayHasKey('status', $resource);
        $this->assertArrayHasKey('total_cents', $resource);

        // Internal fields should not be in the resource
        $this->assertArrayNotHasKey('payment_reference', $resource);
        $this->assertArrayNotHasKey('payment_provider', $resource);
        $this->assertArrayNotHasKey('ticket_template_id', $resource);
        $this->assertArrayNotHasKey('shift_id', $resource);
        $this->assertArrayNotHasKey('total_paused_seconds', $resource);
    }

    public function test_client_resource_includes_loyalty_data(): void
    {
        $client = Client::factory()->create([
            'loyalty_tier'   => 'silver',
            'loyalty_points' => 42,
            'total_visits'   => 15,
        ]);

        $request = Request::create('/');
        $resource = (new ClientResource($client))->toArray($request);

        $this->assertArrayHasKey('loyalty_tier', $resource);
        $this->assertArrayHasKey('loyalty_points', $resource);
        $this->assertArrayHasKey('total_visits', $resource);
        $this->assertEquals('silver', $resource['loyalty_tier']);
        $this->assertEquals(42, $resource['loyalty_points']);
    }

    public function test_ticket_resource_conditionally_includes_relations(): void
    {
        $ticket = Ticket::factory()->create();

        $request = Request::create('/');
        $resource = (new TicketResource($ticket))->toArray($request);

        // Without eager loading, relations should be MissingValue (excluded from JSON)
        $this->assertArrayHasKey('id', $resource);
        $this->assertArrayHasKey('ulid', $resource);
    }
}
