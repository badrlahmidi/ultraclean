<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // ── Trust proxies (Hostinger LiteSpeed / shared hosting proxy) ──
        $middleware->trustProxies(at: '*');

        // ── Security headers (CSP, HSTS, X-Frame-Options…) ─────────────
        $middleware->web(append: [
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ── Sentry : remonter toutes les exceptions non gérées ──────────
        Integration::handles($exceptions);

        // ── Pages d'erreur Inertia (remplace les vues Blade brutes) ─────
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response) {
            $status = $response->getStatusCode();
            if (in_array($status, [403, 404, 419, 500, 503], true) && request()->header('X-Inertia')) {
                return \Inertia\Inertia::render("Errors/{$status}")
                    ->toResponse(request())
                    ->setStatusCode($status);
            }
            return $response;
        });
    })->create();
