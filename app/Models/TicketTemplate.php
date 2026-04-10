<?php

namespace App\Models;

use Carbon\Carbon;
use Cron\CronExpression;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * TicketTemplate — Template de ticket récurrent.
 *
 * Un template décrit un ticket à créer selon une règle cron.
 * Le Job GenerateRecurringTickets instancie les Tickets au bon moment.
 */
class TicketTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id',
        'vehicle_plate',
        'vehicle_brand',
        'vehicle_type_id',
        'service_ids',
        'estimated_duration',
        'assigned_to_preference',
        'recurrence_rule',
        'label',
        'notes',
        'is_active',
        'next_run_at',
        'last_run_at',
    ];

    protected $casts = [
        'service_ids'   => 'array',
        'is_active'     => 'boolean',
        'next_run_at'   => 'datetime',
        'last_run_at'   => 'datetime',
        'estimated_duration' => 'integer',
    ];

    // ── Boot ────────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        // Calcule next_run_at automatiquement à la création si vide
        static::creating(function (TicketTemplate $template): void {
            if (empty($template->next_run_at)) {
                $template->next_run_at = $template->computeNextRunAt();
            }
        });
    }

    // ── Relations ───────────────────────────────────────────────────────────

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    public function assignedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_preference');
    }

    // ── Scopes ──────────────────────────────────────────────────────────────

    /** Templates actifs dont l'heure de déclenchement est passée. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->whereNotNull('next_run_at');
    }

    public function scopeDue($query)
    {
        return $query->active()->where('next_run_at', '<=', now());
    }

    // ── Méthodes métier ─────────────────────────────────────────────────────

    /**
     * Calcule la prochaine exécution à partir de maintenant
     * en utilisant le recurrence_rule (cron expression).
     */
    public function computeNextRunAt(Carbon $from = null): Carbon
    {
        $from ??= now();

        try {
            $cron = new CronExpression($this->recurrence_rule ?? '0 8 * * 1');
            $next = $cron->getNextRunDate($from->toDateTimeString());
            return Carbon::instance($next);        } catch (\Throwable) {
            // Fallback sécurisé : dans 7 jours (copy() évite de muter $from)
            return $from->copy()->addWeek();
        }
    }

    /**
     * Après avoir créé le ticket, met à jour les timestamps du template
     * et planifie la prochaine occurrence.
     */
    public function updateNextRun(): void
    {
        $this->update([
            'last_run_at' => now(),
            'next_run_at' => $this->computeNextRunAt(),
        ]);
    }

    /**
     * Crée un Ticket (pending) depuis ce template.
     * Retourne le ticket créé ou null si le client n'existe plus.
     */
    public function createFromTemplate(): ?Ticket
    {
        if (! $this->client_id) {
            return null;
        }

        $ticket = Ticket::create([
            'client_id'          => $this->client_id,
            'vehicle_plate'      => $this->vehicle_plate,
            'vehicle_brand'      => $this->vehicle_brand,
            'vehicle_type_id'    => $this->vehicle_type_id,
            'assigned_to'        => $this->assigned_to_preference,
            'estimated_duration' => $this->estimated_duration,
            'notes'              => $this->notes,
            'status'             => Ticket::STATUS_PENDING,
            'ticket_template_id' => $this->id,  // traçabilité récurrent
            'created_by'         => null, // créé par le système
        ]);

        // Ajouter les services si définis
        if (! empty($this->service_ids)) {
            foreach ($this->service_ids as $serviceId) {
                $service = \App\Models\Service::find($serviceId);
                if ($service) {                    $ticket->services()->create([
                        'service_id'      => $service->id,
                        'service_name'    => $service->name,
                        'unit_price_cents'=> $service->base_price_cents,
                        'quantity'        => 1,
                        'line_total_cents'=> $service->base_price_cents,
                    ]);
                }
            }
            $ticket->recalculateTotals();
        }

        return $ticket;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Résumé lisible de la règle cron. */
    public function recurrenceLabel(): string
    {
        $labels = [
            '0 8 * * 1' => 'Chaque lundi à 8h',
            '0 8 * * 2' => 'Chaque mardi à 8h',
            '0 8 * * 3' => 'Chaque mercredi à 8h',
            '0 8 * * 4' => 'Chaque jeudi à 8h',
            '0 8 * * 5' => 'Chaque vendredi à 8h',
            '0 8 * * 6' => 'Chaque samedi à 8h',
            '0 8 * * 0' => 'Chaque dimanche à 8h',
            '0 8 * * 1-5' => 'Chaque jour ouvré à 8h',
            '0 8 * * *'   => 'Tous les jours à 8h',
            '0 8 1 * *'   => 'Le 1er du mois à 8h',
        ];

        return $labels[$this->recurrence_rule] ?? $this->recurrence_rule;
    }
}
