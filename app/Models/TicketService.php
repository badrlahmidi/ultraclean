<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketService extends Model
{
    protected $table = 'ticket_services';    protected $fillable = [
        'ticket_id', 'service_id',
        'price_variant_id', 'price_variant_label',
        'service_name', 'unit_price_cents',
        'quantity', 'discount_cents', 'line_total_cents',
    ];

    protected $casts = [
        'unit_price_cents'  => 'integer',
        'quantity'          => 'integer',
        'discount_cents'    => 'integer',
        'line_total_cents'  => 'integer',
        'price_variant_id'  => 'integer',
    ];

    // ---------- Boot ----------

    protected static function booted(): void
    {
        // Recalcule le line_total avant chaque sauvegarde
        static::saving(function (TicketService $item) {
            $item->line_total_cents = max(
                0,
                ($item->unit_price_cents * $item->quantity) - $item->discount_cents
            );
        });        // Recalcule les totaux du ticket après création/mise à jour/suppression
        static::saved(function (TicketService $item): void {
            /** @var \App\Models\Ticket|null $ticket */
            $ticket = $item->ticket;
            $ticket?->recalculateTotals();
        });
        static::deleted(function (TicketService $item): void {
            /** @var \App\Models\Ticket|null $ticket */
            $ticket = $item->ticket;
            $ticket?->recalculateTotals();
        });
    }

    // ---------- Relations ----------

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function priceVariant(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class, 'price_variant_id');
    }
}
