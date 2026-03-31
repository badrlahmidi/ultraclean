<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
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
            ->orderBy('role')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'phone', 'is_active', 'last_login_at', 'created_at', 'deleted_at']);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'roles' => [User::ROLE_ADMIN, User::ROLE_CAISSIER, User::ROLE_LAVEUR],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name'     => ['required', 'string', 'max:100'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'role'     => ['required', 'in:admin,caissier,laveur'],
            'phone'    => ['nullable', 'string', 'max:20'],
            'pin'      => ['required', 'string', 'digits:4'],
            'password' => ['required', Password::min(8)],
        ]);

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'role'      => $request->role,
            'phone'     => $request->phone,
            'pin'       => Hash::make($request->pin),
            'password'  => Hash::make($request->password),
            'is_active' => true,
        ]);

        ActivityLog::log('user.created', $user, ['name' => $user->name, 'role' => $user->role]);

        return back()->with('success', "Utilisateur « {$user->name} » créé.");
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'name'      => ['required', 'string', 'max:100'],
            'email'     => ['required', 'email', "unique:users,email,{$user->id}"],
            'role'      => ['required', 'in:admin,caissier,laveur'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'pin'       => ['nullable', 'string', 'digits:4'],
            'password'  => ['nullable', Password::min(8)],
            'is_active' => ['boolean'],
        ]);

        $data = [
            'name'      => $request->name,
            'email'     => $request->email,
            'role'      => $request->role,
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
