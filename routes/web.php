<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
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
use App\Http\Controllers\Caissier\ClientController;
use App\Http\Controllers\Caissier\DashboardController as CaissierDashboardController;
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

// Public ticket tracking (no auth required)
Route::get('/ticket/{ulid}', [\App\Http\Controllers\PublicTicketController::class, 'show'])->name('ticket.public');

// Promo code validation (auth required, any role)
Route::middleware('auth')->post('/api/promotions/validate', [PromotionController::class, 'validate'])->name('promotions.validate');

Route::post('login/pin', [PinLoginController::class, 'store'])
    ->middleware('guest')
    ->name('login.pin');

/*
|--------------------------------------------------------------------------
| Routes authentifiées
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {

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
        Route::get('/reports/export/pdf', [ReportsController::class, 'exportPdf'])->name('reports.export.pdf');
        Route::get('/reports/export/csv', [ReportsController::class, 'exportCsv'])->name('reports.export.csv');        // Performance laveurs
        Route::get('/employees', [EmployeeController::class, 'index'])->name('employees.index');        // Promotions & codes promo
        Route::get('/promotions',                [PromotionController::class, 'index'])->name('promotions.index');
        Route::post('/promotions',               [PromotionController::class, 'store'])->name('promotions.store');
        Route::put('/promotions/{promotion}',    [PromotionController::class, 'update'])->name('promotions.update');
        Route::delete('/promotions/{promotion}', [PromotionController::class, 'destroy'])->name('promotions.destroy');

        // Gestion du stock
        Route::get('/stock',                              [StockController::class, 'index'])->name('stock.index');
        Route::post('/stock',                             [StockController::class, 'store'])->name('stock.store');
        Route::put('/stock/{stock}',                      [StockController::class, 'update'])->name('stock.update');
        Route::delete('/stock/{stock}',                   [StockController::class, 'destroy'])->name('stock.destroy');
        Route::post('/stock/{stock}/movement',            [StockController::class, 'addMovement'])->name('stock.movement');
        Route::get('/stock/{stock}/movements',            [StockController::class, 'movements'])->name('stock.movements');        Route::post('/services/{service}/stock-products', [StockController::class, 'syncServiceProducts'])->name('services.stock.sync');

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
        Route::delete('/vehicles/{brand}/models/{model}',          [VehicleBrandController::class, 'destroyModel'])->name('vehicles.models.destroy');

        // Paramètres
        Route::get('/settings',  [\App\Http\Controllers\Admin\SettingsController::class, 'index'])->name('settings.index');
        Route::post('/settings', [\App\Http\Controllers\Admin\SettingsController::class, 'update'])->name('settings.update');
    });

    /*
    |----------------------------------------------------------------------
    | Caissier (+ admin)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin,caissier')->prefix('caisse')->name('caissier.')->group(function () {        Route::get('/', [CaissierDashboardController::class, 'index'])->name('dashboard');

        // Planning (kanban washers)
        Route::get('/planning', [PlanningController::class, 'index'])->name('planning');        // Tickets— ordre important : /nouveau avant /{ticket}
        Route::get('/tickets',                        [TicketController::class, 'index'])->name('tickets.index');
        Route::get('/tickets/nouveau',                [TicketController::class, 'create'])->name('tickets.create');
        Route::get('/tickets/recherche',              [TicketController::class, 'search'])->name('tickets.search');
        Route::post('/tickets',                       [TicketController::class, 'store'])->name('tickets.store');
        Route::get('/tickets/{ticket}',               [TicketController::class, 'show'])->name('tickets.show');
        Route::patch('/tickets/{ticket}/status',      [TicketController::class, 'updateStatus'])->name('tickets.status');

        // Paiement (Sprint 3)
        Route::post('/tickets/{ticket}/payer',        [PaymentController::class, 'store'])->name('tickets.pay');        // Shift / Caisse
        Route::get('/shift',                 [ShiftController::class, 'index'])->name('shift.index');
        Route::get('/shift/history',         [ShiftController::class, 'history'])->name('shift.history');
        Route::post('/shift',                [ShiftController::class, 'store'])->name('shift.store');
        Route::patch('/shift/{shift}/close', [ShiftController::class, 'close'])->name('shift.close');// Clients        Route::get('/clients',              [ClientController::class, 'index'])->name('clients.index');
        Route::get('/clients/search',       [ClientController::class, 'search'])->name('clients.search');
        Route::get('/clients/{client}',     [ClientController::class, 'show'])->name('clients.show');
        Route::post('/clients',             [ClientController::class, 'store'])->name('clients.store');
        Route::post('/clients/quick',       [ClientController::class, 'quickStore'])->name('clients.quick');
        Route::put('/clients/{client}',     [ClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}',  [ClientController::class, 'destroy'])->name('clients.destroy');
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
