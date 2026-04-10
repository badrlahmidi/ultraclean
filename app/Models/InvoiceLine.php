<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id', 'service_id', 'description',
        'quantity', 'unit_price_cents', 'discount_cents',
        'line_total_cents', 'sort_order',
    ];

    protected $casts = [
        'quantity'         => 'integer',
        'unit_price_cents' => 'integer',
        'discount_cents'   => 'integer',
        'line_total_cents' => 'integer',
        'sort_order'       => 'integer',
    ];

    // ── Boot : calcul automatique de line_total_cents ─────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (InvoiceLine $line) {
            $gross              = $line->quantity * $line->unit_price_cents;
            $line->line_total_cents = max(0, $gross - $line->discount_cents);
        });        static::saved(function (InvoiceLine $line): void {
            /** @var \App\Models\Invoice $invoice */
            $invoice = $line->invoice;
            $invoice->recalculate();
        });
        static::deleted(function (InvoiceLine $line): void {
            /** @var \App\Models\Invoice $invoice */
            $invoice = $line->invoice;
            $invoice->recalculate();
        });
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
