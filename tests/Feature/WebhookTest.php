<?php

namespace Tests\Feature;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * WebhookTest — Valide WebhookController::paymentConfirmed()
 *
 * Couvre :
 *  - Ticket completed → paid via webhook (happy path)
 *  - Idempotence : ticket déjà paid → 200 already_paid
 *  - Ticket introuvable → 404
 *  - Transition impossible (pending) → 422
 *  - Signature HMAC invalide → 401
 *  - Signature HMAC valide → 200
 *  - HMAC obligatoire (secret vide) → 503
 *  - Statut "failed" → 200 failed_noted, statut inchangé
 *  - Référence paiement stockée
 */
class WebhookTest extends TestCase
{
    use RefreshDatabase;

    private const TEST_SECRET = 'test-webhook-secret-key-for-unit-tests';

    protected function setUp(): void
    {
        parent::setUp();
        // Par défaut, chaque test utilise un secret HMAC valide
        Config::set('services.payment_webhook_secret', self::TEST_SECRET);
    }

    private function url(string $ulid): string
    {
        return "/webhooks/payment/{$ulid}";
    }

    private function makeCompletedTicket(): Ticket
    {
        $user = User::factory()->caissier()->create();
        return Ticket::factory()->completed()->create(['created_by' => $user->id]);
    }

    private function sign(string $body, ?string $secret = null): string
    {
        return 'sha256=' . hash_hmac('sha256', $body, $secret ?? self::TEST_SECRET);
    }

    /**
     * Envoie un POST signé HMAC au webhook.
     */
    private function signedPost(string $url, array $payload, ?string $secret = null): \Illuminate\Testing\TestResponse
    {
        $body = json_encode($payload);
        $sig  = $this->sign($body, $secret);

        return $this->withHeaders(['X-Webhook-Signature' => $sig])
                    ->postJson($url, $payload);
    }

        // ── Happy path ────────────────────────────────────────────────────────

    public function test_completed_ticket_becomes_paid(): void
    {
        $ticket = $this->makeCompletedTicket();

        $response = $this->signedPost($this->url($ticket->ulid), [
            'status'    => 'paid',
            'reference' => 'REF-001',
        ]);

        $response->assertOk()->assertJson(['ok' => true, 'status' => 'paid']);
        $this->assertEquals('paid', $ticket->fresh()->status);
        $this->assertNotNull($ticket->fresh()->paid_at);
    }

    public function test_payment_reference_is_stored(): void
    {
        $ticket = $this->makeCompletedTicket();

        $this->signedPost($this->url($ticket->ulid), [
            'status'    => 'paid',
            'reference' => 'EXT-PAY-2025',
        ]);

        $this->assertEquals('EXT-PAY-2025', $ticket->fresh()->payment_reference);
    }

    // ── Idempotence ───────────────────────────────────────────────────────

    public function test_already_paid_returns_already_paid(): void
    {
        $user   = User::factory()->caissier()->create();
        $ticket = Ticket::factory()->paid()->create(['created_by' => $user->id]);

        $response = $this->signedPost($this->url($ticket->ulid), ['status' => 'paid']);

        $response->assertOk()->assertJson(['ok' => true, 'status' => 'already_paid']);
        $this->assertEquals('paid', $ticket->fresh()->status);
    }

    // ── Erreurs métier ────────────────────────────────────────────────────

    public function test_unknown_ulid_returns_404(): void
    {
        $this->signedPost($this->url('01HHHHHHHHHHHHHHHHHHHHHHXX'), ['status' => 'paid'])
            ->assertNotFound();
    }

    public function test_pending_ticket_returns_422(): void
    {
        $user   = User::factory()->caissier()->create();
        $ticket = Ticket::factory()->pending()->create(['created_by' => $user->id]);

        $this->signedPost($this->url($ticket->ulid), ['status' => 'paid'])
            ->assertUnprocessable();

        $this->assertEquals('pending', $ticket->fresh()->status);
    }

    public function test_invalid_status_field_returns_422(): void
    {
        $ticket = $this->makeCompletedTicket();

        $this->signedPost($this->url($ticket->ulid), ['status' => 'unknown_value'])
            ->assertUnprocessable();
    }

    // ── Statut failed ─────────────────────────────────────────────────────

    public function test_failed_status_does_not_change_ticket(): void
    {
        $ticket = $this->makeCompletedTicket();

        $response = $this->signedPost($this->url($ticket->ulid), ['status' => 'failed']);

        $response->assertOk()->assertJson(['ok' => true, 'status' => 'failed_noted']);
        $this->assertEquals('completed', $ticket->fresh()->status);
    }

    // ── HMAC ─────────────────────────────────────────────────────────────

    public function test_hmac_disabled_when_secret_empty(): void
    {
        Config::set('services.payment_webhook_secret', '');

        $ticket = $this->makeCompletedTicket();

        // Secret vide → webhook non configuré → 503 Service Unavailable
        $this->postJson($this->url($ticket->ulid), ['status' => 'paid'])
            ->assertServiceUnavailable();
    }

    public function test_valid_hmac_signature_is_accepted(): void
    {
        $secret = 'test-secret-key-12345';
        Config::set('services.payment_webhook_secret', $secret);

        $ticket  = $this->makeCompletedTicket();
        $body    = json_encode(['status' => 'paid', 'reference' => null]);
        $sig     = $this->sign($body, $secret);

        $this->withHeaders(['X-Webhook-Signature' => $sig])
            ->postJson($this->url($ticket->ulid), json_decode($body, true))
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_invalid_hmac_signature_returns_401(): void
    {
        Config::set('services.payment_webhook_secret', 'real-secret');

        $ticket = $this->makeCompletedTicket();

        $this->withHeaders(['X-Webhook-Signature' => 'sha256=invalidsignature'])
            ->postJson($this->url($ticket->ulid), ['status' => 'paid'])
            ->assertUnauthorized();

        $this->assertEquals('completed', $ticket->fresh()->status);
    }

    public function test_missing_signature_header_returns_401_when_secret_set(): void
    {
        Config::set('services.payment_webhook_secret', 'real-secret');

        $ticket = $this->makeCompletedTicket();

        $this->postJson($this->url($ticket->ulid), ['status' => 'paid'])
            ->assertUnauthorized();
    }

    public function test_wrong_secret_returns_401(): void
    {
        Config::set('services.payment_webhook_secret', 'correct-secret');

        $ticket = $this->makeCompletedTicket();
        $body   = json_encode(['status' => 'paid']);
        $sig    = $this->sign($body, 'wrong-secret');

        $this->withHeaders(['X-Webhook-Signature' => $sig])
            ->postJson($this->url($ticket->ulid), json_decode($body, true))
            ->assertUnauthorized();
    }
}
