<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::withTrashed()
            ->with('userRole')
            ->orderBy('role')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'role_id', 'phone', 'is_active', 'last_login_at', 'created_at', 'deleted_at']);

        $roles = Role::orderByRaw('is_system DESC')->orderBy('name')->get(['id', 'name', 'display_name', 'color']);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users->map(fn ($u) => [
                'id'           => $u->id,
                'name'         => $u->name,
                'email'        => $u->email,
                'role'         => $u->role,
                'role_id'      => $u->role_id,
                'role_display' => $u->userRole?->display_name ?? ucfirst($u->role ?? ''),
                'role_color'   => $u->userRole?->color ?? 'gray-500',
                'phone'        => $u->phone,
                'is_active'    => $u->is_active,
                'last_login_at'=> $u->last_login_at,
                'created_at'   => $u->created_at,
                'deleted_at'   => $u->deleted_at,
            ]),
            'roles' => $roles,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'role_id'  => ['required', 'integer', 'exists:roles,id'],
            'phone'    => ['nullable', 'string', 'max:20'],
            'pin'      => ['required', 'string', 'digits:4'],
            'password' => ['required', Password::min(8)],
        ]);

        $role = Role::findOrFail($request->role_id);

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'role'      => $role->name,
            'role_id'   => $role->id,
            'phone'     => $request->phone,
            'pin'       => Hash::make($request->pin),
            'password'  => Hash::make($request->password),
            'is_active' => true,
        ]);

        ActivityLog::log('user.created', $user, ['name' => $user->name, 'role' => $user->role]);

        return back()->with('success', "Utilisateur « {$user->name} » créé.");
    }

    public function show(User $user): Response
    {
        $activity = ActivityLog::where('user_id', $user->id)
            ->latest()
            ->limit(30)
            ->get(['id', 'action', 'subject_type', 'properties', 'ip_address', 'created_at']);

        $ticketStats = \Illuminate\Support\Facades\DB::table('tickets')
            ->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                  ->orWhere('assigned_to', $user->id);
            })
            ->selectRaw("COUNT(*) as total, SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END) as revenue")
            ->first();

        return Inertia::render('Admin/Users/Show', [
            'user'        => $user,
            'activity'    => $activity,
            'ticketStats' => $ticketStats,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'name'      => ['required', 'string', 'max:100'],
            'email'     => ['required', 'email', "unique:users,email,{$user->id}"],
            'role_id'   => ['required', 'integer', 'exists:roles,id'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'pin'       => ['nullable', 'string', 'digits:4'],
            'password'  => ['nullable', Password::min(8)],
            'is_active' => ['boolean'],
        ]);

        $role = Role::findOrFail($request->role_id);

        $data = [
            'name'      => $request->name,
            'email'     => $request->email,
            'role'      => $role->name,
            'role_id'   => $role->id,
            'phone'     => $request->phone,
            'is_active' => $request->boolean('is_active', $user->is_active),
        ];

        if ($request->filled('pin'))      $data['pin']      = Hash::make($request->pin);
        if ($request->filled('password')) $data['password'] = Hash::make($request->password);

        $user->update($data);

        ActivityLog::log('user.updated', $user, ['name' => $user->name]);

        return back()->with('success', "Utilisateur « {$user->name} » mis à jour.");
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_if($user->id === auth()->id(), 403, 'Vous ne pouvez pas supprimer votre propre compte.');

        $user->delete(); // SoftDelete

        ActivityLog::log('user.deleted', $user, ['name' => $user->name]);

        return back()->with('success', "Utilisateur « {$user->name} » supprimé.");
    }
}
