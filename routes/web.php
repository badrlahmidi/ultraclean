<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AppointmentController;
use App\Http\Controllers\Admin\ClientController as AdminClientController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\InvoiceController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\PurchaseController;
use App\Http\Controllers\Admin\QuoteController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SupplierController;
use App\Http\Controllers\Admin\TicketTemplateController;
use App\Http\Controllers\Admin\EmployeeController;
use App\Http\Controllers\Admin\PromotionController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\LoyaltyController;
use App\Http\Controllers\Admin\StockController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VehicleBrandController;
use App\Http\Controllers\Admin\VehicleTypeController;
use App\Http\Controllers\Auth\PinLoginController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Caissier\ClientController;
use App\Http\Controllers\Caissier\DashboardController as CaissierDashboardController;
use App\Http\Controllers\Caissier\ExpenseController;
use App\Http\Controllers\Caissier\PaymentController;
use App\Http\Controllers\Caissier\PlanningController;
use App\Http\Controllers\Caissier\ShiftController;
use App\Http\Controllers\Caissier\TicketController;
use App\Http\Controllers\Laveur\QueueController;
use App\Http\Controllers\Laveur\StatsController as LaveurStatsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Routes publiques (non authentifiées)
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => redirect()->route('login'));

// Public ticket tracking (signed URL — prevents enumeration even if ULID leaks)
Route::get('/ticket/{ulid}', [\App\Http\Controllers\PublicTicketController::class, 'show'])
    ->name('ticket.public')
    ->middleware(['signed', 'throttle:100,15']);

// Webhook paiement async (HMAC-sécurisé, pas d'auth session)
Route::post('/webhooks/payment/{ulid}', [\App\Http\Controllers\WebhookController::class, 'paymentConfirmed'])
    ->name('webhooks.payment')
    ->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class]);

// Checkin rapide par QR code (pas d'auth — signed URL prevents ULID enumeration)
Route::get('/client/checkin/{ulid}', [ClientController::class, 'checkin'])
    ->name('client.checkin')
    ->middleware('signed');

// Promo code validation (auth required, any role)
Route::middleware(['auth', 'throttle:60,1'])->post('/api/promotions/validate', [PromotionController::class, 'validate'])->name('promotions.validate');

// Sellable products API for POS (barcode scanning)
Route::middleware(['auth', 'throttle:60,1'])->group(function () {
    Route::get('/api/sellable-products', [\App\Http\Controllers\Admin\SellableProductController::class, 'listForPos'])->name('api.sellable-products.list');
    Route::post('/api/sellable-products/barcode', [\App\Http\Controllers\Admin\SellableProductController::class, 'findByBarcode'])->name('api.sellable-products.barcode');
});

Route::post('login/pin', [PinLoginController::class, 'store'])
    ->middleware(['guest', 'throttle:10,1'])
    ->name('login.pin');

