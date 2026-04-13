<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int    $id
 * @property string $name         Clé technique (ex : 'tickets.create')
 * @property string $display_name Libellé affiché (ex : 'Créer des tickets')
 * @property string $group        Catégorie (tickets, clients, …)
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Role> $roles
 */
class Permission extends Model
{
    protected $fillable = ['name', 'display_name', 'group'];

    // ── Relations ──────────────────────────────────────────────────────

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }
}
