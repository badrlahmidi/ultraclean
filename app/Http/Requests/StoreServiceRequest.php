<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreServiceRequest extends FormRequest
{
    public function authorize(): bool { return true; }    public function rules(): array
    {
        $id = $this->route('service')?->id;

        return [
            'name'             => ['required', 'string', 'max:100', "unique:services,name,{$id}"],
            'description'      => ['nullable', 'string', 'max:500'],
            'color'            => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
            'is_active'        => ['boolean'],
            'price_type'       => ['required', 'in:fixed,variant'],
            'base_price_cents' => ['nullable', 'integer', 'min:0', 'required_if:price_type,fixed'],
            'prices'           => ['nullable', 'array'],
            'prices.*'         => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'             => 'Le nom du service est obligatoire.',
            'name.unique'               => 'Ce nom de service existe déjà.',
            'color.regex'               => 'La couleur doit être au format hexadécimal (#RRGGBB).',
            'price_type.required'       => 'Le mode de tarification est obligatoire.',
            'base_price_cents.required_if' => 'Le prix est obligatoire pour un tarif fixe.',
        ];
    }
}
