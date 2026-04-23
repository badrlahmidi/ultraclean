<?php

namespace App\Http\Requests;

use App\Models\Appointment;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * StorePublicAppointmentRequest — Validation pour la page publique /reservations.
 *
 * Règle métier centrale : **un seul RDV par (service, heure pleine)**.
 * Si un visiteur a déjà réservé "lavage complet" à 14h, un autre visiteur
 * voulant le même service à 14h reçoit une erreur et doit choisir un autre
 * créneau (15h, 16h, …).
 */
class StorePublicAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Endpoint public — la validation + le throttling se font ailleurs.
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id'         => ['required', 'integer', 'exists:services,id'],
            'scheduled_date'     => ['required', 'date', 'after_or_equal:today'],
            'scheduled_hour'     => ['required', 'integer', 'between:0,23'],

            'guest_name'         => ['required', 'string', 'min:2', 'max:120'],
            'guest_phone'        => ['required', 'string', 'min:6', 'max:30', 'regex:/^[0-9+\-\s()]+$/'],
            'guest_email'        => ['nullable', 'email', 'max:180'],

            'vehicle_plate'      => ['nullable', 'string', 'max:20'],
            'vehicle_brand'      => ['nullable', 'string', 'max:80'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'service_id.required'        => 'Veuillez choisir un service.',
            'service_id.exists'          => 'Service invalide.',
            'scheduled_date.required'    => 'Choisissez une date.',
            'scheduled_date.after_or_equal' => 'La date ne peut pas être dans le passé.',
            'scheduled_hour.required'    => 'Choisissez un créneau horaire.',
            'guest_name.required'        => 'Votre nom est requis.',
            'guest_phone.required'       => 'Votre numéro de téléphone est requis.',
            'guest_phone.regex'          => 'Numéro de téléphone invalide.',
        ];
    }

    /**
     * Règle métier : 1 seul RDV par (service, heure pleine).
     * Applique aussi : service actif + horaires d'ouverture.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return; // skip si validation de base déjà échouée
            }

            $service = Service::find($this->input('service_id'));
            if (! $service || ! $service->is_active) {
                $v->errors()->add('service_id', "Ce service n'est pas disponible.");
                return;
            }

            $hourStart = $this->scheduledHourStart();
            if (! $hourStart) {
                $v->errors()->add('scheduled_hour', 'Créneau invalide.');
                return;
            }

            // Empêche de réserver dans le passé (au quart d'heure près)
            if ($hourStart->isPast() && ! $hourStart->isSameHour(now())) {
                $v->errors()->add('scheduled_hour', 'Ce créneau est déjà passé.');
                return;
            }

            // Horaires d'ouverture : 08h → 20h (créneau commençant)
            if ($hourStart->hour < 8 || $hourStart->hour > 20) {
                $v->errors()->add('scheduled_hour', 'Créneau hors horaires d\'ouverture (08h–21h).');
                return;
            }

            // LA règle métier : un seul RDV par (service, heure)
            if (Appointment::isServiceHourTaken((int) $service->id, $hourStart)) {
                $v->errors()->add('scheduled_hour',
                    "Le créneau {$hourStart->format('H\\hi')} n'est plus disponible pour ce service. "
                    . "Veuillez choisir un autre horaire."
                );
            }
        });
    }

    /** Timestamp Carbon du début d'heure demandé (ou null si input invalide). */
    public function scheduledHourStart(): ?Carbon
    {
        try {
            $date = Carbon::parse($this->input('scheduled_date'));
            $hour = (int) $this->input('scheduled_hour');
            return $date->copy()->setTime($hour, 0, 0);
        } catch (\Throwable) {
            return null;
        }
    }
}
