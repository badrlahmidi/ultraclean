<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a ticket update payload.
 *
 * Intentionally narrower than StoreTicketRequest:
 *  - vehicle_type_id is NOT updatable — it drives pricing, and changing it
 *    post-creation would silently invalidate the stored service-line prices.
 *  - services uses 'sometimes' so omitting the key leaves lines untouched,
 *    while sending an array triggers a full, validated replacement.
 *
 * Authorization delegates to TicketPolicy::update() so the gate is enforced
 * in one place rather than repeated across controller methods.
 */
class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('ticket'));
    }

    public function rules(): array
    {
        return [
            // ── Véhicule ──────────────────────────────────────────────────────
            'vehicle_brand_id' => ['nullable', 'integer', 'exists:vehicle_brands,id'],
            'vehicle_model_id' => [
                'nullable',
                Rule::requiredIf(fn () => filled($this->vehicle_brand_id)),
                'integer',
                'exists:vehicle_models,id',
            ],
            'vehicle_brand' => ['nullable', 'string', 'max:80'],
            'vehicle_plate' => ['nullable', 'string', 'max:20'],

            // ── Client & assignation ─────────────────────────────────────────
            'client_id'   => ['nullable', 'integer', 'exists:clients,id'],
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')
                    ->where('role', 'laveur')
                    ->where('is_active', true),
            ],

            // ── Assistants multi-laveur ──────────────────────────────────────
            'assistant_ids'   => ['nullable', 'array', 'max:5'],
            'assistant_ids.*' => [
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', 'laveur')
                    ->where('is_active', true),
            ],

            // ── Services (optional full-replacement) ─────────────────────────
            // Omit the key entirely to leave existing lines untouched.
            'services'                    => ['sometimes', 'array', 'min:1'],
            'services.*.service_id'       => ['required', 'integer', 'exists:services,id'],
            'services.*.unit_price_cents' => ['required', 'integer', 'min:0'],
            'services.*.quantity'         => ['required', 'integer', 'min:1', 'max:10'],
            'services.*.discount_cents'   => ['nullable', 'integer', 'min:0'],
            'services.*.price_variant_id' => ['nullable', 'integer', 'exists:vehicle_types,id'],

            // ── Divers ────────────────────────────────────────────────────────
            'notes'              => ['nullable', 'string', 'max:2000'],
            'payment_mode'       => ['nullable', 'string', 'in:cash,card,wire,advance,credit'],
            'estimated_duration' => ['nullable', 'integer', 'min:0', 'max:480'],

            // ── Products (optional full-replacement) ─────────────────────────
            // Omit the key entirely to leave existing product lines untouched.
            'products'                          => ['sometimes', 'nullable', 'array'],
            'products.*.sellable_product_id'    => ['required', 'exists:sellable_products,id'],
            'products.*.quantity'               => ['required', 'numeric', 'min:0.01', 'max:1000'],
            'products.*.unit_price_cents'       => ['required', 'integer', 'min:0'],
            'products.*.discount_cents'         => ['nullable', 'integer', 'min:0'],
            'products.*.is_free'                => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_model_id.required'            => 'Veuillez sélectionner un modèle pour la marque choisie.',
            'assigned_to.exists'                   => 'L\'opérateur sélectionné est invalide ou inactif.',
            'services.*.service_id.required'       => 'Service invalide.',
            'services.*.unit_price_cents.required' => 'Prix manquant pour un service.',
            'products.*.sellable_product_id.required' => 'Produit invalide.',
            'products.*.unit_price_cents.required'    => 'Prix manquant pour un produit.',
        ];
    }
}
