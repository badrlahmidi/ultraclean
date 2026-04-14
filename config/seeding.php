<?php

/**
 * config/seeding.php
 *
 * Configuration values consumed exclusively by database seeders.
 *
 * ⚠️  Set these in your .env BEFORE running `php artisan db:seed`.
 *     All values default to empty strings so that the seeder auto-generates
 *     random credentials and prints them to the console on first run.
 *     Delete or blank out these env vars after seeding.
 */
return [

    'admin_email'    => env('SEED_ADMIN_EMAIL',    'admin@example.com'),
    'admin_password' => env('SEED_ADMIN_PASSWORD', ''),
    'admin_pin'      => env('SEED_ADMIN_PIN',      ''),

    'caissier_email'    => env('SEED_CAISSIER_EMAIL',    'caissier@example.com'),
    'caissier_password' => env('SEED_CAISSIER_PASSWORD', ''),
    'caissier_pin'      => env('SEED_CAISSIER_PIN',      ''),

    'laveur_email'    => env('SEED_LAVEUR_EMAIL',    'laveur@example.com'),
    'laveur_password' => env('SEED_LAVEUR_PASSWORD', ''),
    'laveur_pin'      => env('SEED_LAVEUR_PIN',      ''),

];
