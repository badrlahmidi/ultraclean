<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{    /** Clés gérées par ce formulaire */    private const KEYS = [
        // Centre
        'center_name',
        'center_subtitle',
        'center_address',
        'center_phone',
        'center_city',
        'center_logo',
        // Tickets & impression
        'receipt_footer',
        'currency_symbol',
        'ticket_prefix',
        'receipt_paper_width',
        'receipt_show_logo',
        'receipt_show_qr',
        'receipt_template',
        'receipt_show_client_phone',
        'receipt_show_operator',
        'receipt_show_payment_detail',
        'receipt_show_dates',
        // Horaires d'ouverture
        'business_open_hour',
        'business_open_minute',
        'business_close_hour',
        'business_close_minute',
        'business_days',
        // Caisse & Shifts
        'shift.require_opening_cash',
        'shift.alert_difference_cents',
        // Tickets
        'ticket.pending_alert_minutes',
        'ticket.auto_assign',
        // Fiscal
        'tax_rate',
        'invoice_prefix',
        'invoice_footer',
        'invoice_due_days',
        'quote_validity_days',
        // Portail client
        'portal_show_team',
        'portal_show_price',
        // Paiement
        'enabled_payment_methods',
        'auto_print_receipt',
        // Fidélité
        'loyalty.enabled',
        'loyalty.points_per_mad',
        'loyalty.silver_threshold',
        'loyalty.gold_threshold',
        'loyalty.silver_discount_percent',
        'loyalty.gold_discount_percent',
        // Notifications
        'notif.email_new_ticket',
        'notif.email_daily_summary',
        'notif.alert_email',
    ];public function index(): Response
    {        $settings = Setting::getMany(self::KEYS);

        // Valeurs par défaut
        if (empty($settings['enabled_payment_methods'])) {
            $settings['enabled_payment_methods'] = ['cash', 'card', 'mobile', 'wire', 'mixed', 'advance', 'credit'];
        }
        if (empty($settings['business_days'])) {
            $settings['business_days'] = [1, 2, 3, 4, 5, 6];
        }

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {        $data = $request->validate([            'center_name'          => ['nullable', 'string', 'max:100'],
            'center_subtitle'      => ['nullable', 'string', 'max:150'],
            'center_address'       => ['nullable', 'string', 'max:200'],
            'center_phone'         => ['nullable', 'string', 'max:30'],
            'center_city'          => ['nullable', 'string', 'max:100'],
            'receipt_footer'       => ['nullable', 'string', 'max:300'],
            'currency_symbol'      => ['nullable', 'string', 'max:10'],
            'ticket_prefix'        => ['nullable', 'string', 'max:10', 'regex:/^[A-Z0-9\-]*$/'],
            'receipt_paper_width'  => ['nullable', 'string', 'in:58mm,80mm'],            'receipt_show_logo'    => ['nullable', 'boolean'],
            'receipt_show_qr'      => ['nullable', 'boolean'],
            'receipt_template'            => ['nullable', 'string', 'in:minimal,detailed'],
            'receipt_show_client_phone'   => ['nullable', 'boolean'],
            'receipt_show_operator'       => ['nullable', 'boolean'],
            'receipt_show_payment_detail' => ['nullable', 'boolean'],
            'receipt_show_dates'          => ['nullable', 'boolean'],
            'logo'                 => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024'],
            'remove_logo'          => ['nullable', 'boolean'],
            // Horaires
            'business_open_hour'   => ['nullable', 'integer', 'min:0', 'max:23'],
            'business_open_minute' => ['nullable', 'integer', 'min:0', 'max:59'],
            'business_close_hour'  => ['nullable', 'integer', 'min:0', 'max:23'],
            'business_close_minute'=> ['nullable', 'integer', 'min:0', 'max:59'],
            'business_days'        => ['nullable', 'array'],
            'business_days.*'      => ['integer', 'min:0', 'max:6'],
            // Caisse & Shifts
            'shift.require_opening_cash'    => ['nullable', 'boolean'],
            'shift.alert_difference_cents'  => ['nullable', 'integer', 'min:0'],
            // Tickets
            'ticket.pending_alert_minutes'  => ['nullable', 'integer', 'min:1', 'max:1440'],
            'ticket.auto_assign'            => ['nullable', 'boolean'],
            // Fiscal
            'tax_rate'             => ['nullable', 'numeric', 'min:0', 'max:100'],
            'invoice_prefix'       => ['nullable', 'string', 'max:10', 'regex:/^[A-Z0-9\-]*$/'],
            'invoice_footer'       => ['nullable', 'string', 'max:300'],
            'invoice_due_days'     => ['nullable', 'integer', 'min:0', 'max:365'],
            'quote_validity_days'  => ['nullable', 'integer', 'min:0', 'max:365'],
            // Portail
            'portal_show_team'     => ['nullable', 'boolean'],
            'portal_show_price'    => ['nullable', 'boolean'],
            // Paiement
            'enabled_payment_methods'   => ['nullable', 'array'],
            'enabled_payment_methods.*' => ['string', 'in:cash,card,mobile,wire,mixed,advance,credit'],
            'auto_print_receipt'        => ['nullable', 'boolean'],
            // Fidélité
            'loyalty.enabled'                => ['nullable', 'boolean'],
            'loyalty.points_per_mad'         => ['nullable', 'integer', 'min:0'],
            'loyalty.silver_threshold'       => ['nullable', 'integer', 'min:0'],
            'loyalty.gold_threshold'         => ['nullable', 'integer', 'min:0'],
            'loyalty.silver_discount_percent'=> ['nullable', 'integer', 'min:0', 'max:100'],
            'loyalty.gold_discount_percent'  => ['nullable', 'integer', 'min:0', 'max:100'],
            // Notifications
            'notif.email_new_ticket'    => ['nullable', 'boolean'],
            'notif.email_daily_summary' => ['nullable', 'boolean'],
            'notif.alert_email'         => ['nullable', 'email', 'max:150'],
        ]);        foreach ($data as $key => $value) {
            if (in_array($key, ['logo', 'remove_logo'])) continue;

            if (in_array($key, ['enabled_payment_methods', 'business_days'])) {
                Setting::updateOrCreate(
                    ['key' => $key],
                    ['value' => json_encode($value ?? []), 'type' => 'json']
                );
                \Cache::forget("setting:{$key}");
                continue;
            }

            Setting::set($key, $value ?? '');
        }

        // Remove logo if explicitly requested
        if ($request->boolean('remove_logo')) {
            Setting::set('center_logo', '');
        }

        // Handle logo upload (overrides remove)
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            Setting::set('center_logo', Storage::url($path));
        }

        return back()->with('success', 'Paramètres enregistrés.');
    }
}
