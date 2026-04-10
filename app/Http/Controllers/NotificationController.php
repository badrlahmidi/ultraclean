<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NotificationController — API pour les notifications in-app (Topbar bell).
 *
 * Routes :
 *   GET    /notifications          → index (paginated, unread count)
 *   POST   /notifications/read-all → markAllRead
 *   DELETE /notifications/{id}     → dismiss
 *   DELETE /notifications          → clearAll
 */
class NotificationController extends Controller
{
    /**
     * Liste paginée des notifications de l'utilisateur connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = $user->notifications()
            ->latest()
            ->take(50)
            ->get()
            ->map(fn ($n) => [
                'id'    => $n->id,
                'type'  => $n->data['type'] ?? 'info',
                'icon'  => $n->data['icon'] ?? '🔔',
                'title' => $n->data['title'] ?? '',
                'body'  => $n->data['body'] ?? '',
                'at'    => $n->created_at->toIso8601String(),
                'read'  => $n->read_at !== null,
                'data'  => $n->data,
            ]);

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Marquer toutes les notifications comme lues.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }

    /**
     * Supprimer une notification.
     */
    public function dismiss(Request $request, string $id): JsonResponse
    {
        $request->user()
            ->notifications()
            ->where('id', $id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Supprimer toutes les notifications.
     */
    public function clearAll(Request $request): JsonResponse
    {
        $request->user()->notifications()->delete();

        return response()->json(['ok' => true]);
    }
}
