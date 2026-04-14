<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Setting;
use App\Models\Ticket;
use Carbon\Carbon;

/**
 * WasherScheduler
 *
 * [L1-fix] applyBusinessHours: iterative loop, multi-day overflow, business_days setting.
 * [L2-fix] confirmedAppointmentMinutes: interval union (no double-counting parallel RDVs).
 * [L6-fix] confirmedAppointmentMinutes: rolling horizon via queue_horizon_hours setting.
 */
class WasherScheduler
{
    // ── Public API ────────────────────────────────────────────────────────────

    public static function computeDueAt(int $washerId, int $newDurationMinutes): Carbon
    {
        $queueMinutes = static::queueMinutesForWasher($washerId);
        $rawEnd       = now()->addMinutes($queueMinutes + $newDurationMinutes);

        return static::applyBusinessHours($rawEnd);
    }

    public static function queueMinutesForWasher(int $washerId): int
    {
        $directIds = Ticket::where('assigned_to', $washerId)
            ->whereIn('status', [
                Ticket::STATUS_PENDING,
                Ticket::STATUS_IN_PROGRESS,
                Ticket::STATUS_PAUSED,
                Ticket::STATUS_BLOCKED,
            ])
            ->pluck('id');

        $assistantIds = \App\Models\TicketWasher::where('user_id', $washerId)
            ->whereHas('ticket', fn ($q) => $q->whereIn('status', [
                Ticket::STATUS_PENDING,
                Ticket::STATUS_IN_PROGRESS,
                Ticket::STATUS_PAUSED,
                Ticket::STATUS_BLOCKED,
            ]))
            ->pluck('ticket_id');

        $allIds  = $directIds->merge($assistantIds)->unique();
        $minutes = 0;

        if ($allIds->isNotEmpty()) {
            $active = Ticket::whereIn('id', $allIds)
                ->orderBy('created_at')
                ->get(['status', 'estimated_duration', 'started_at',
                       'paused_at', 'total_paused_seconds']);

            foreach ($active as $ticket) {
                $estimated = (int) ($ticket->estimated_duration ?? 0);

                if ($ticket->status === Ticket::STATUS_IN_PROGRESS && $ticket->started_at) {
                    $elapsedSec   = (int) $ticket->started_at->diffInSeconds(now())
                                  - (int) ($ticket->total_paused_seconds ?? 0);
                    $remainingSec = max(0, $estimated * 60 - $elapsedSec);
                    $minutes     += (int) ceil($remainingSec / 60);

                } elseif (
                    in_array($ticket->status, [Ticket::STATUS_PAUSED, Ticket::STATUS_BLOCKED])
                    && $ticket->started_at
                ) {
                    $pauseRef     = $ticket->paused_at ?? now();
                    $elapsedSec   = (int) $ticket->started_at->diffInSeconds($pauseRef)
                                  - (int) ($ticket->total_paused_seconds ?? 0);
                    $remainingSec = max(0, $estimated * 60 - $elapsedSec);
                    $minutes     += (int) ceil($remainingSec / 60);

                } else {
                    $minutes += $estimated;
                }
            }
        }

        $minutes += static::confirmedAppointmentMinutes($washerId);

        return $minutes;
    }

