<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
| private-user.{id}  — notifications personnelles (toutes rôles)
| private-admin      — flux admin-only
| private-caissier   — tous caissiers + admins
*/

// Canal privé par utilisateur (toutes rôles)
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Canal admin global
Broadcast::channel('admin', function ($user) {
    return $user->role === 'admin';
});

// Canal caissier global (caissier + admin peuvent écouter)
Broadcast::channel('caissier', function ($user) {
    return in_array($user->role, ['caissier', 'admin']);
});

// Canal laveur global (tous les laveurs + admin voient la file complète)
Broadcast::channel('laveur', function ($user) {
    return in_array($user->role, ['laveur', 'admin']);
});
