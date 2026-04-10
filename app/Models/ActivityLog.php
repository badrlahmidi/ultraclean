<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    // Jamais de mise à jour — audit immuable
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'action',
        'subject_type', 'subject_id',
        'properties', 'ip_address',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    // ---------- Relations ----------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ---------- Static Helpers ----------

    /**
     * Enregistre une action dans le journal d'audit.
     *
     * @param string $action          Ex: 'ticket.status_changed'
     * @param Model|null $subject     Entité concernée
     * @param array $properties       Données contextuelles (before/after…)
     * @param int|null $userId        Remplace l'utilisateur connecté si fourni
     */    public static function log(
        string $action,
        ?Model $subject = null,
        array  $properties = [],
        ?int   $userId = null
    ): static {
        /** @var static */
        return static::create([
            'user_id'      => $userId ?? auth()->id(),
            'action'       => $action,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id'   => $subject?->getKey(),
            'properties'   => $properties,
            'ip_address'   => request()->ip(),
        ]);
    }

    // ---------- Scopes ----------

    public function scopeForSubject($query, Model $subject)
    {
        return $query->where('subject_type', get_class($subject))
                     ->where('subject_id', $subject->getKey());
    }

    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }
}
