<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="description" content="RitajPOS — Système de gestion pour centre de lavage automobile. Gestion des tickets, fidélité, rapports et statistiques en temps réel.">
        <meta name="theme-color" content="#2563eb">
        <meta name="color-scheme" content="light">

        <title inertia>{{ config('app.name', 'RitajPOS') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- PWA -->
        <link rel="manifest" href="/manifest.json">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png">

        <!-- Scripts -->
        @routes(['nonce' => \Illuminate\Support\Facades\Vite::cspNonce()])
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia

        <script nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}">
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' });
                });
            }
        </script>
    </body>
</html>
