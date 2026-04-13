<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * RoleController — Gestion des rôles et de la matrice de permissions.
 *
 * Routes :
 *   GET  /admin/roles              → index  (liste des rôles + matrice)
 *   POST /admin/roles              → store  (créer un rôle)
 *   PUT  /admin/roles/{role}       → update (mettre à jour display_name/color + permissions)
 *   DELETE /admin/roles/{role}     → destroy (supprimer un rôle non-système)
 *   POST /admin/roles/{role}/sync  → sync   (synchroniser permissions d'un rôle)
 */
class RoleController extends Controller
{
    /**
     * Matrice rôles × permissions.
     * Passe toutes les permissions groupées et tous les rôles avec leurs permissions.
     */
    public function index(): Response
    {
        $roles = Role::with('permissions')
            ->orderByRaw('is_system DESC')
            ->orderBy('name')
            ->get();

        $permissions = Permission::orderBy('group')->orderBy('display_name')->get();

        $permissionsByGroup = $permissions->groupBy('group');

        // Nombre d'utilisateurs par rôle (pour savoir si supprimable)
        $userCountByRole = User::withTrashed()
            ->whereNotNull('role_id')
            ->groupBy('role_id')
            ->selectRaw('role_id, COUNT(*) as count')
            ->pluck('count', 'role_id');

        return Inertia::render('Admin/Roles/Index', [
            'roles'              => $roles->map(fn (Role $r) => [
                'id'           => $r->id,
                'name'         => $r->name,
                'display_name' => $r->display_name,
                'color'        => $r->color,
                'is_system'    => $r->is_system,
                'user_count'   => $userCountByRole[$r->id] ?? 0,
                'permissions'  => $r->permissions->pluck('id')->all(),
            ]),
            'permissionsByGroup' => $permissionsByGroup->map(fn ($group) =>
                $group->map(fn (Permission $p) => [
                    'id'           => $p->id,
                    'name'         => $p->name,
                    'display_name' => $p->display_name,
                    'group'        => $p->group,
                ])
            ),
        ]);
    }

    /**
     * Créer un nouveau rôle personnalisé.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'         => ['required', 'string', 'max:50', 'unique:roles,name', 'regex:/^[a-z0-9_]+$/'],
            'display_name' => ['required', 'string', 'max:100'],
            'color'        => ['required', 'string', 'max:30'],
        ]);

        $role = Role::create([
            'name'         => $request->name,
            'display_name' => $request->display_name,
            'color'        => $request->color,
            'is_system'    => false,
        ]);

        ActivityLog::log('role.created', $role, ['name' => $role->name]);

        return back()->with('success', "Rôle « {$role->display_name} » créé.");
    }

    /**
     * Mettre à jour les informations d'un rôle et synchroniser ses permissions.
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        $request->validate([
            'display_name'   => ['required', 'string', 'max:100'],
            'color'          => ['required', 'string', 'max:30'],
            'permission_ids' => ['nullable', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        // Nom technique non modifiable pour les rôles système
        $data = [
            'display_name' => $request->display_name,
            'color'        => $request->color,
        ];

        $role->update($data);

        // Synchroniser les permissions
        $permissionIds = $request->input('permission_ids', []);
        $role->permissions()->sync($permissionIds);

        // Mettre à jour la colonne role_display dans le cache partagé (Inertia)
        // La mise à jour du display_name sera reflétée à la prochaine requête.

        ActivityLog::log('role.updated', $role, ['name' => $role->name, 'permissions_count' => count($permissionIds)]);

        return back()->with('success', "Rôle « {$role->display_name} » mis à jour.");
    }

    /**
     * Supprimer un rôle (non-système uniquement, sans utilisateurs actifs).
     */
    public function destroy(Role $role): RedirectResponse
    {
        if ($role->is_system) {
            return back()->with('error', 'Les rôles système ne peuvent pas être supprimés.');
        }

        $userCount = User::where('role_id', $role->id)->count();
        if ($userCount > 0) {
            return back()->with('error', "Impossible de supprimer : {$userCount} utilisateur(s) ont ce rôle.");
        }

        $name = $role->display_name;
        $role->permissions()->detach();
        $role->delete();

        ActivityLog::log('role.deleted', null, ['name' => $name]);

        return back()->with('success', "Rôle « {$name} » supprimé.");
    }
}