/*
|--------------------------------------------------------------------------
| Routes authentifiées
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {    // Profil utilisateur (tous rôles)
    Route::get('/profile',    [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile',  [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Notifications in-app (tous rôles)
    Route::get('/notifications',              [\App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all',    [\App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}',      [\App\Http\Controllers\NotificationController::class, 'dismiss'])->name('notifications.dismiss');
    Route::delete('/notifications',           [\App\Http\Controllers\NotificationController::class, 'clearAll'])->name('notifications.clear-all');

    // Redirection intelligente par rôle
    Route::get('/dashboard', function () {
        return match (auth()->user()->role) {
            'admin'    => redirect()->route('admin.dashboard'),
            'caissier' => redirect()->route('caissier.dashboard'),
            'laveur'   => redirect()->route('laveur.queue'),
            default    => redirect()->route('login'),
        };
    })->name('dashboard');

    /*
    |----------------------------------------------------------------------
    | Admin
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {

        Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

        // Utilisateurs
        Route::get('/users',           [UserController::class, 'index'])->name('users.index');
        Route::post('/users',          [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}',    [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');        // Services & grille tarifaire
        Route::get('/services',              [ServiceController::class, 'index'])->name('services.index');
        Route::post('/services',             [ServiceController::class, 'store'])->name('services.store');
        Route::put('/services/{service}',    [ServiceController::class, 'update'])->name('services.update');
        Route::delete('/services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');

        // Catégories de prix (vehicle_types)
        Route::get('/price-categories',                         [VehicleTypeController::class, 'index'])->name('price-categories.index');
        Route::post('/price-categories',                        [VehicleTypeController::class, 'store'])->name('price-categories.store');
        Route::put('/price-categories/{priceCategory}',         [VehicleTypeController::class, 'update'])->name('price-categories.update');
        Route::delete('/price-categories/{priceCategory}',      [VehicleTypeController::class, 'destroy'])->name('price-categories.destroy');        // Rapports
        Route::get('/reports',            [ReportsController::class, 'index'])->name('reports.index');
        Route::get('/reports/tickets',    [ReportsController::class, 'indexTickets'])->name('reports.tickets');
        Route::get('/reports/caisse',     [ReportsController::class, 'indexCaisse'])->name('reports.caisse');
        Route::get('/reports/vehicles',   [ReportsController::class, 'indexVehicles'])->name('reports.vehicles');
        Route::get('/reports/shifts',     [ReportsController::class, 'indexShifts'])->name('reports.shifts');
        Route::get('/reports/export/pdf', [ReportsController::class, 'exportPdf'])->name('reports.export.pdf');
        Route::get('/reports/export/csv', [ReportsController::class, 'exportCsv'])->name('reports.export.csv');// Performance laveurs
        Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');        // Promotions & codes promo
        Route::get('/promotions',                [PromotionController::class, 'index'])->name('promotions.index');
        Route::post('/promotions',               [PromotionController::class, 'store'])->name('promotions.store');
        Route::put('/promotions/{promotion}',    [PromotionController::class, 'update'])->name('promotions.update');
        Route::delete('/promotions/{promotion}', [PromotionController::class, 'destroy'])->name('promotions.destroy');

        // Gestion du stock (consommables internes)
        Route::get('/stock',                              [StockController::class, 'index'])->name('stock.index');
        Route::get('/stock/create',                       [StockController::class, 'create'])->name('stock.create');
        Route::post('/stock',                             [StockController::class, 'store'])->name('stock.store');
        Route::put('/stock/{stock}',                      [StockController::class, 'update'])->name('stock.update');
        Route::delete('/stock/{stock}',                   [StockController::class, 'destroy'])->name('stock.destroy');
        Route::post('/stock/{stock}/movement',            [StockController::class, 'addMovement'])->name('stock.movement');
        Route::get('/stock/{stock}/movements',            [StockController::class, 'movements'])->name('stock.movements');
        Route::post('/services/{service}/stock-products', [StockController::class, 'syncServiceProducts'])->name('services.stock.sync');

        // Produits à vendre (sellable products)
        Route::get('/sellable-products',                                 [\App\Http\Controllers\Admin\SellableProductController::class, 'index'])->name('sellable-products.index');
        Route::post('/sellable-products',                                [\App\Http\Controllers\Admin\SellableProductController::class, 'store'])->name('sellable-products.store');
        Route::put('/sellable-products/{sellableProduct}',               [\App\Http\Controllers\Admin\SellableProductController::class, 'update'])->name('sellable-products.update');
        Route::delete('/sellable-products/{sellableProduct}',            [\App\Http\Controllers\Admin\SellableProductController::class, 'destroy'])->name('sellable-products.destroy');
        Route::post('/sellable-products/{sellableProduct}/movement',     [\App\Http\Controllers\Admin\SellableProductController::class, 'addMovement'])->name('sellable-products.movement');
        Route::get('/sellable-products/{sellableProduct}/movements',     [\App\Http\Controllers\Admin\SellableProductController::class, 'movements'])->name('sellable-products.movements');

        // Fidélité clients
        Route::get('/loyalty',                       [LoyaltyController::class, 'index'])->name('loyalty.index');
        Route::get('/loyalty/{client}',              [LoyaltyController::class, 'show'])->name('loyalty.show');
        Route::post('/loyalty/{client}/adjust',      [LoyaltyController::class, 'adjust'])->name('loyalty.adjust');

        // Marques & Modèles de véhicules
        Route::get('/vehicles',                    [VehicleBrandController::class, 'index'])->name('vehicles.index');
        Route::post('/vehicles',                   [VehicleBrandController::class, 'store'])->name('vehicles.store');
        Route::post('/vehicles/import',            [VehicleBrandController::class, 'importCsv'])->name('vehicles.import');
        Route::get('/vehicles/export',             [VehicleBrandController::class, 'exportCsv'])->name('vehicles.export');
        Route::put('/vehicles/{brand}',            [VehicleBrandController::class, 'update'])->name('vehicles.update');
        Route::delete('/vehicles/{brand}',         [VehicleBrandController::class, 'destroy'])->name('vehicles.destroy');
        // Modèles (nested)
        Route::post('/vehicles/{brand}/models',                    [VehicleBrandController::class, 'storeModel'])->name('vehicles.models.store');
        Route::put('/vehicles/{brand}/models/{model}',             [VehicleBrandController::class, 'updateModel'])->name('vehicles.models.update');
        Route::delete('/vehicles/{brand}/models/{model}',          [VehicleBrandController::class, 'destroyModel'])->name('vehicles.models.destroy');        // Paramètres
        Route::get('/settings',  [\App\Http\Controllers\Admin\SettingsController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\Admin\SettingsController::class, 'update'])->name('settings.update');

        // Rôles & Permissions (RBAC)
        Route::get('/roles',              [RoleController::class, 'index'])->name('roles.index');
        Route::post('/roles',             [RoleController::class, 'store'])->name('roles.store');
        Route::put('/roles/{role}',       [RoleController::class, 'update'])->name('roles.update');
        Route::delete('/roles/{role}',    [RoleController::class, 'destroy'])->name('roles.destroy');

        // Rendez-vous / Calendrier
        Route::get('/appointments',                              [AppointmentController::class, 'index'])->name('appointments.index');
        Route::get('/appointments/calendar',                     [AppointmentController::class, 'calendar'])->name('appointments.calendar');
        Route::get('/appointments/check-conflicts',              [AppointmentController::class, 'checkConflicts'])->name('appointments.check-conflicts');
        Route::get('/appointments/vehicle-brands',               [AppointmentController::class, 'vehicleBrandSearch'])->name('appointments.vehicle-brands');
        Route::post('/appointments',                             [AppointmentController::class, 'store'])->name('appointments.store');
        Route::put('/appointments/{appointment}',                [AppointmentController::class, 'update'])->name('appointments.update');
        Route::delete('/appointments/{appointment}',             [AppointmentController::class, 'destroy'])->name('appointments.destroy');        Route::post('/appointments/{appointment}/confirm',       [AppointmentController::class, 'confirm'])->name('appointments.confirm');
        Route::post('/appointments/{appointment}/convert-ticket',[AppointmentController::class, 'convertToTicket'])->name('appointments.convert');
        Route::post('/appointments/{appointment}/no-show',        [AppointmentController::class, 'markNoShow'])->name('appointments.no-show');       // [A1] dedicated no-show action
        Route::get('/appointments/{appointment}/feasibility',     [AppointmentController::class, 'feasibility'])->name('appointments.feasibility');  // [A2] JSON API
        Route::get('/appointments/{appointment}',                 [AppointmentController::class, 'show'])->name('appointments.show');                // [L3] moved into admin group

        // Devis (B2B)
        Route::get('/quotes',                                    [QuoteController::class, 'index'])->name('quotes.index');
        Route::get('/quotes/create',                             [QuoteController::class, 'create'])->name('quotes.create');
        Route::post('/quotes',                                   [QuoteController::class, 'store'])->name('quotes.store');
        Route::get('/quotes/{quote}',                            [QuoteController::class, 'show'])->name('quotes.show');
        Route::put('/quotes/{quote}',                            [QuoteController::class, 'update'])->name('quotes.update');
        Route::delete('/quotes/{quote}',                         [QuoteController::class, 'destroy'])->name('quotes.destroy');
        Route::post('/quotes/{quote}/lines',                     [QuoteController::class, 'addLine'])->name('quotes.lines.store');
        Route::put('/quotes/{quote}/lines/{line}',               [QuoteController::class, 'updateLine'])->name('quotes.lines.update');
        Route::delete('/quotes/{quote}/lines/{line}',            [QuoteController::class, 'removeLine'])->name('quotes.lines.destroy');
        Route::post('/quotes/{quote}/send',                      [QuoteController::class, 'send'])->name('quotes.send');
        Route::post('/quotes/{quote}/accept',                    [QuoteController::class, 'accept'])->name('quotes.accept');
        Route::post('/quotes/{quote}/refuse',                    [QuoteController::class, 'refuse'])->name('quotes.refuse');
        Route::post('/quotes/{quote}/convert-invoice',           [QuoteController::class, 'convertToInvoice'])->name('quotes.convert');
        Route::get('/quotes/{quote}/pdf',                        [QuoteController::class, 'downloadPdf'])->name('quotes.pdf');        // Factures (B2B)
        Route::get('/invoices',                                  [InvoiceController::class, 'index'])->name('invoices.index');
        Route::get('/invoices/create',                           [InvoiceController::class, 'create'])->name('invoices.create');
        Route::post('/invoices',                                 [InvoiceController::class, 'store'])->name('invoices.store');
        Route::get('/invoices/{invoice}',                        [InvoiceController::class, 'show'])->name('invoices.show');
        Route::put('/invoices/{invoice}',                        [InvoiceController::class, 'update'])->name('invoices.update');
        Route::delete('/invoices/{invoice}',                     [InvoiceController::class, 'destroy'])->name('invoices.destroy');
        Route::post('/invoices/{invoice}/lines',                 [InvoiceController::class, 'addLine'])->name('invoices.lines.store');
        Route::put('/invoices/{invoice}/lines/{line}',           [InvoiceController::class, 'updateLine'])->name('invoices.lines.update');
        Route::delete('/invoices/{invoice}/lines/{line}',        [InvoiceController::class, 'removeLine'])->name('invoices.lines.destroy');
        Route::post('/invoices/{invoice}/tickets',               [InvoiceController::class, 'addTickets'])->name('invoices.tickets.add');
        Route::delete('/invoices/{invoice}/tickets/{ticket}',    [InvoiceController::class, 'removeTicket'])->name('invoices.tickets.remove');
        Route::post('/invoices/{invoice}/tax',                   [InvoiceController::class, 'updateTax'])->name('invoices.tax');
        Route::post('/invoices/{invoice}/issue',                 [InvoiceController::class, 'issue'])->name('invoices.issue');
        Route::post('/invoices/{invoice}/pay',                   [InvoiceController::class, 'markPaid'])->name('invoices.pay');        Route::get('/invoices/{invoice}/pdf',                    [InvoiceController::class, 'downloadPdf'])->name('invoices.pdf');

        // Templates récurrents
        Route::get('/ticket-templates',                                      [TicketTemplateController::class, 'index'])->name('ticket-templates.index');
        Route::post('/ticket-templates',                                     [TicketTemplateController::class, 'store'])->name('ticket-templates.store');
        Route::put('/ticket-templates/{ticketTemplate}',                     [TicketTemplateController::class, 'update'])->name('ticket-templates.update');
        Route::delete('/ticket-templates/{ticketTemplate}',                  [TicketTemplateController::class, 'destroy'])->name('ticket-templates.destroy');        Route::post('/ticket-templates/{ticketTemplate}/toggle',             [TicketTemplateController::class, 'toggleActive'])->name('ticket-templates.toggle');
        Route::post('/ticket-templates/{ticketTemplate}/run-now',            [TicketTemplateController::class, 'runNow'])->name('ticket-templates.run-now');        // Journal d'audit
        Route::get('/activity-log',        [ActivityLogController::class, 'index'])->name('activity-log.index');
        Route::get('/activity-log/export', [ActivityLogController::class, 'export'])->name('activity-log.export');

        // Historique des paiements
        Route::get('/payments',        [AdminPaymentController::class, 'index'])->name('payments.index');
        Route::get('/payments/export', [AdminPaymentController::class, 'export'])->name('payments.export');        // Gestion admin des clients
        Route::get('/clients',                                          [AdminClientController::class, 'index'])->name('clients.index');
        Route::get('/clients/create',                                   [AdminClientController::class, 'create'])->name('clients.create');
        Route::post('/clients',                                         [AdminClientController::class, 'store'])->name('clients.store');
        Route::get('/clients/{client}',                                 [AdminClientController::class, 'show'])->name('clients.show');
        Route::put('/clients/{client}',                                 [AdminClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}',                              [AdminClientController::class, 'destroy'])->name('clients.destroy');
        Route::post('/clients/{id}/restore',                            [AdminClientController::class, 'restore'])->name('clients.restore');
        Route::get('/clients/{client}/export-pdf',                      [AdminClientController::class, 'exportPdf'])->name('clients.export-pdf');
        Route::post('/clients/{client}/vehicles',                       [AdminClientController::class, 'storeVehicle'])->name('clients.vehicles.store');
        Route::put('/clients/{client}/vehicles/{vehicle}',              [AdminClientController::class, 'updateVehicle'])->name('clients.vehicles.update');
        Route::delete('/clients/{client}/vehicles/{vehicle}',           [AdminClientController::class, 'destroyVehicle'])->name('clients.vehicles.destroy');        Route::get('/users/{user}',     [\App\Http\Controllers\Admin\UserController::class, 'show'])->name('users.show');
        Route::get('/services/{service}', [\App\Http\Controllers\Admin\ServiceController::class, 'show'])->name('services.show');
        Route::get('/promotions/{promotion}',           [PromotionController::class, 'show'])->name('promotions.show');
        Route::get('/ticket-templates/{ticketTemplate}', [TicketTemplateController::class, 'show'])->name('ticket-templates.show');

        // Fournisseurs
        Route::get('/suppliers',               [SupplierController::class, 'index'])->name('suppliers.index');
        Route::post('/suppliers',              [SupplierController::class, 'store'])->name('suppliers.store');
        Route::put('/suppliers/{supplier}',    [SupplierController::class, 'update'])->name('suppliers.update');
        Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');

        // Achats
        Route::get('/purchases',                [PurchaseController::class, 'index'])->name('purchases.index');
        Route::get('/purchases/create',         [PurchaseController::class, 'create'])->name('purchases.create');
        Route::post('/purchases',               [PurchaseController::class, 'store'])->name('purchases.store');
        Route::get('/purchases/{purchase}',     [PurchaseController::class, 'show'])->name('purchases.show');
        Route::delete('/purchases/{purchase}',  [PurchaseController::class, 'destroy'])->name('purchases.destroy');
    });

    /*
    |----------------------------------------------------------------------
    | Caissier (+ admin)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin,caissier')->prefix('caisse')->name('caissier.')->group(function () {        Route::get('/', [CaissierDashboardController::class, 'index'])->name('dashboard');

        // Planning (kanban washers)
        Route::get('/planning', [PlanningController::class, 'index'])->name('planning');        // Rendez-vous (lecture + conversion) — P3.8
        Route::get('/appointments',          [AppointmentController::class, 'index'])->name('appointments.index');
        Route::get('/appointments/calendar', [AppointmentController::class, 'calendar'])->name('appointments.calendar');
        Route::post('/appointments/{appointment}/convert-ticket', [AppointmentController::class, 'convertToTicket'])->name('appointments.convert');        // Tickets — ordre important : /nouveau avant /{ticket}
        Route::get('/tickets',                        [TicketController::class, 'index'])->name('tickets.index');
        Route::get('/tickets/nouveau',                [TicketController::class, 'create'])->name('tickets.create');
        Route::get('/tickets/recherche',              [TicketController::class, 'search'])->name('tickets.search');
        Route::get('/tickets/washer-queue',           [TicketController::class, 'washerQueue'])->name('tickets.washerQueue');
        Route::post('/tickets',                       [TicketController::class, 'store'])->name('tickets.store');
        Route::get('/tickets/{ticket}',               [TicketController::class, 'show'])->name('tickets.show');
        Route::get('/tickets/{ticket}/modifier',      [TicketController::class, 'edit'])->name('tickets.edit');
        Route::put('/tickets/{ticket}',               [TicketController::class, 'update'])->name('tickets.update');
        Route::delete('/tickets/{ticket}',            [TicketController::class, 'destroy'])->name('tickets.destroy');
        Route::patch('/tickets/{ticket}/status',      [TicketController::class, 'updateStatus'])->name('tickets.status');

        // Paiement (Sprint 3)
        Route::post('/tickets/{ticket}/payer',        [PaymentController::class, 'store'])->name('tickets.pay');        // Shift / Caisse
        Route::get('/shift',                        [ShiftController::class, 'index'])->name('shift.index');
        Route::get('/shift/history',                [ShiftController::class, 'history'])->name('shift.history');
        Route::post('/shift',                       [ShiftController::class, 'store'])->name('shift.store');
        Route::patch('/shift/{shift}/close',        [ShiftController::class, 'close'])->name('shift.close');
        Route::get('/shift/{shift}/rapport',        [ShiftController::class, 'rapport'])->name('shift.rapport');

        // Dépenses
        Route::get('/depenses',              [ExpenseController::class, 'index'])->name('depenses.index');
        Route::post('/depenses',             [ExpenseController::class, 'store'])->name('depenses.store');
        Route::delete('/depenses/{expense}', [ExpenseController::class, 'destroy'])->name('depenses.destroy');

        // Clients
        Route::get('/clients',              [ClientController::class, 'index'])->name('clients.index');
        Route::get('/clients/search',       [ClientController::class, 'search'])->name('clients.search');
        Route::get('/clients/{client}',     [ClientController::class, 'show'])->name('clients.show');
        Route::post('/clients',             [ClientController::class, 'store'])->name('clients.store');
        Route::post('/clients/quick',       [ClientController::class, 'quickStore'])->name('clients.quick');
        Route::put('/clients/{client}',     [ClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}',  [ClientController::class, 'destroy'])->name('clients.destroy');

        // Promotions (lecture seule — écriture réservée à l'admin)
        Route::get('/promotions', [PromotionController::class, 'index'])->name('promotions.index');
    });

    /*
    |----------------------------------------------------------------------
    | Laveur (admin + caissier peuvent aussi voir)
    |----------------------------------------------------------------------
    */    Route::middleware('role:admin,caissier,laveur')->prefix('laveur')->name('laveur.')->group(function () {
        Route::get('/',                            [QueueController::class, 'index'])->name('queue');
        Route::get('/stats',                       [LaveurStatsController::class, 'index'])->name('stats');
        Route::patch('/tickets/{ticket}/start',    [QueueController::class, 'start'])->name('tickets.start');
        Route::patch('/tickets/{ticket}/complete', [QueueController::class, 'complete'])->name('tickets.complete');
    });
});

require __DIR__ . '/auth.php';
