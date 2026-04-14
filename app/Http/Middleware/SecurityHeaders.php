<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SecurityHeaders — Injecte les headers de sécurité HTTP sur chaque réponse.
 *
 * Headers ajoutés :
 *  - Content-Security-Policy  (CSP)
 *  - Strict-Transport-Security (HSTS)
 *  - X-Frame-Options
 *  - X-Content-Type-Options
 *  - Referrer-Policy
 *  - Permissions-Policy
 *  - X-XSS-Protection (legacy, complément)
 *
 * @see https://owasp.org/www-project-secure-headers/
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // ── CSP nonce ───────────────────────────────────────────────────
        // Generate a fresh per-request nonce BEFORE the view renders so that
        // @vite / @viteReactRefresh Blade directives pick it up automatically.
        // In production this nonce replaces 'unsafe-inline' in script-src,
        // eliminating one of the most impactful XSS-enabling CSP relaxations.
        $nonce = \Illuminate\Support\Facades\Vite::useCspNonce();

        /** @var Response $response */
        $response = $next($request);

        // ── Content-Security-Policy ─────────────────────────────────────
        // En développement, Vite HMR tourne sur http://localhost:5173.
        // IPv6 [::1] n'est pas un token CSP valide — on utilise uniquement
        // localhost / 127.0.0.1 et on force Vite à binder sur localhost (vite.config.js).
        $isProduction = app()->isProduction();
        $isDev = ! $isProduction && app()->environment('local', 'development', 'testing');

        $viteOrigins = $isDev
            ? 'http://localhost:5173 http://127.0.0.1:5173'
            : '';

        // 'unsafe-eval' is only needed by Vite HMR in local dev.
        // It must NOT be present in production — it defeats XSS protection.
        $unsafeEval = $isDev ? " 'unsafe-eval'" : '';

        // In production: use 'nonce-{value}' instead of 'unsafe-inline' so only
        // scripts stamped with the nonce are executed (inline scripts cannot be
        // injected by an attacker without knowing the per-request nonce value).
        // In dev: keep 'unsafe-inline' for easier local debugging.
        $scriptInlineDirective = $isProduction
            ? "'nonce-{$nonce}'"
            : "'unsafe-inline'";

        $csp = implode('; ', array_filter([
            "default-src 'self'",
            "script-src 'self' {$scriptInlineDirective}{$unsafeEval} https://cdn.jsdelivr.net" . ($viteOrigins ? " $viteOrigins" : ''),
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net" . ($viteOrigins ? " $viteOrigins" : ''),
            "font-src 'self' https://fonts.bunny.net data:",
            "img-src 'self' data: blob:",
            "connect-src 'self' wss: ws: https://*.pusher.com https://*.pusherapp.com" . ($viteOrigins ? " $viteOrigins ws://localhost:5173 ws://127.0.0.1:5173" : ''),
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
        ]));

        $response->headers->set('Content-Security-Policy', $csp);

        // ── Strict-Transport-Security (HSTS) ────────────────────────────
        // max-age = 1 an, includeSubDomains, preload-ready
        if ($request->isSecure() || app()->environment('production')) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        // ── Prevent clickjacking ────────────────────────────────────────
        $response->headers->set('X-Frame-Options', 'DENY');

        // ── Prevent MIME-type sniffing ──────────────────────────────────
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // ── Referrer Policy ─────────────────────────────────────────────
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // ── Permissions Policy (désactive caméra, micro, géolocalisation…) ─
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
        );

        // ── Legacy XSS Protection (pour anciens navigateurs) ────────────
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        return $response;
    }
}
