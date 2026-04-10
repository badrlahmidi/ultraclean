import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import echo from '@/echo';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
    pending: 'En attente',
    in_progress: 'En lavage',
    completed: 'Terminé',
    paid: 'Payé',
    cancelled: 'Annulé',
};

const MAX_NOTIFS = 50;
const POLL_INTERVAL = 60_000; // 60s — fallback polling for DB notifications

/**
 * Hybrid notification hook:
 *   - Fetches database notifications on mount + periodic polling
 *   - Subscribes to real-time Reverb channels for instant updates
 *   - Merges & deduplicates both sources
 *   - Persists state in localStorage for tab persistence
 *
 * Returns:
 *   notifications  — array of { id, type, icon, title, body, at, read, data }
 *   unreadCount    — number
 *   markAllRead()  — marks all as read (server + local)
 *   dismiss(id)    — removes one notification (server + local)
 *   clearAll()     — removes all notifications (server + local)
 */
export function useNotifications() {
    const { auth } = usePage().props;
    const user = auth?.user;

    const [notifications, setNotifications] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('uc_notifications') ?? '[]');
        } catch {
            return [];
        }
    });

    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    /* ── Persist to localStorage whenever state changes ── */
    useEffect(() => {
        try {
            localStorage.setItem('uc_notifications', JSON.stringify(notifications));
        } catch { /* quota exceeded — ignore */ }
    }, [notifications]);

    /* ── Merge helper: add without duplicates ── */
    const mergeNotifications = useCallback((incoming) => {
        setNotifications(prev => {
            const idSet = new Set(prev.map(n => n.id));
            const newOnes = incoming.filter(n => !idSet.has(n.id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev].slice(0, MAX_NOTIFS);
        });
    }, []);

    /* ── Push a single real-time notification ── */
    const push = useCallback((notif) => {
        setNotifications(prev => {
            const next = [{ ...notif, read: false, at: new Date().toISOString() }, ...prev].slice(0, MAX_NOTIFS);
            return next;
        });
        toast(notif.title + '\n' + notif.body, { icon: notif.icon ?? '🔔', duration: 4000 });
    }, []);

    /* ── Fetch database notifications from server ── */
    const fetchFromServer = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch('/notifications', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (!res.ok) return;
            const data = await res.json();
            if (!isMounted.current) return;

            if (data.notifications?.length) {
                mergeNotifications(data.notifications.map(n => ({
                    id: n.id,
                    type: n.type ?? 'info',
                    icon: n.icon ?? '🔔',
                    title: n.title ?? '',
                    body: n.body ?? '',
                    at: n.at,
                    read: n.read,
                    data: n.data ?? {},
                })));
            }
        } catch (e) {
            console.warn('[useNotifications] fetch error:', e);
        }
    }, [user, mergeNotifications]);

    /* ── Initial fetch + polling ── */
    useEffect(() => {
        if (!user) return;
        fetchFromServer();
        const interval = setInterval(fetchFromServer, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [user, fetchFromServer]);

    /* ── Real-time Reverb subscriptions ── */
    useEffect(() => {
        if (!user || !echo) return;

        const channels = [];
        let active = true;

        // Canal privé personnel
        try {
            const userChannel = echo.private(`user.${user.id}`);
            channels.push({ ch: userChannel, name: `user.${user.id}` });

            userChannel.listen('.ticket.assigned', (data) => {
                if (!active) return;
                push({
                    id: `assigned-${data.id}-${Date.now()}`,
                    type: 'assigned',
                    icon: '🚗',
                    title: 'Nouveau ticket assigné',
                    body: `Ticket ${data.ticket_number} · ${data.vehicle_plate ?? ''}${data.vehicle_brand ? ' · ' + data.vehicle_brand : ''}`,
                    ticketId: data.id,
                    ticketNumber: data.ticket_number,
                });
            });

            userChannel.listen('.ticket.status_updated', (data) => {
                if (!active) return;
                if (user.role === 'laveur' && data.assigned_to !== user.id) return;
                const newLabel = STATUS_LABELS[data.new_status] ?? data.new_status;
                push({
                    id: `status-${data.id}-${Date.now()}`,
                    type: 'status',
                    icon: '🔄',
                    title: `Ticket ${data.ticket_number}`,
                    body: `Statut → ${newLabel}${data.vehicle_plate ? ' · ' + data.vehicle_plate : ''}`,
                    ticketId: data.id,
                    ticketNumber: data.ticket_number,
                });
            });
        } catch (e) {
            console.warn('[useNotifications] user channel error:', e);
        }

        // Canal caissier global
        if (user.role === 'caissier' || user.role === 'admin') {
            try {
                const caissierChannel = echo.private('caissier');
                channels.push({ ch: caissierChannel, name: 'caissier' });

                caissierChannel.listen('.ticket.status_updated', (data) => {
                    if (!active) return;
                    if (data.new_status !== 'completed') return;
                    push({
                        id: `completed-${data.id}-${Date.now()}`,
                        type: 'completed',
                        icon: '✅',
                        title: 'Ticket prêt au paiement',
                        body: `${data.ticket_number} · ${data.vehicle_plate ?? ''}`,
                        ticketId: data.id,
                        ticketNumber: data.ticket_number,
                    });
                });
            } catch (e) {
                console.warn('[useNotifications] caissier channel error:', e);
            }
        }

        // Canal admin
        if (user.role === 'admin') {
            try {
                const adminChannel = echo.private('admin');
                channels.push({ ch: adminChannel, name: 'admin' });

                adminChannel.listen('.ticket.assigned', (data) => {
                    if (!active) return;
                    push({
                        id: `admin-assigned-${data.id}-${Date.now()}`,
                        type: 'assigned',
                        icon: '📋',
                        title: `Ticket créé · ${data.ticket_number}`,
                        body: `Assigné au laveur · ${data.vehicle_plate ?? ''}`,
                        ticketId: data.id,
                        ticketNumber: data.ticket_number,
                    });
                });
            } catch (e) {
                console.warn('[useNotifications] admin channel error:', e);
            }
        }

        return () => {
            active = false;
            channels.forEach(({ ch, name }) => {
                try {
                    ch.stopListening('.ticket.assigned').stopListening('.ticket.status_updated');
                    echo?.leave(name);
                } catch { /* ignore cleanup errors */ }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.role, push]);

    /* ── Actions (server + local) ── */

    const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        fetch('/notifications/read-all', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        }).catch(() => { });
    }, []);

    const dismiss = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        fetch(`/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        }).catch(() => { });
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
        localStorage.removeItem('uc_notifications');
        fetch('/notifications', {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken() },
            credentials: 'same-origin',
        }).catch(() => { });
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, unreadCount, markAllRead, dismiss, clearAll };
}
