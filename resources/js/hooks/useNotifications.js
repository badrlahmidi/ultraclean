import { useState, useEffect, useCallback } from 'react';
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

const MAX_NOTIFS = 30;

/**
 * Subscribe to real-time ticket notifications via Laravel Reverb.
 *
 * Returns:
 *   notifications  — array of { id, type, title, body, at, read }
 *   unreadCount    — number
 *   markAllRead()  — fn
 *   dismiss(id)    — fn
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
    }); const push = useCallback((notif) => {
        setNotifications(prev => {
            const next = [{ ...notif, read: false, at: new Date().toISOString() }, ...prev].slice(0, MAX_NOTIFS);
            localStorage.setItem('uc_notifications', JSON.stringify(next));
            return next;
        });
        // Also fire a toast
        toast(notif.title + '\n' + notif.body, { icon: '🔔', duration: 4000 });
    }, []); useEffect(() => {
        if (!user) return;

        const channels = [];
        let active = true;

        // ── Canal privé personnel (laveur reçoit ses tickets) ──
        try {
            const userChannel = echo.private(`user.${user.id}`);
            channels.push({ ch: userChannel, name: `user.${user.id}` });

            userChannel.listen('.ticket.assigned', (data) => {
                if (!active) return;
                push({
                    id: `assigned-${data.id}-${Date.now()}`,
                    type: 'assigned',
                    title: '🚗 Nouveau ticket assigné',
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
                    title: `🔄 Ticket ${data.ticket_number}`,
                    body: `Statut → ${newLabel}${data.vehicle_plate ? ' · ' + data.vehicle_plate : ''}`,
                    ticketId: data.id,
                    ticketNumber: data.ticket_number,
                });
            });
        } catch (e) {
            console.warn('[useNotifications] user channel error:', e);
        }

        // ── Canal caissier global ──
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
                        title: '✅ Ticket prêt au paiement',
                        body: `${data.ticket_number} · ${data.vehicle_plate ?? ''}`,
                        ticketId: data.id,
                        ticketNumber: data.ticket_number,
                    });
                });
            } catch (e) {
                console.warn('[useNotifications] caissier channel error:', e);
            }
        }

        // ── Canal admin ──
        if (user.role === 'admin') {
            try {
                const adminChannel = echo.private('admin');
                channels.push({ ch: adminChannel, name: 'admin' });

                adminChannel.listen('.ticket.assigned', (data) => {
                    if (!active) return;
                    push({
                        id: `admin-assigned-${data.id}-${Date.now()}`,
                        type: 'assigned',
                        title: `📋 Ticket créé · ${data.ticket_number}`,
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
                    echo.leave(name);
                } catch { /* ignore cleanup errors */ }
            });
        };
    }, [user?.id, user?.role, push]); const markAllRead = useCallback(() => {
        setNotifications(prev => {
            const next = prev.map(n => ({ ...n, read: true }));
            localStorage.setItem('uc_notifications', JSON.stringify(next));
            return next;
        });
    }, []);

    const dismiss = useCallback((id) => {
        setNotifications(prev => {
            const next = prev.filter(n => n.id !== id);
            localStorage.setItem('uc_notifications', JSON.stringify(next));
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        localStorage.removeItem('uc_notifications');
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return { notifications, unreadCount, markAllRead, dismiss, clearAll };
}
