<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /** Clés gérées par ce formulaire */
    private const KEYS = [
        'center_name',
        'center_address',
        'center_phone',
        'receipt_footer',
        'currency_symbol',
        'ticket_prefix',
    ];

    public function index(): Response
    {
        $settings = [];
        foreach (self::KEYS as $key) {
            $settings[$key] = Setting::get($key, '');
        }

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'center_name'     => ['nullable', 'string', 'max:100'],
            'center_address'  => ['nullable', 'string', 'max:200'],
            'center_phone'    => ['nullable', 'string', 'max:30'],
            'receipt_footer'  => ['nullable', 'string', 'max:300'],
            'currency_symbol' => ['nullable', 'string', 'max:10'],
            'ticket_prefix'   => ['nullable', 'string', 'max:10', 'regex:/^[A-Z0-9\-]*$/'],
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, $value ?? '');
        }

        return back()->with('success', 'Paramètres enregistrés.');
    }
}
