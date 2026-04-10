<?php

namespace App\Jobs;

use App\Models\StockProduct;
use App\Models\User;
use App\Notifications\StockLowAlert;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

/**
 * CheckStockLevels
 *
 * Exécuté quotidiennement à 8h.
 * Vérifie tous les produits actifs dont current_quantity <= min_quantity
 * et envoie une notification aux admins (une par produit en alerte).
 * Évite les doublons via un cache journalier.
 */
class CheckStockLevels implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $lowStockProducts = StockProduct::lowStock()->get();

        if ($lowStockProducts->isEmpty()) {
            return;
        }

        $admins = User::where('role', 'admin')
            ->where('is_active', true)
            ->get();

        if ($admins->isEmpty()) {
            return;
        }

        foreach ($lowStockProducts as $product) {
            $cacheKey = "stock_low_alert_{$product->id}_" . today()->toDateString();

            if (cache()->has($cacheKey)) {
                continue; // Déjà alerté aujourd'hui
            }

            Notification::send($admins, new StockLowAlert($product));
            cache()->put($cacheKey, true, now()->endOfDay());
        }
    }
}
