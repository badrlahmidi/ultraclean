<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
 *
 * Usage dans les routes :
 *   ->middleware('role:admin')
 *   ->middleware('role:admin,caissier')
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active) {
            Auth::logout();
            return redirect()->route('login')
                ->withErrors(['email' => 'Compte inactif ou non trouvé.']);
        }

        if (! $user->hasRole($roles)) {
            abort(403, 'Accès refusé — rôle insuffisant.');
        }

        return $next($request);
    }
}
