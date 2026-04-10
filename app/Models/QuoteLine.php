<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteLine extends Model
{
    protected $fillable = [
        'quote_id', 'service_id', 'description',
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

        static::saving(function (QuoteLine $line) {
            $gross              = $line->quantity * $line->unit_price_cents;            $line->line_total_cents = max(0, $gross - $line->discount_cents);
        });

        // Après création / modification / suppression → recalcul du devis parent
        static::saved(function (QuoteLine $line): void {
            /** @var \App\Models\Quote $quote */
            $quote = $line->quote;
            $quote->recalculate();
        });
        static::deleted(function (QuoteLine $line): void {
            /** @var \App\Models\Quote $quote */
            $quote = $line->quote;
            $quote->recalculate();
        });
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
