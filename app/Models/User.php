<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property int                             $id
 * @property string                          $name
 * @property string                          $email
 * @property string                          $role
 * @property string|null                     $phone
 * @property string|null                     $avatar
 * @property bool                            $is_active
 * @property \Illuminate\Support\Carbon|null $last_login_at
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property \Illuminate\Support\Carbon      $created_at
 * @property \Illuminate\Support\Carbon      $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Shift> $shifts
 * @property-read \App\Models\Shift|null $activeShift
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    // ── Rôles disponibles ───────────────────────────────────────────────
    const ROLE_ADMIN    = 'admin';
    const ROLE_CAISSIER = 'caissier';
    const ROLE_LAVEUR   = 'laveur';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'pin',
        'phone',
        'is_active',
        'avatar',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'pin',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'password'          => 'hashed',
            'pin'               => 'hashed',
            'is_active'         => 'boolean',
        ];
    }

    // ── Helpers de rôle ────────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isCaissier(): bool
    {
        return $this->role === self::ROLE_CAISSIER;
    }

    public function isLaveur(): bool
    {
        return $this->role === self::ROLE_LAVEUR;
    }

    /** Accepte une chaîne ou un tableau de rôles. */
    public function hasRole(string|array $role): bool
    {
        return in_array($this->role, (array) $role, true);
    }

    // ── Relations ──────────────────────────────────────────────────────

    public function shifts()
    {
        return $this->hasMany(\App\Models\Shift::class);
    }

    public function activeShift()
    {
        return $this->hasOne(\App\Models\Shift::class)->whereNull('closed_at')->latest('opened_at');
    }

    public function createdTickets()
    {
        return $this->hasMany(\App\Models\Ticket::class, 'created_by');
    }

    public function assignedTickets()
    {
        return $this->hasMany(\App\Models\Ticket::class, 'assigned_to');
    }

    public function appointments()
    {
        return $this->hasMany(\App\Models\Appointment::class, 'assigned_to');
    }

    public function upcomingAppointments()
    {
        return $this->hasMany(\App\Models\Appointment::class, 'assigned_to')
            ->where('scheduled_at', '>=', now())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->orderBy('scheduled_at');
    }

    // ── Scopes ─────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /** Shortcut : laveurs actifs uniquement. */
    public function scopeLaveurs($query)
    {
        return $query->where('role', self::ROLE_LAVEUR)->where('is_active', true);
    }

    // ── Relations ticket_washers ─────────────────────────────────────────────

    public function ticketWashers()
    {
        return $this->hasMany(\App\Models\TicketWasher::class);
    }

    public function washerTickets()
    {
        return $this->belongsToMany(\App\Models\Ticket::class, 'ticket_washers')
                    ->withPivot(['role', 'started_at', 'ended_at'])
                    ->withTimestamps();
    }
}
