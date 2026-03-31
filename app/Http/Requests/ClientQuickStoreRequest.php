<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientQuickStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:100'],
            'phone'      => ['required', 'string', 'max:20', Rule::unique('clients', 'phone')->whereNull('deleted_at')],
            'is_company' => ['boolean'],

            // ICE requis uniquement si c'est une entreprise (15 chiffres exactement)
            'ice' => [
                Rule::requiredIf(fn () => (bool) $this->is_company),
                'nullable',
                'string',
                'digits:15',
                Rule::unique('clients', 'ice')->whereNull('deleted_at'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'    => 'Le nom du client est obligatoire.',
            'phone.required'   => 'Le numéro de téléphone est obligatoire.',
            'phone.unique'     => 'Ce numéro de téléphone est déjà utilisé.',
            'ice.required'     => 'L\'ICE est obligatoire pour une entreprise.',
            'ice.digits'       => 'L\'ICE doit contenir exactement 15 chiffres.',
            'ice.unique'       => 'Cet ICE est déjà enregistré.',
        ];
    }
}
