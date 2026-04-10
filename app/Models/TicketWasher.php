<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * TicketWasher — pivot enrichi entre Ticket et User (laveur).
 *
 * Colonnes : ticket_id, user_id, role, started_at, ended_at
 */
class TicketWasher extends Pivot
{
    protected $table = 'ticket_washers';

    const ROLE_LEAD      = 'lead';
    const ROLE_ASSISTANT = 'assistant';

    protected $fillable = [
        'ticket_id',
        'user_id',
        'role',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
    ];

    // ── Relations ───────────────────────────────────────────────────────────

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    public function isLead(): bool
    {
        return $this->role === self::ROLE_LEAD;
    }

    public function isAssistant(): bool
    {
        return $this->role === self::ROLE_ASSISTANT;
    }

    /** Durée de travail effectif en secondes pour ce laveur sur ce ticket. */
    public function workDurationSeconds(): int
    {
        if (! $this->started_at) {
            return 0;
        }
        $end = $this->ended_at ?? now();
        return (int) $this->started_at->diffInSeconds($end);
    }
}
