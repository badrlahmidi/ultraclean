<!DOCTYPE html>
<html lang="fr" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title') — {{ config('app.name', 'UltraClean') }}</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
        }
        .error-container {
            text-align: center;
            padding: 2rem;
            max-width: 480px;
        }
        .error-code {
            font-size: 7rem;
            font-weight: 800;
            line-height: 1;
            background: linear-gradient(135deg, #3b82f6, #06b6d4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-top: 1rem;
            color: #f1f5f9;
        }
        .error-message {
            margin-top: 0.75rem;
            color: #94a3b8;
            line-height: 1.6;
        }
        .error-action {
            margin-top: 2rem;
        }
        .error-action a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: #3b82f6;
            color: #fff;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
        }
        .error-action a:hover {
            background: #2563eb;
        }
        .error-brand {
            margin-top: 3rem;
            font-size: 0.8rem;
            color: #475569;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code">@yield('code')</div>
        <h1 class="error-title">@yield('title')</h1>
        <p class="error-message">@yield('message')</p>
        <div class="error-action">
            <a href="{{ url('/') }}">← Retour à l'accueil</a>
        </div>
        <p class="error-brand">{{ config('app.name', 'UltraClean') }}</p>
    </div>
</body>
</html>
