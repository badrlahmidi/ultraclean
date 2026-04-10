<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Services\LoyaltyService;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int                             $id
 * @property string                          $ulid
 * @property string                          $name
 * @property string                          $phone
 * @property string|null                     $email
 * @property string|null                     $vehicle_plate
 * @property string|null                     $notes
 * @property bool                            $is_active
 * @property bool                            $is_company
 * @property string|null                     $ice
 * @property string                          $loyalty_tier
 * @property int                             $loyalty_points
 * @property int                             $total_visits
 * @property int                             $total_spent_cents
 * @property \Illuminate\Support\Carbon|null $last_visit_date
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Ticket> $tickets
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Appointment> $appointments
 */
class Client extends Model
{
    use HasFactory, SoftDeletes;

    /** Phone used to identify the walk-in (anonymous) client record. */
    const WALK_IN_PHONE = '0000000000';    /**
     * Return the "Client de passage" sentinel record, creating it if absent.
     * This client is used for anonymous walk-in tickets with no client selected.
     */
    public static function walkIn(): self
    {
        return static::withoutGlobalScopes()->firstOrCreate(
            ['phone' => self::WALK_IN_PHONE],
            [
                'name'      => 'Client de passage',
                'is_active' => true,
                'notes'     => 'Client anonyme — généré automatiquement.',
            ]
        );
    }    /**
     * ARCH-ITEM-2.3 (F-04) — Returns true for the anonymous walk-in sentinel.
     * Walk-in clients must NEVER accumulate loyalty points, tier upgrades, or visits.
     */
    public function isWalkIn(): bool
    {
        return $this->phone === self::WALK_IN_PHONE;
    }

    /**
     * Check by ID without loading the model (used in the hot payment path).
     */
    public static function isWalkInId(int $id): bool
    {
        return static::walkIn()->id === $id;
    }

    protected $fillable = [
        'ulid', 'name', 'phone', 'email', 'vehicle_plate',
        'notes', 'is_active',
        'is_company', 'ice',
        'loyalty_tier', 'loyalty_points',
        'total_visits', 'total_spent_cents', 'last_visit_date',
    ];

    // ---------- Boot ----------

    protected static function booted(): void
    {
        static::creating(function (Client $client): void {
            if (empty($client->ulid)) {
                $client->ulid = (string) Str::ulid();
            }
        });
    }

    // ---------- Relations ----------

    protected $casts = [
        'is_active'         => 'boolean',
        'is_company'        => 'boolean',
        'loyalty_points'    => 'integer',
        'total_visits'      => 'integer',
        'total_spent_cents' => 'integer',        'last_visit_date'   => 'date',
    ];

    // ---------- Relations ----------

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(ClientVehicle::class)->orderByDesc('is_primary');
    }

    public function primaryVehicle(): HasOne
    {
        return $this->hasOne(ClientVehicle::class)->where('is_primary', true)->latestOfMany();
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class)->latest('scheduled_at');
    }

    public function upcomingAppointments(): HasMany
    {
        return $this->hasMany(Appointment::class)
            ->where('scheduled_at', '>=', now())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->orderBy('scheduled_at');
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class)->latest();
    }

    // ---------- Loyalty Helpers ----------

    public function tierLabel(): string
    {
        return LoyaltyService::TIERS[$this->loyalty_tier]['label'] ?? 'Standard';
    }

    public function visitsToNextTier(): ?int
    {
        return LoyaltyService::visitsToNextTier($this->total_visits);
    }

    public function pointsValueCents(): int
    {
        return LoyaltyService::pointsToDiscount($this->loyalty_points);
    }

    // ---------- Scopes ----------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('phone', 'like', "%{$term}%")
              ->orWhere('vehicle_plate', 'like', "%{$term}%");
        });
    }
}
