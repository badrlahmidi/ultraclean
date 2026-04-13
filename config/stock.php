<?php

/**
 * Stock management configuration.
 *
 * AUDIT-FIX: Added to support strict_mode for stock validation
 * during payment processing.
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Strict Mode
    |--------------------------------------------------------------------------
    |
    | When enabled, payments will be blocked if any required product has
    | insufficient stock. The transaction will be rolled back.
    |
    | When disabled (default), payments will proceed with a warning flag
    | set on the ticket (has_stock_warning = true) and stock may go negative.
    |
    */

    'strict_mode' => env('STOCK_STRICT_MODE', false),

    /*
    |--------------------------------------------------------------------------
    | Low Stock Threshold Multiplier
    |--------------------------------------------------------------------------
    |
    | When current_quantity falls below min_quantity * this multiplier,
    | a low stock alert is triggered.
    |
    */

    'low_stock_multiplier' => env('STOCK_LOW_MULTIPLIER', 1.5),

];
