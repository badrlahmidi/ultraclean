<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Ticket::class);
    }

    public function rules(): array
    {
        return [
            // ── Véhicule ────────────────────────────────────────────────
            'vehicle_brand_id' => ['nullable', 'exists:vehicle_brands,id'],
            // vehicle_model_id est requis dès qu'une marque est sélectionnée
            'vehicle_model_id' => [
                'nullable',
                Rule::requiredIf(fn () => filled($this->vehicle_brand_id)),
                'exists:vehicle_models,id',
            ],            'vehicle_brand'   => ['nullable', 'string', 'max:80'],
            'vehicle_plate'   => ['nullable', 'string', 'max:20'],
            'vehicle_type_id' => ['nullable', 'exists:vehicle_types,id'],

            // ── Client ──────────────────────────────────────────────────
            'client_id' => ['nullable', 'exists:clients,id'],

            // ── Opérateur (laveur actif uniquement) ─────────────────────
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')
                    ->where('role', 'laveur')
                    ->where('is_active', true),
            ],

            // ── Services ────────────────────────────────────────────────
            'services'                       => ['required', 'array', 'min:1'],
            'services.*.service_id'          => ['required', 'exists:services,id'],
            'services.*.quantity'            => ['required', 'integer', 'min:1', 'max:10'],
            'services.*.discount_cents'      => ['nullable', 'integer', 'min:0'],
            'services.*.price_variant_id'    => ['nullable', 'exists:vehicle_types,id'],
            'services.*.unit_price_cents'    => ['required', 'integer', 'min:0'],            // ── Assistants multi-laveur ─────────────────────────────────
            'assistant_ids'   => ['nullable', 'array', 'max:5'],
            'assistant_ids.*' => [
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', 'laveur')
                    ->where('is_active', true),
            ],

            // ── Divers ──────────────────────────────────────────────────
            'notes'               => ['nullable', 'string', 'max:1000'],
            'estimated_duration'  => ['nullable', 'integer', 'min:1', 'max:480'],
            'payment_mode'        => ['nullable', 'in:cash,card,wire,advance,credit'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_model_id.required'            => 'Veuillez sélectionner un modèle pour la marque choisie.',
            'assigned_to.exists'                   => 'L\'opérateur sélectionné est invalide ou inactif.',
            'services.required'                    => 'Sélectionnez au moins un service.',
            'services.min'                         => 'Sélectionnez au moins un service.',
            'services.*.service_id.required'       => 'Service invalide.',
            'services.*.unit_price_cents.required' => 'Prix manquant pour un service.',
        ];
    }
}
