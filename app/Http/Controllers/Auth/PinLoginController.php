<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PinLoginController extends Controller
{
    /**
     * Authentifie un utilisateur via son code PIN à 4 chiffres.
     * Utilisé sur les tablettes / écrans tactiles en caisse.
     *
     * POST /login/pin
     * Body: { user_id: int, pin: string(4) }
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'user_id' => ['required', 'integer'],
            'pin'     => ['required', 'string', 'digits:4'],
        ]);

        /** @var User|null $user */
        $user = User::where('id', $request->user_id)
                    ->where('is_active', true)
                    ->first();

        if (! $user || ! Hash::check($request->pin, $user->pin)) {
            throw ValidationException::withMessages([
                'pin' => 'Code PIN incorrect.',
            ]);
        }

        // On déconnecte l'éventuel utilisateur précédent sur cet appareil
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        Auth::login($user, remember: false);
        $request->session()->regenerate();

        // Mettre à jour last_login_at
        $user->update(['last_login_at' => now()]);

        // Audit
        ActivityLog::log('user.pin_login', $user, [
            'user_name' => $user->name,
            'role'      => $user->role,
        ]);

        return redirect($this->redirectPath($user->role));
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
