<?php

namespace App\Http\Middleware;

use App\Models\Shift;
use App\Models\StockProduct;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props partagées avec toutes les pages Inertia.
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'     => $user->id,
                    'name'   => $user->name,
                    'email'  => $user->email,
                    'role'   => $user->role,
                    'avatar' => $user->avatar,
                ] : null,
                'activeShift' => $user
                    ? Shift::where('user_id', $user->id)->whereNull('closed_at')->first()
                    : null,
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
                'warning' => session('warning'),
            ],
            'appName' => config('app.name'),
            'stockAlerts' => $user?->role === 'admin'
                ? StockProduct::lowStock()->count()
                : 0,
        ];
    }
}

