<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Tests des URLs signées — Sprint 2 sécurité (MOY-5).
 *
 * Vérifie que la route publique de suivi de ticket
 * nécessite une signature valide (protection anti-énumération).
 */
class SignedUrlTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_ticket_requires_signed_url(): void
    {
        $ticket = Ticket::factory()->create();

        // Unsigned request → 403
        $this->get("/ticket/{$ticket->ulid}")
             ->assertForbidden();
    }

    public function test_public_ticket_works_with_valid_signed_url(): void
    {
        $ticket = Ticket::factory()->create();

        $signedUrl = URL::signedRoute('ticket.public', ['ulid' => $ticket->ulid], now()->addDays(7));

        $this->get($signedUrl)
             ->assertOk();
    }

    public function test_public_ticket_rejects_tampered_signed_url(): void
    {
        $ticket = Ticket::factory()->create();

        $signedUrl = URL::signedRoute('ticket.public', ['ulid' => $ticket->ulid], now()->addDays(7));

        // Tamper with the signature
        $tampered = str_replace('signature=', 'signature=TAMPERED', $signedUrl);

        $this->get($tampered)
             ->assertForbidden();
    }

    public function test_public_ticket_rejects_expired_signed_url(): void
    {
        $ticket = Ticket::factory()->create();

        // Generate a URL that already expired
        $signedUrl = URL::signedRoute('ticket.public', ['ulid' => $ticket->ulid], now()->subMinute());

        $this->get($signedUrl)
             ->assertForbidden();
    }

    public function test_signed_url_helper_generates_valid_url(): void
    {
        $ticket = Ticket::factory()->create();

        $url = \App\Http\Controllers\PublicTicketController::signedUrl($ticket->ulid);

        $this->assertStringContainsString('signature=', $url);
        $this->assertStringContainsString($ticket->ulid, $url);

        // The generated URL should work
        $this->get($url)->assertOk();
    }
}
