<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource — Expose uniquement les champs publics d'un utilisateur.
 *
 * Exclut : password, pin, remember_token, email (sauf pour l'user courant),
 *          email_verified_at, deleted_at.
 *
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    /** Disable default "data" wrapping for Inertia compatibility. */
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'name'      => $this->name,
            'role'      => $this->role,
            'avatar'    => $this->avatar,
            'is_active' => $this->is_active,
            'phone'     => $this->phone,

            // Email visible uniquement par l'utilisateur lui-même ou un admin
            'email' => $this->when(
                $request->user()?->id === $this->id || $request->user()?->isAdmin(),
                $this->email
            ),

            'last_login_at' => $this->when(
                $request->user()?->isAdmin(),
                $this->last_login_at
            ),

            'created_at' => $this->created_at,
        ];
    }
}
