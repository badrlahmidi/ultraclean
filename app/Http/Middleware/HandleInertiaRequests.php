<?php

namespace App\Http\Middleware;

use App\Models\Shift;
use App\Models\StockProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /**
     * TTL (seconds) for the per-user active-shift cache entry.
     * Short enough to reflect open/close operations promptly; long enough to
     * avoid a DB hit on every page navigation.
     */
    private const ACTIVE_SHIFT_CACHE_TTL = 30;

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Props partagées avec toutes les pages Inertia.
     *
     * ARCH-ITEM-2.9: All setting reads are batched into a single Setting::getMany()
     * call instead of 3–4 individual Setting::get() calls per request.
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        // Eager-load userRole + permissions pour éviter N+1
        if ($user && ! $user->relationLoaded('userRole')) {
            $user->load('userRole.permissions');
        }

        // Single batched DB round-trip for all shared settings.
        $settings = \App\Models\Setting::getMany([
            'center_logo',
            'enabled_payment_methods',
            'auto_print_receipt',
        ], [
            'center_logo'             => '',
            'enabled_payment_methods' => null,
            'auto_print_receipt'      => false,
        ]);

        $paymentMethods = (is_array($settings['enabled_payment_methods']) && count($settings['enabled_payment_methods']) > 0)
            ? $settings['enabled_payment_methods']
            : ['cash', 'card', 'mobile', 'wire', 'mixed', 'advance', 'credit'];

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'           => $user->id,
                    'name'         => $user->name,
                    'email'        => $user->email,
                    'role'         => $user->role,
                    'role_display' => $user->userRole?->display_name ?? ucfirst($user->role ?? ''),
                    'role_color'   => $user->userRole?->color ?? 'gray-500',
                    'avatar'       => $user->avatar,
                ] : null,
                'permissions' => $user
                    ? ($user->isAdmin()
                        // Admin : liste complète des permissions en base
                        ? \App\Models\Permission::pluck('name')->all()
                        : ($user->userRole?->permissionNames() ?? []))
                    : [],
                'activeShift' => $user && in_array($user->role, ['admin', 'caissier'])
                    ? Cache::remember(
                        "active_shift:{$user->id}",
                        self::ACTIVE_SHIFT_CACHE_TTL,
                        fn () => Shift::where('user_id', $user->id)->whereNull('closed_at')->first()
                    )
                    : null,
            ],
            'flash' => [
                'success' => session('success'),
                'error'   => session('error'),
                'warning' => session('warning'),
            ],
            'appName'               => config('app.name'),
            'centerLogo'            => $settings['center_logo'] ?? '',
            'enabledPaymentMethods' => $paymentMethods,
            'autoPrintReceipt'      => (bool) ($settings['auto_print_receipt'] ?? false),
            'stockAlerts'           => $user?->role === 'admin'
                ? Cache::remember('stock_alerts_count', 60, fn () => StockProduct::lowStock()->count())
                : 0,
        ];
    }
}

