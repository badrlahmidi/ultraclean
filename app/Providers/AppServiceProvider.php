<?php

namespace App\Providers;

use App\Jobs\CheckOverdueInvoices;
use App\Jobs\CheckStockLevels;
use App\Jobs\ExpirePaymentPendingTickets;
use App\Jobs\GenerateRecurringTickets;
use App\Jobs\SendAppointmentReminders;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Service;
use App\Models\ServiceVehiclePrice;
use App\Models\Shift;
use App\Models\Ticket;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleType;
use App\Observers\CatalogCacheObserver;
use App\Observers\TicketObserver;
use App\Policies\AppointmentPolicy;
use App\Policies\ClientPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\QuotePolicy;
use App\Policies\ShiftPolicy;
use App\Policies\TicketPolicy;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fix for older MySQL/MariaDB versions: key length limit (utf8mb4 = 4 bytes/char, max 767 bytes)
        Schema::defaultStringLength(191);

        // Force HTTPS in production — Hostinger sits behind LiteSpeed/proxy
        // which may not forward the correct scheme to Laravel.
        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        // ARCH-ITEM-3.2d — Eloquent Strict Mode in non-production environments.
        // Catches lazy loading, silently discarded attributes, and missing attribute
        // access early — prevents these issues from reaching production silently.
        Model::preventLazyLoading(! app()->isProduction());
        Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
        Model::preventAccessingMissingAttributes(! app()->isProduction());

        // ── Policies ─────────────────────────────────────────────────────────
        Gate::policy(Ticket::class, TicketPolicy::class);
        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(Shift::class, ShiftPolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(Quote::class, QuotePolicy::class);
        Gate::policy(Appointment::class, AppointmentPolicy::class);

        // ── Observers ────────────────────────────────────────────────────────
        Ticket::observe(TicketObserver::class);

        // Cache bust when catalog data changes (Sprint 3.7)
        Service::observe(CatalogCacheObserver::class);
        VehicleType::observe(CatalogCacheObserver::class);
        VehicleBrand::observe(CatalogCacheObserver::class);
        VehicleModel::observe(CatalogCacheObserver::class);
        ServiceVehiclePrice::observe(CatalogCacheObserver::class);

        // ── Scheduler ────────────────────────────────────────────────────────
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            // Rollback auto des paiements async en timeout (Wave, Orange Money…)
            $schedule->job(ExpirePaymentPendingTickets::class)
                     ->everyFiveMinutes()
                     ->name('expire-payment-pending-tickets')
                     ->withoutOverlapping();

            // Génération automatique des tickets récurrents (templates)
            $schedule->job(GenerateRecurringTickets::class)
                     ->hourly()
                     ->name('generate-recurring-tickets')
                     ->withoutOverlapping();

            // Rappels de rendez-vous (~1h avant)
            $schedule->job(SendAppointmentReminders::class)
                     ->everyFifteenMinutes()
                     ->name('send-appointment-reminders')
                     ->withoutOverlapping();

            // Vérification stock bas (quotidien 8h)
            $schedule->job(CheckStockLevels::class)
                     ->dailyAt('08:00')
                     ->name('check-stock-levels')
                     ->withoutOverlapping();

            // Vérification factures en retard (quotidien 9h)
            $schedule->job(CheckOverdueInvoices::class)
                     ->dailyAt('09:00')
                     ->name('check-overdue-invoices')
                     ->withoutOverlapping();
        });
    }
}

