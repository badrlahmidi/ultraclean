<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int    $id
 * @property string $name         Clé technique (admin, caissier, laveur, …)
 * @property string $display_name Nom affiché dans l'UI
 * @property string $color        Classe Tailwind bg-* (ex : purple-600)
 * @property bool   $is_system    Rôle système — non supprimable
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Permission> $permissions
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User>       $users
 */
class Role extends Model
{
    protected $fillable = ['name', 'display_name', 'color', 'is_system'];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    // ── Relations ──────────────────────────────────────────────────────

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    /**
     * Vérifie si ce rôle possède une permission donnée.
     * Utilise le cache chargé si les permissions ont déjà été eager-loaded.
     */
    public function hasPermission(string $permission): bool
    {
        // If already loaded, avoid extra query
        if ($this->relationLoaded('permissions')) {
            return $this->permissions->contains('name', $permission);
        }

        return $this->permissions()->where('name', $permission)->exists();
    }

    /**
     * Retourne la liste des noms de permissions (tableau plat).
     * Utile pour la sérialisation JSON vers le frontend.
     */
    public function permissionNames(): array
    {
        return $this->permissions->pluck('name')->all();
    }
}
