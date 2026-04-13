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
            ],
            'vehicle_brand'   => ['nullable', 'string', 'max:80'],
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

            // ── Services (at least one service OR product required, validated in withValidator) ──
            'services'                       => ['nullable', 'array'],
            'services.*.service_id'          => ['required', 'exists:services,id'],
            'services.*.quantity'            => ['required', 'integer', 'min:1', 'max:10'],
            'services.*.discount_cents'      => ['nullable', 'integer', 'min:0'],
            'services.*.price_variant_id'    => ['nullable', 'exists:vehicle_types,id'],
            'services.*.unit_price_cents'    => ['required', 'integer', 'min:0'],

            // ── Products (sellable products) ────────────────────────────
            'products'                          => ['nullable', 'array'],
            'products.*.sellable_product_id'    => ['required', 'exists:sellable_products,id'],
            'products.*.quantity'               => ['required', 'numeric', 'min:0.01', 'max:1000'],
            'products.*.unit_price_cents'       => ['required', 'integer', 'min:0'],
            'products.*.discount_cents'         => ['nullable', 'integer', 'min:0'],
            'products.*.is_free'                => ['nullable', 'boolean'],

            // ── Assistants multi-laveur ─────────────────────────────────
            'assistant_ids'   => ['nullable', 'array', 'max:5'],
            'assistant_ids.*' => [
                'integer',
                Rule::exists('users', 'id')
                    ->where('role', 'laveur')
                    ->where('is_active', true),
            ],

            // ── Discount (Remise) ───────────────────────────────────────
            'discount_type'  => ['nullable', 'in:percent,fixed'],
            'discount_value' => array_filter([
                'nullable', 'numeric', 'min:0',
                $this->input('discount_type') === 'percent' ? 'max:100' : null,
            ]),

            // ── Divers ──────────────────────────────────────────────────
            'notes'               => ['nullable', 'string', 'max:1000'],
            'estimated_duration'  => ['nullable', 'integer', 'min:1', 'max:480'],
            'payment_mode'        => ['nullable', 'in:cash,card,wire,advance,credit'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $services = $this->input('services', []);
            $products = $this->input('products', []);

            // At least one service OR one product is required
            if (empty($services) && empty($products)) {
                $validator->errors()->add('services', 'Sélectionnez au moins un service ou un produit.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'vehicle_model_id.required'               => 'Veuillez sélectionner un modèle pour la marque choisie.',
            'assigned_to.exists'                      => 'L\'opérateur sélectionné est invalide ou inactif.',
            'services.*.service_id.required'          => 'Service invalide.',
            'services.*.unit_price_cents.required'    => 'Prix manquant pour un service.',
            'products.*.sellable_product_id.required' => 'Produit invalide.',
            'products.*.unit_price_cents.required'    => 'Prix manquant pour un produit.',
        ];
    }
}

