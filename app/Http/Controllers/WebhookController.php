<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * WebhookController — Réception des callbacks de paiement externe.
 *
 * Sécurité : vérification HMAC-SHA256 avec la clé `PAYMENT_WEBHOOK_SECRET`
 * du .env. Si la signature est absente ou invalide → 401.
 *
 * Payload attendu (JSON) :
 *   { "ulid": "...", "status": "paid"|"failed", "reference": "..." }
 */
class WebhookController extends Controller
{
    public function paymentConfirmed(Request $request, string $ulid): JsonResponse
    {        // ── 1. Vérification HMAC ────────────────────────────────────────────
        $secret = config('services.payment_webhook_secret');

        if (! $secret) {
            Log::critical('[Webhook] PAYMENT_WEBHOOK_SECRET not configured — rejecting request');
            return response()->json(['error' => 'Webhook not configured'], 503);
        }

        $signature = $request->header('X-Webhook-Signature') ?? '';
        $expected  = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);        if (! hash_equals($expected, $signature)) {
            Log::warning('[Webhook] Signature invalide', [
                'ulid'      => $ulid,
                'ip'        => $request->ip(),
                'signature' => substr($signature, 0, 20) . '…',
            ]);
            return response()->json(['error' => 'Signature invalide'], 401);
        }

        // ── 2. Validation payload ───────────────────────────────────────────
        $data = $request->validate([
            'status'    => ['required', 'in:paid,failed'],
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        // ── 3. Récupération ticket ──────────────────────────────────────────
        $ticket = Ticket::where('ulid', $ulid)->first();

        if (! $ticket) {
            return response()->json(['error' => 'Ticket introuvable'], 404);
        }        // ── 4. Transition d'état ────────────────────────────────────────────
        if ($data['status'] === 'paid') {
            try {
                // Le ticket doit être completed pour passer à paid
                if ($ticket->status === 'completed') {
                    $ticket->transitionTo('paid');

                    // Stocker la référence paiement si fournie
                    if (! empty($data['reference'])) {
                        $ticket->update(['payment_reference' => $data['reference']]);
                    }

                    Log::info('[Webhook] Ticket payé via webhook', [
                        'ticket_id' => $ticket->id,
                        'ulid'      => $ulid,
                        'reference' => $data['reference'] ?? null,
                    ]);

                    return response()->json(['ok' => true, 'status' => 'paid']);
                }

                // Déjà payé → idempotent
                if ($ticket->status === 'paid') {
                    return response()->json(['ok' => true, 'status' => 'already_paid']);
                }

                return response()->json([
                    'error'  => 'Transition impossible',
                    'status' => $ticket->status,
                ], 422);

            } catch (\Exception $e) {
                Log::error('[Webhook] Erreur transition', [
                    'ulid'  => $ulid,
                    'error' => $e->getMessage(),
                ]);
                return response()->json(['error' => 'Erreur interne'], 500);
            }
        }

        // Statut "failed" → juste logger, pas de changement d'état
        Log::info('[Webhook] Paiement échoué signalé', ['ulid' => $ulid]);

        return response()->json(['ok' => true, 'status' => 'failed_noted']);
    }
}
