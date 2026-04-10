<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class Quote extends Model
{
    use HasFactory, SoftDeletes;

    // ── Statuts ──────────────────────────────────────────────────────────
    const STATUS_DRAFT    = 'draft';
    const STATUS_SENT     = 'sent';
    const STATUS_ACCEPTED = 'accepted';
    const STATUS_REFUSED  = 'refused';
    const STATUS_EXPIRED  = 'expired';

    const TRANSITIONS = [
        self::STATUS_DRAFT    => [self::STATUS_SENT, self::STATUS_REFUSED],
        self::STATUS_SENT     => [self::STATUS_ACCEPTED, self::STATUS_REFUSED, self::STATUS_EXPIRED],
        self::STATUS_ACCEPTED => [],
        self::STATUS_REFUSED  => [],
        self::STATUS_EXPIRED  => [],
    ];

    const STATUS_LABELS = [
        self::STATUS_DRAFT    => 'Brouillon',
        self::STATUS_SENT     => 'Envoyé',
        self::STATUS_ACCEPTED => 'Accepté',
        self::STATUS_REFUSED  => 'Refusé',
        self::STATUS_EXPIRED  => 'Expiré',
    ];

    const STATUS_COLORS = [
        self::STATUS_DRAFT    => 'gray',
        self::STATUS_SENT     => 'blue',
        self::STATUS_ACCEPTED => 'green',
        self::STATUS_REFUSED  => 'red',
        self::STATUS_EXPIRED  => 'orange',
    ];

    protected $fillable = [
        'ulid', 'quote_number', 'client_id', 'created_by', 'status',
        'billing_name', 'billing_address', 'billing_city', 'billing_zip', 'billing_ice',
        'subtotal_cents', 'discount_cents', 'tax_rate', 'tax_cents', 'total_cents',
        'notes', 'valid_until', 'sent_at', 'accepted_at', 'pdf_path',
    ];

    protected $casts = [
        'subtotal_cents' => 'integer',
        'discount_cents' => 'integer',
        'tax_rate'       => 'float',
        'tax_cents'      => 'integer',
        'total_cents'    => 'integer',
        'valid_until'    => 'date',
        'sent_at'        => 'datetime',
        'accepted_at'    => 'datetime',
    ];

    // ── Boot ─────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Quote $quote) {
            $quote->ulid         ??= (string) Str::ulid();
            $quote->quote_number ??= static::generateNumber();
        });
    }

    // ── Numérotation ─────────────────────────────────────────────────────

    public static function generateNumber(): string
    {
        $prefix = 'DEV-' . now()->format('Ym') . '-';
        $count  = static::withTrashed()
            ->where('quote_number', 'like', $prefix . '%')
            ->count() + 1;

        return $prefix . sprintf('%04d', $count);
    }

    // ── State Machine ─────────────────────────────────────────────────────

    public function transitionTo(string $newStatus): void
    {
        $allowed = static::TRANSITIONS[$this->status] ?? [];

        if (! in_array($newStatus, $allowed)) {
            throw new \LogicException(
                "Transition invalide : {$this->status} → {$newStatus}"
            );
        }

        $timestamps = [];
        if ($newStatus === self::STATUS_SENT)     $timestamps['sent_at']     = now();
        if ($newStatus === self::STATUS_ACCEPTED)  $timestamps['accepted_at'] = now();

        $this->update(array_merge(['status' => $newStatus], $timestamps));
    }

    // ── Recalcul totaux ───────────────────────────────────────────────────

    public function recalculate(): void
    {
        $subtotal = $this->lines()->sum('line_total_cents');
        $taxable  = max(0, $subtotal - $this->discount_cents);
        $tax      = (int) round($taxable * $this->tax_rate / 100);
        $total    = $taxable + $tax;

        $this->update([
            'subtotal_cents' => $subtotal,
            'tax_cents'      => $tax,
            'total_cents'    => $total,
        ]);
    }

    // ── PDF ───────────────────────────────────────────────────────────────

    public function generatePdf(): string
    {
        $pdf = Pdf::loadView('pdf.quote', [
            'quote'   => $this->load(['client', 'lines.service', 'creator']),
            'company' => static::companyData(),
        ])->setPaper('a4', 'portrait');

        $relative = "quotes/{$this->ulid}.pdf";
        Storage::disk('public')->put($relative, $pdf->output());
        $this->update(['pdf_path' => $relative]);

        return $relative;
    }

    /** Charge les infos société depuis les settings + encode le logo en base64. */
    public static function companyData(): array
    {
        $settings = \App\Models\Setting::getMany([
            'center_name', 'center_address', 'center_city',
            'center_phone', 'center_logo', 'app.name',
        ]);

        $logoData = null;
        $logoPath = $settings['center_logo'] ?? null;
        if ($logoPath) {
            // "/storage/logos/xxx.png" → strip leading "/storage/" → public disk path
            $diskPath = ltrim(str_replace('/storage/', '', $logoPath), '/');
            if (Storage::disk('public')->exists($diskPath)) {
                $mime     = Storage::disk('public')->mimeType($diskPath);
                $logoData = 'data:' . $mime . ';base64,' . base64_encode(
                    Storage::disk('public')->get($diskPath)
                );
            }
        }

        return [
            'name'    => $settings['center_name'] ?: ($settings['app.name'] ?: 'UltraClean'),
            'address' => $settings['center_address'] ?? '',
            'city'    => $settings['center_city']    ?? '',
            'phone'   => $settings['center_phone']   ?? '',
            'logo'    => $logoData,
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    public function isDraft():    bool { return $this->status === self::STATUS_DRAFT; }
    public function isSent():     bool { return $this->status === self::STATUS_SENT; }
    public function isAccepted(): bool { return $this->status === self::STATUS_ACCEPTED; }
    public function isRefused():  bool { return $this->status === self::STATUS_REFUSED; }
    public function isExpired():  bool { return $this->status === self::STATUS_EXPIRED; }

    public function isConvertible(): bool
    {
        return $this->status === self::STATUS_ACCEPTED && ! $this->invoices()->exists();
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(QuoteLine::class)->orderBy('sort_order');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
