<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientQuickStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Client::class);
    }public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:100'],
            'phone'      => ['nullable', 'string', 'max:20', Rule::unique('clients', 'phone')->whereNull('deleted_at')],
            'is_company' => ['boolean'],

            // ICE optionnel, mais s'il est fourni il doit être valide (15 chiffres) et unique
            'ice' => [
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
            'phone.unique'     => 'Ce numéro de téléphone est déjà utilisé.',
            'ice.digits'       => 'L\'ICE doit contenir exactement 15 chiffres.',
            'ice.unique'       => 'Cet ICE est déjà enregistré.',
        ];
    }
}
