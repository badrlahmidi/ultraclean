<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    // ── Statuts ──────────────────────────────────────────────────────────
    const STATUS_DRAFT     = 'draft';
    const STATUS_ISSUED    = 'issued';
    const STATUS_PAID      = 'paid';
    const STATUS_PARTIAL   = 'partial';
    const STATUS_CANCELLED = 'cancelled';

    const TRANSITIONS = [
        self::STATUS_DRAFT     => [self::STATUS_ISSUED, self::STATUS_CANCELLED],
        self::STATUS_ISSUED    => [self::STATUS_PAID, self::STATUS_PARTIAL, self::STATUS_CANCELLED],
        self::STATUS_PARTIAL   => [self::STATUS_PAID, self::STATUS_CANCELLED],
        self::STATUS_PAID      => [],
        self::STATUS_CANCELLED => [],
    ];

    const STATUS_LABELS = [
        self::STATUS_DRAFT     => 'Brouillon',
        self::STATUS_ISSUED    => 'Émise',
        self::STATUS_PAID      => 'Payée',
        self::STATUS_PARTIAL   => 'Paiement partiel',
        self::STATUS_CANCELLED => 'Annulée',
    ];

    const STATUS_COLORS = [
        self::STATUS_DRAFT     => 'gray',
        self::STATUS_ISSUED    => 'blue',
        self::STATUS_PAID      => 'green',
        self::STATUS_PARTIAL   => 'yellow',
        self::STATUS_CANCELLED => 'red',
    ];

    protected $fillable = [
        'ulid', 'invoice_number', 'quote_id', 'client_id', 'created_by', 'status',
        'payment_method',
        'billing_name', 'billing_address', 'billing_city', 'billing_zip', 'billing_ice',
        'subtotal_cents', 'discount_cents', 'tax_rate', 'tax_cents', 'total_cents',
        'amount_paid_cents',
        'notes', 'due_date', 'issued_at', 'paid_at', 'pdf_path',
    ];

    protected $casts = [
        'subtotal_cents'   => 'integer',
        'discount_cents'   => 'integer',
        'tax_rate'         => 'float',
        'tax_cents'        => 'integer',
        'total_cents'      => 'integer',
        'amount_paid_cents'=> 'integer',
        'due_date'         => 'date',
        'issued_at'        => 'datetime',
        'paid_at'          => 'datetime',
    ];

    // ── Boot ─────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Invoice $invoice) {
            $invoice->ulid           ??= (string) Str::ulid();
            $invoice->invoice_number ??= static::generateNumber();
        });
    }

    // ── Numérotation ─────────────────────────────────────────────────────

    public static function generateNumber(): string
    {
        $prefix = 'FAC-' . now()->format('Ym') . '-';
        $count  = static::withTrashed()
            ->where('invoice_number', 'like', $prefix . '%')
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
        if ($newStatus === self::STATUS_ISSUED) $timestamps['issued_at'] = now();
        if ($newStatus === self::STATUS_PAID)   $timestamps['paid_at']   = now();

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

    // ── Paiement ─────────────────────────────────────────────────────────

    /**
     * Paiement intégral — passe à STATUS_PAID.
     */
    public function markPaid(string $method = 'cash'): void
    {
        $this->update([
            'amount_paid_cents' => $this->total_cents,
            'payment_method'    => $method,
        ]);
        $this->transitionTo(self::STATUS_PAID);
    }

    /**
     * Paiement partiel — passe à STATUS_PARTIAL ou STATUS_PAID si soldé.
     */
    public function recordPartialPayment(int $amountCents, string $method = 'cash'): void
    {
        $newPaid = $this->amount_paid_cents + $amountCents;

        $this->update([
            'amount_paid_cents' => min($newPaid, $this->total_cents),
            'payment_method'    => $method,
        ]);

        $newStatus = $newPaid >= $this->total_cents
            ? self::STATUS_PAID
            : self::STATUS_PARTIAL;

        // Transition depuis issued ou partial
        if (in_array($this->status, [self::STATUS_ISSUED, self::STATUS_PARTIAL])) {
            $this->transitionTo($newStatus);
        }
    }

    // ── PDF ───────────────────────────────────────────────────────────────

    /**
     * Generate the PDF for this invoice.
     *
     * AUDIT-FIX: Delete existing file before creating new one to prevent
     * orphaned files and ensure clean regeneration.
     */
    public function generatePdf(): string
    {
        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $this->load(['client', 'lines.service', 'creator', 'tickets']),
            'company' => \App\Models\Quote::companyData(),
        ])->setPaper('a4', 'portrait');

        $relative = "invoices/{$this->ulid}.pdf";

        // Delete existing file if it exists (regeneration scenario)
        if (Storage::disk('public')->exists($relative)) {
            Storage::disk('public')->delete($relative);
        }

        Storage::disk('public')->put($relative, $pdf->output());
        $this->update(['pdf_path' => $relative]);

        return $relative;
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    public function isDraft():     bool { return $this->status === self::STATUS_DRAFT; }
    public function isIssued():    bool { return $this->status === self::STATUS_ISSUED; }
    public function isPaid():      bool { return $this->status === self::STATUS_PAID; }
    public function isPartial():   bool { return $this->status === self::STATUS_PARTIAL; }
    public function isCancelled(): bool { return $this->status === self::STATUS_CANCELLED; }

    public function remainingCents(): int
    {
        return max(0, $this->total_cents - $this->amount_paid_cents);
    }

    // ── Relations ─────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class)->orderBy('sort_order');
    }

    public function tickets(): BelongsToMany
    {
        return $this->belongsToMany(Ticket::class, 'invoice_tickets');
    }
}