    /**
     * [L2-fix] Merge overlapping intervals to avoid double-counting parallel RDVs.
     * [L6-fix] Only include RDVs within a rolling horizon (queue_horizon_hours, default 24h).
     */
    public static function confirmedAppointmentMinutes(int $washerId): int
    {
        $horizonHours = (int) Setting::get('queue_horizon_hours', 24);

        $rows = Appointment::where('assigned_to', $washerId)
            ->whereIn('status', [
                Appointment::STATUS_CONFIRMED,
                Appointment::STATUS_ARRIVED,
            ])
            ->whereNull('ticket_id')
            ->where('scheduled_at', '>=', now())
            ->where('scheduled_at', '<=', now()->addHours($horizonHours))
            ->orderBy('scheduled_at')
            ->get(['scheduled_at', 'estimated_duration']);

        if ($rows->isEmpty()) {
            return 0;
        }

        $intervals = $rows->map(fn ($r) => [
            'start' => $r->scheduled_at->timestamp,
            'end'   => $r->scheduled_at->copy()->addMinutes($r->estimated_duration)->timestamp,
        ])->toArray();

        usort($intervals, fn ($a, $b) => $a['start'] <=> $b['start']);

        $merged  = [];
        $current = $intervals[0];

        foreach (array_slice($intervals, 1) as $iv) {
            if ($iv['start'] <= $current['end']) {
                $current['end'] = max($current['end'], $iv['end']);
            } else {
                $merged[]  = $current;
                $current   = $iv;
            }
        }
        $merged[] = $current;

        $totalSeconds = array_sum(array_map(fn ($iv) => $iv['end'] - $iv['start'], $merged));

        return (int) ceil($totalSeconds / 60);
    }    /**
     * [L1-fix] Iterative loop handles multi-day overflow.
     * Respects business_days setting (JSON array, 0=Sun..6=Sat, Carbon::dayOfWeek).
     * Default open days: Mon-Sat [1,2,3,4,5,6].
     *
     * ARCH-ITEM-2.6 (F-10): Uses Setting::getMany() for a single batched DB read
     * instead of 4 separate Setting::get() calls. Also standardises keys to the
     * documented format: opening_time / closing_time (HH:MM strings).
     */
    public static function applyBusinessHours(Carbon $rawEnd): Carbon
    {        // Single batched read (cached per key via Setting::getMany → Cache::remember)
        // getMany() takes a flat key list and ONE shared default; apply per-key
        // defaults afterwards to avoid passing an array as the $default argument.
        $raw = Setting::getMany(['opening_time', 'closing_time', 'business_days']);

        [$openHour, $openMin]   = array_map('intval', explode(':', (string) ($raw['opening_time']  ?: '08:00')));
        [$closeHour, $closeMin] = array_map('intval', explode(':', (string) ($raw['closing_time']  ?: '21:00')));

        $rawDays  = $raw['business_days'] ?: [1, 2, 3, 4, 5, 6];
        $openDays = is_array($rawDays)
            ? $rawDays
            : (json_decode((string) $rawDays, true) ?? [1, 2, 3, 4, 5, 6]);
        $openDays = array_map('intval', $openDays);

        $result      = $rawEnd->copy();
        $safetyLimit = 14;
        $iterations  = 0;        while ($iterations++ < $safetyLimit) {
            $dayOfWeek = (int) $result->dayOfWeek; // 0=Sun..6=Sat

            // Closed day: advance to next day preserving current time.
            if (! in_array($dayOfWeek, $openDays, true)) {
                $result->addDay();
                continue;
            }

            $openToday  = $result->copy()->setTime($openHour, $openMin, 0);
            $closeToday = $result->copy()->setTime($closeHour, $closeMin, 0);

            // Before opening: snap forward to opening time and re-evaluate.
            if ($result->lt($openToday)) {
                $result = $openToday;
                continue;
            }

            if ($result->lte($closeToday)) {
                return $result; // within hours on an open day → done
            }

            // Overflow: carry extra minutes to next morning.
            $overflowMinutes = (int) $closeToday->diffInMinutes($result);
            $result = $result->copy()->addDay()->setTime($openHour, $openMin, 0)
                             ->addMinutes($overflowMinutes);
        }

        return $result; // safety fallback
    }    /**
     * ARCH-ITEM-2.6 (F-09): Washer queue availability metadata for the POS form.
     *
     * Moved here from TicketController::washerAvailability() (static) so this
     * domain logic lives in the correct service boundary and is testable.
     *
     * @return array{queue_count: int, queue_minutes: int, available_at: string|null}
     */
    public static function getAvailability(int $washerId): array
    {
        $queueMinutes = static::queueMinutesForWasher($washerId);

        $queueCount = Ticket::where('assigned_to', $washerId)
            ->whereIn('status', [
                Ticket::STATUS_PENDING,
                Ticket::STATUS_IN_PROGRESS,
                Ticket::STATUS_PAUSED,
                Ticket::STATUS_BLOCKED,
            ])
            ->count();

        return [
            'queue_count'   => $queueCount,
            'queue_minutes' => $queueMinutes,
            'available_at'  => $queueMinutes > 0
                ? static::applyBusinessHours(now()->addMinutes($queueMinutes))->toIso8601String()
                : null,
        ];
    }

    /**
     * Batch availability query for multiple washers at once.
     *
     * Executes a fixed number of queries regardless of how many washers are
     * provided (vs N×3 queries when calling getAvailability() in a loop).
     *
     * Returns an array keyed by washer ID:
     *   [washerId => ['queue_count' => int, 'queue_minutes' => int, 'available_at' => string|null]]
     *
     * @param  int[]  $washerIds
     * @return array<int, array{queue_count: int, queue_minutes: int, available_at: string|null}>
     */
    public static function getAvailabilityBatch(array $washerIds): array
    {
        if (empty($washerIds)) {
            return [];
        }

        $activeStatuses = [
            Ticket::STATUS_PENDING,
            Ticket::STATUS_IN_PROGRESS,
            Ticket::STATUS_PAUSED,
            Ticket::STATUS_BLOCKED,
        ];

        // ── 1. Load all active tickets for all relevant washers (2 queries) ──

        // Direct assignments
        $directTickets = Ticket::whereIn('assigned_to', $washerIds)
            ->whereIn('status', $activeStatuses)
            ->get(['id', 'assigned_to', 'status', 'estimated_duration',
                   'started_at', 'paused_at', 'total_paused_seconds']);

        // Via pivot (assistant role)
        $pivotRows = \App\Models\TicketWasher::whereIn('user_id', $washerIds)
            ->whereHas('ticket', fn ($q) => $q->whereIn('status', $activeStatuses))
            ->get(['ticket_id', 'user_id']);

        // Load the assistant tickets (one extra query for the distinct ticket set)
        $assistantTicketIds = $pivotRows->pluck('ticket_id')->unique();
        $assistantTickets   = $assistantTicketIds->isNotEmpty()
            ? Ticket::whereIn('id', $assistantTicketIds)
                ->get(['id', 'status', 'estimated_duration', 'started_at',
                       'paused_at', 'total_paused_seconds'])
                ->keyBy('id')
            : collect();

        // ── 2. Per-washer accumulation (in memory) ────────────────────────────

        // Map washer → ticket ids (direct)
        $directByWasher = $directTickets->groupBy('assigned_to');

        // Map washer → extra ticket ids (assistant)
        $assistantByWasher = $pivotRows->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('ticket_id'));

