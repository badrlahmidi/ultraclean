<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Both admin and caissier roles can create POS sales (role:admin,caissier middleware)
        return true;
    }

    public function rules(): array
    {
        return [
            // ── Client (optionnel) ───────────────────────────────────────
            'client_id' => ['nullable', 'exists:clients,id'],

            // ── Lignes produit (au moins une requise) ────────────────────
            'products'                         => ['required', 'array', 'min:1'],
            'products.*.sellable_product_id'   => ['required', 'exists:sellable_products,id'],
            'products.*.quantity'              => ['required', 'numeric', 'min:0.01', 'max:1000'],
            'products.*.unit_price_cents'      => ['required', 'integer', 'min:0'],
            'products.*.discount_cents'        => ['nullable', 'integer', 'min:0'],
            'products.*.is_free'               => ['nullable', 'boolean'],

            // ── Remise globale ────────────────────────────────────────────
            'discount_type'  => ['nullable', 'in:percent,fixed'],
            'discount_value' => array_filter([
                'nullable', 'numeric', 'min:0',
                $this->input('discount_type') === 'percent' ? 'max:100' : null,
            ]),

            // ── Paiement ──────────────────────────────────────────────────
            'payment_method'    => ['required', 'in:cash,card,mobile,wire,mixed'],
            'payment_reference' => ['nullable', 'string', 'max:100'],

            // ── Divers ────────────────────────────────────────────────────
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'products.required'                       => 'Ajoutez au moins un produit.',
            'products.min'                            => 'Ajoutez au moins un produit.',
            'products.*.sellable_product_id.required' => 'Produit invalide.',
            'products.*.unit_price_cents.required'    => 'Prix manquant pour un produit.',
            'payment_method.required'                 => 'Choisissez un mode de paiement.',
            'payment_method.in'                       => 'Mode de paiement invalide.',
        ];
    }
}
