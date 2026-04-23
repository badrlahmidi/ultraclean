<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePublicAppointmentRequest;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

/**
 * PublicAppointmentController — Réservation en ligne pour visiteurs non authentifiés.
 *
 * Flux :
 *   1. GET  /reservations                  → formulaire (liste services + calendrier)
 *   2. GET  /api/reservations/availability → JSON : créneaux libres pour (service, date)
 *   3. POST /reservations                  → crée un RDV en statut "pending" (source=online)
 *   4. GET  /reservations/confirmation/{ulid} → page de confirmation (signée)
 *
 * Règle métier : un seul RDV par (service, heure pleine).
 */
class PublicAppointmentController extends Controller
{
    /** Heures d'ouverture par défaut (écrasables via Settings). */
    private const DEFAULT_OPEN_HOUR  = 8;
    private const DEFAULT_CLOSE_HOUR = 21; // dernier créneau commençant à 20h inclus

    /** Page principale — formulaire de réservation. */
    public function create(): Response
    {
        $services = Service::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'duration_minutes', 'base_price_cents', 'color']);

        $rawSettings = Setting::getMany(['center_name', 'center_phone', 'center_address']);
        $settings = [
            'center_name'    => $rawSettings['center_name']    ?: config('app.name'),
            'center_phone'   => $rawSettings['center_phone']   ?: '',
            'center_address' => $rawSettings['center_address'] ?: '',
        ];

        [$openHour, $closeHour] = $this->businessHours();

        return Inertia::render('Public/Reservations/Create', [
            'services'   => $services,
            'settings'   => $settings,
            'openHour'   => $openHour,
            'closeHour'  => $closeHour,
        ]);
    }

    /**
     * Disponibilités JSON pour un service à une date donnée.
     * Renvoie la liste des heures pleines (08h..20h) avec un flag "available".
     */
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'date'       => ['required', 'date', 'after_or_equal:today'],
        ]);

        $date    = Carbon::parse($data['date'])->startOfDay();
        $service = Service::findOrFail($data['service_id']);

        [$openHour, $closeHour] = $this->businessHours();
        // Dernier créneau possible = closeHour - 1 (un RDV de 20h occupe 20h-21h)
        $lastSlotHour = $closeHour - 1;

        // Récupère les heures déjà occupées pour ce service ce jour
        $taken = Appointment::where('service_id', $service->id)
            ->whereIn('status', Appointment::SLOT_BLOCKING_STATUSES)
            ->whereDate('scheduled_at', $date->toDateString())
            ->pluck('scheduled_at')
            ->map(fn ($dt) => Carbon::parse($dt)->hour)
            ->unique()
            ->all();

        $slots = [];
        for ($h = $openHour; $h <= $lastSlotHour; $h++) {
            $slotStart = $date->copy()->setTime($h, 0);
            $inPast    = $slotStart->isPast() && ! $slotStart->isSameHour(now());
            $slots[] = [
                'hour'      => $h,
                'label'     => sprintf('%02dh00', $h),
                'available' => ! in_array($h, $taken, true) && ! $inPast,
                'reason'    => $inPast ? 'past' : (in_array($h, $taken, true) ? 'taken' : null),
            ];
        }

        return response()->json([
            'date'    => $date->toDateString(),
            'service' => ['id' => $service->id, 'name' => $service->name],
            'slots'   => $slots,
        ]);
    }

    /** Enregistre la réservation publique. */
    public function store(StorePublicAppointmentRequest $request): RedirectResponse
    {
        $service = Service::findOrFail($request->integer('service_id'));
        $start   = $request->scheduledHourStart();

        $appointment = Appointment::create([
            'service_id'         => $service->id,
            'created_by'         => $this->systemUserId(),
            'scheduled_at'       => $start,
            'estimated_duration' => $service->duration_minutes ?? 30,
            'guest_name'         => $request->string('guest_name')->trim(),
            'guest_phone'        => $request->string('guest_phone')->trim(),
            'guest_email'        => $request->input('guest_email'),
            'vehicle_plate'      => $request->input('vehicle_plate'),
            'vehicle_brand'      => $request->input('vehicle_brand'),
            'notes'              => $request->input('notes'),
            'status'             => Appointment::STATUS_PENDING,
            'source'             => 'online',
        ]);

        Log::info('[PublicAppointment] New online reservation', [
            'ulid'       => $appointment->ulid,
            'service_id' => $service->id,
            'start'      => $start->toIso8601String(),
        ]);

        return redirect()
            ->route('reservations.confirmation', ['ulid' => $appointment->ulid])
            ->with('success', "Votre réservation a bien été enregistrée.");
    }

    /** Page de confirmation après envoi (accessible par ULID). */
    public function confirmation(string $ulid): Response
    {
        $appointment = Appointment::with('service:id,name,duration_minutes')
            ->where('ulid', $ulid)
            ->firstOrFail();

        return Inertia::render('Public/Reservations/Confirmation', [
            'appointment' => [
                'ulid'          => $appointment->ulid,
                'status'        => $appointment->status,
                'scheduled_at'  => $appointment->scheduled_at,
                'estimated_duration' => $appointment->estimated_duration,
                'guest_name'    => $appointment->guest_name,
                'guest_phone'   => $appointment->guest_phone,
                'vehicle_plate' => $appointment->vehicle_plate,
                'service'       => $appointment->service
                    ? ['name' => $appointment->service->name]
                    : null,
            ],
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /** Renvoie [openHour, closeHour] depuis Settings, avec défauts. */
    private function businessHours(): array
    {
        $raw = Setting::getMany(['opening_time', 'closing_time']);

        $parse = static function (?string $value, int $default): int {
            if (! is_string($value) || ! preg_match('/^(\d{1,2}):/', $value, $m)) {
                return $default;
            }
            return max(0, min(23, (int) $m[1]));
        };

        $open  = $parse($raw['opening_time']  ?? null, self::DEFAULT_OPEN_HOUR);
        $close = $parse($raw['closing_time']  ?? null, self::DEFAULT_CLOSE_HOUR);

        if ($close <= $open) {
            $close = self::DEFAULT_CLOSE_HOUR;
        }

        return [$open, $close];
    }

    /**
     * Utilisateur "système" servant de created_by pour les RDV publics.
     * On prend le premier admin actif ; si aucun, le premier utilisateur.
     * (En production, un admin existe toujours au seed.)
     */
    private function systemUserId(): int
    {
        $id = User::where('role', 'admin')->where('is_active', true)->value('id')
            ?? User::where('role', 'admin')->value('id')
            ?? User::query()->value('id');

        if (! $id) {
            throw new \RuntimeException(
                'Aucun utilisateur disponible pour attribuer la réservation publique.'
            );
        }

        return (int) $id;
    }
}