        // Appointment minutes (still per-washer but batching isn't practical here
        // as it requires interval-union logic per washer; the N queries here are
        // small and cached via Setting for business hours).
        $result = [];

        foreach ($washerIds as $washerId) {
            $ticketsForWasher = collect();

            // Direct
            if (isset($directByWasher[$washerId])) {
                $ticketsForWasher = $ticketsForWasher->merge($directByWasher[$washerId]);
            }

            // Assistant — add tickets not already in the direct list
            if (isset($assistantByWasher[$washerId])) {
                $directIds = $ticketsForWasher->pluck('id');
                foreach ($assistantByWasher[$washerId] as $tId) {
                    if (! $directIds->contains($tId) && isset($assistantTickets[$tId])) {
                        $ticketsForWasher->push($assistantTickets[$tId]);
                    }
                }
            }

            $queueMinutes = 0;
            foreach ($ticketsForWasher as $ticket) {
                $estimated = (int) ($ticket->estimated_duration ?? 0);

                if ($ticket->status === Ticket::STATUS_IN_PROGRESS && $ticket->started_at) {
                    $elapsedSec   = (int) $ticket->started_at->diffInSeconds(now())
                                  - (int) ($ticket->total_paused_seconds ?? 0);
                    $remainingSec = max(0, $estimated * 60 - $elapsedSec);
                    $queueMinutes += (int) ceil($remainingSec / 60);
                } elseif (
                    in_array($ticket->status, [Ticket::STATUS_PAUSED, Ticket::STATUS_BLOCKED])
                    && $ticket->started_at
                ) {
                    $pauseRef     = $ticket->paused_at ?? now();
                    $elapsedSec   = (int) $ticket->started_at->diffInSeconds($pauseRef)
                                  - (int) ($ticket->total_paused_seconds ?? 0);
                    $remainingSec = max(0, $estimated * 60 - $elapsedSec);
                    $queueMinutes += (int) ceil($remainingSec / 60);
                } else {
                    $queueMinutes += $estimated;
                }
            }

            $queueMinutes += static::confirmedAppointmentMinutes($washerId);

            $result[$washerId] = [
                'queue_count'   => $ticketsForWasher->count(),
                'queue_minutes' => $queueMinutes,
                'available_at'  => $queueMinutes > 0
                    ? static::applyBusinessHours(now()->addMinutes($queueMinutes))->toIso8601String()
                    : null,
            ];
        }

        return $result;
    }

    /**
     * Returns metadata for the frontend:
     *   queue_minutes, due_at (ISO 8601), overflow (bool), warning (string|null)
     *
     * @param int $newDurationMinutes  0 = current queue only, >0 = includes new ticket
     */
    public static function feasibilityCheck(int $washerId, int $newDurationMinutes = 0): array
    {
        $queueMinutes = static::queueMinutesForWasher($washerId);

        if ($newDurationMinutes > 0) {
            $rawEnd = now()->addMinutes($queueMinutes + $newDurationMinutes);
            $dueAt  = static::applyBusinessHours($rawEnd);
        } elseif ($queueMinutes > 0) {
            $dueAt = static::applyBusinessHours(now()->addMinutes($queueMinutes));
        } else {
            $dueAt = null;
        }

        $overflow = $dueAt && $dueAt->gt(now()->endOfDay());        $warning = null;
        if ($overflow && $dueAt) {
            $datePart = $dueAt->isTomorrow()
                ? 'demain'
                : ('le ' . $dueAt->isoFormat('ddd D MMM'));
            $warning = "Ce véhicule sera prêt {$datePart} à {$dueAt->format('H:i')} (dépassement horaire)";
        }

        return [
            'queue_minutes' => $queueMinutes,
            'due_at'        => $dueAt?->toIso8601String(),
            'overflow'      => $overflow,
            'warning'       => $warning,
        ];
    }
}
