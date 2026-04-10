<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\ActivityLog;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status'           => session('status'),
            // Centre branding (logo + nom configurés dans Paramètres)
            'centerName'       => Setting::get('center_name', ''),
            'centerLogo'       => Setting::get('center_logo', ''),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();
        $request->session()->regenerate();

        $user = $request->user();
        $user->update(['last_login_at' => now()]);

        ActivityLog::log('user.login', $user, [
            'user_name' => $user->name,
            'role'      => $user->role,
            'method'    => 'email',
        ]);

        return redirect($this->redirectPath($user->role));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    private function redirectPath(string $role): string
    {
        return match ($role) {
            'admin'    => route('admin.dashboard'),
            'caissier' => route('caissier.dashboard'),
            'laveur'   => route('laveur.queue'),
            default    => route('dashboard'),
        };
    }
}
