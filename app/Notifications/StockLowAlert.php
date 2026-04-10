<?php

namespace App\Notifications;

use App\Models\StockProduct;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * StockLowAlert — notifie l'admin quand un produit stock passe sous le seuil.
 *
 * Canal : database uniquement.
 */
class StockLowAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly StockProduct $product,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'             => 'stock_low',
            'icon'             => '📦',
            'title'            => 'Stock bas — ' . $this->product->name,
            'body'             => "Quantité : {$this->product->current_quantity} {$this->product->unit} (seuil : {$this->product->min_quantity})",
            'stock_product_id' => $this->product->id,
        ];
    }
}
