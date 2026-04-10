/**
 * Topbar.jsx
 * ─────────────────────────────────────────────────────────────────
 * Barre de navigation supérieure.
 *
 * Contient :
 *   - Hamburger mobile (ouvre MobileDrawer)
 *   - Titre de la page
 *   - Indicateur de shift ouvert
 *   - Panneau de notifications (custom dropdown)
 *   - Menu utilisateur (HeadlessUI Menu pour accessibilité)
 *
 * Corrections apportées vs version originale :
 *   ✅ markAllRead déclenché à la FERMETURE du panneau notifs
 *   ✅ Notifications cliquables (lien vers le ticket)
 *   ✅ Menu user via HeadlessUI Menu (keyboard nav, ARIA natifs)
 *   ✅ Z-index cohérent (panels z-[50], toasts z-[70])
 *   ✅ Plus de mousedown/ref manual pour les dropdowns
 *
 * Props :
 *   title         — string | null
 *   appName       — string
 *   auth          — { user, activeShift }
 *   onOpenMobile  — () => void
 *   notifications — array
 *   unreadCount   — number
 *   markAllRead   — () => void
 *   dismiss       — (id) => void
 *   clearAll      — () => void
 *   onLogout      — () => void
 * ─────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Bell, X, ChevronDown, Menu as MenuIcon, LogOut, User } from 'lucide-react';
import clsx from 'clsx';
import { safeRoute, ROLE_LABELS, ROLE_COLORS, ROLE_DASHBOARD } from '@/Layouts/navConfig';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

/* ─── Formatage de la date de notification ─── */
function formatNotifTime(isoDate) {
    try {
        return formatDistanceToNow(new Date(isoDate), { addSuffix: true, locale: fr });
    } catch {
        return '';
    }
}

/* ─── Résolution du lien vers le ticket ─────────────────────────
 * Tente de résoudre la route caissier.tickets.show avec l'id.
 * Retourne null si la route n'est pas disponible.
 * ─────────────────────────────────────────────────────────────── */
function getTicketHref(ticketId, role) {
    if (!ticketId) return null;
    const routeName = role === 'laveur'
        ? null
        : 'caissier.tickets.show';
    if (!routeName) return null;
    const href = safeRoute(routeName, { ticket: ticketId });
    return href !== '#' ? href : null;
}

export default function Topbar({
    title,
    appName,
    auth,
    onOpenMobile,
    notifications = [],
    unreadCount = 0,
    markAllRead,
    dismiss,
    clearAll,
    onLogout,
}) {
    const role = auth?.user?.role;
    const user = auth?.user;

    /* ── Panneau notifications (state local) ─── */
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);
    const notifWasOpen = useRef(false);

    /* ── Fermeture au clic extérieur ── */
    useEffect(() => {
        if (!notifOpen) return;
        function handleOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [notifOpen]);

    /* ── Fermeture sur Escape ── */
    useEffect(() => {
        if (!notifOpen) return;
        function handleEscape(e) {
            if (e.key === 'Escape') setNotifOpen(false);
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [notifOpen]);

    /* ── markAllRead à la FERMETURE (pas à l'ouverture) ──────────
     * On marque seulement quand le panneau passe de true → false.
     * ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (notifWasOpen.current && !notifOpen && unreadCount > 0) {
            markAllRead();
        }
        notifWasOpen.current = notifOpen;
    }, [notifOpen, markAllRead, unreadCount]);

    const toggleNotif = useCallback(() => setNotifOpen(o => !o), []);

    /* ── Avatar initiale ── */
    const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? '?';
    const _dashboardHref = safeRoute(ROLE_DASHBOARD[role] ?? 'dashboard');

    return (
        <header
            role="banner"
            className="flex items-center gap-2 px-4 h-14 bg-white border-b border-gray-200 shadow-sm shrink-0 z-[40]"
        >
            {/* ── Hamburger (mobile uniquement) ── */}
            <button
                onClick={onOpenMobile}
                aria-label="Ouvrir le menu de navigation"
                className={clsx(
                    'md:hidden p-2 min-w-[40px] min-h-[40px] flex items-center justify-center',
                    'rounded-lg text-gray-500 hover:bg-gray-100 transition-colors outline-none',
                    'focus-visible:ring-2 focus-visible:ring-blue-500'
                )}
            >
                <MenuIcon size={20} aria-hidden="true" />
            </button>

            {/* ── Titre de la page ── */}
            <div className="flex-1 min-w-0">
                <h1
                    className="font-semibold text-gray-800 text-sm truncate"
                    title={title ?? appName}
                >
                    {title ?? appName}
                </h1>
            </div>

            {/* ── Actions droite ── */}
            <div className="flex items-center gap-1.5 shrink-0">                {/* ── Indicateur shift ouvert ── */}
                {auth?.activeShift && (
                    <Link
                        href={safeRoute('caissier.shift.index')}
                        role="status"
                        aria-label="Shift en cours — gérer la caisse"
                        className={clsx(
                            'hidden sm:flex items-center gap-1.5',
                            'text-xs font-medium text-green-700 bg-green-50',
                            'border border-green-200 rounded-full px-3 py-1',
                            'hover:bg-green-100 hover:border-green-300 transition-colors'
                        )}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                        <span>Shift ouvert</span>
                    </Link>
                )}

                {/* ════════════════════════════════════════
                 * PANNEAU NOTIFICATIONS
                 * ════════════════════════════════════════ */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={toggleNotif}
                        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
                        aria-expanded={notifOpen}
                        aria-haspopup="true"
                        className={clsx(
                            'relative p-2 rounded-lg transition-colors outline-none',
                            'min-w-[40px] min-h-[40px] flex items-center justify-center',
                            'focus-visible:ring-2 focus-visible:ring-blue-500',
                            notifOpen
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-500 hover:bg-gray-100'
                        )}
                    >
                        <Bell size={18} aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown notifications */}
                    {notifOpen && (
                        <div
                            role="dialog"
                            aria-label="Notifications"
                            className={clsx(
                                'absolute right-0 top-full mt-2 w-80 sm:w-96',
                                'bg-white rounded-2xl shadow-xl border border-gray-200',
                                'z-[50] overflow-hidden',
                                'animate-in fade-in slide-in-from-top-2 duration-150'
                            )}
                        >
                            {/* En-tête */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-gray-800">Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {notifications.some(n => !n.read) && (
                                        <button
                                            onClick={markAllRead}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline outline-none focus-visible:underline"
                                        >
                                            Tout lire
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="text-xs text-gray-400 hover:text-red-500 font-medium hover:underline outline-none focus-visible:underline"
                                        >
                                            Effacer tout
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Liste */}
                            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                                {notifications.length === 0 ? (
                                    /* Empty state */
                                    <div className="px-4 py-10 text-center">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <Bell size={22} className="text-gray-300" aria-hidden="true" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">Aucune notification</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Vous êtes à jour !</p>
                                    </div>
                                ) : (
                                    notifications.map(n => {
                                        const ticketHref = getTicketHref(n.ticketId, role);
                                        const Wrapper = ticketHref ? Link : 'div';
                                        const wrapperProps = ticketHref
                                            ? { href: ticketHref, onClick: () => setNotifOpen(false) }
                                            : {};

                                        return (
                                            <div
                                                key={n.id}
                                                className={clsx(
                                                    'flex items-start gap-3 px-4 py-3 transition-colors',
                                                    !n.read ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                                                )}
                                            >
                                                {/* Indicateur non-lu */}
                                                {!n.read && (
                                                    <span
                                                        aria-label="Non lue"
                                                        className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                                                    />
                                                )}

                                                {/* Contenu (cliquable si ticketHref disponible) */}
                                                <Wrapper
                                                    {...wrapperProps}
                                                    className={clsx(
                                                        'flex-1 min-w-0',
                                                        ticketHref && 'cursor-pointer hover:text-blue-700 group'
                                                    )}
                                                >
                                                    <p className={clsx(
                                                        'text-sm font-semibold text-gray-800 leading-tight',
                                                        ticketHref && 'group-hover:text-blue-700 transition-colors'
                                                    )}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {formatNotifTime(n.at)}
                                                    </p>
                                                </Wrapper>

                                                {/* Bouton dismiss */}
                                                <button
                                                    onClick={() => dismiss(n.id)}
                                                    aria-label="Rejeter cette notification"
                                                    className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5 outline-none focus-visible:text-gray-500 rounded"
                                                >
                                                    <X size={14} aria-hidden="true" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════════════════════════════════════
                 * MENU UTILISATEUR (HeadlessUI Menu)
                 * Gère keyboard nav, Escape, ARIA natifs
                 * ════════════════════════════════════════ */}
                <Menu as="div" className="relative">
                    {({ open: menuOpen }) => (
                        <>
                            <MenuButton
                                className={clsx(
                                    'flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl',
                                    'hover:bg-gray-100 transition-colors outline-none',
                                    'focus-visible:ring-2 focus-visible:ring-blue-500',
                                    menuOpen && 'bg-gray-100'
                                )}
                            >
                                {/* Avatar */}
                                <div className={clsx(
                                    'w-7 h-7 rounded-full flex items-center justify-center',
                                    'text-white text-xs font-bold shrink-0',
                                    ROLE_COLORS[role] ?? 'bg-gray-500'
                                )}>
                                    {userInitial}
                                </div>

                                {/* Nom + rôle (caché sur très petit écran) */}
                                <div className="hidden sm:block text-left leading-tight">
                                    <p className="text-xs font-semibold text-gray-800">{user?.name}</p>
                                    <p className="text-[10px] text-gray-400">{ROLE_LABELS[role]}</p>
                                </div>

                                <ChevronDown
                                    size={13}
                                    aria-hidden="true"
                                    className={clsx(
                                        'text-gray-400 transition-transform duration-200',
                                        menuOpen && 'rotate-180'
                                    )}
                                />
                            </MenuButton>

                            <MenuItems
                                className={clsx(
                                    'absolute right-0 top-full mt-2 w-48',
                                    'bg-white rounded-xl shadow-lg border border-gray-200',
                                    'z-[50] py-1 overflow-hidden outline-none',
                                    'animate-in fade-in slide-in-from-top-2 duration-150'
                                )}
                            >                                {/* Info utilisateur */}
                                <div className="px-3 py-2.5 border-b border-gray-100">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{ROLE_LABELS[role]}</p>
                                </div>

                                {/* Mon profil */}
                                <MenuItem>
                                    {({ focus }) => (
                                        <Link
                                            href={safeRoute('profile.edit')}
                                            className={clsx(
                                                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm',
                                                'text-gray-700 transition-colors outline-none',
                                                focus ? 'bg-gray-50' : 'hover:bg-gray-50'
                                            )}
                                        >
                                            <User size={15} aria-hidden="true" />
                                            Mon profil
                                        </Link>
                                    )}
                                </MenuItem>

                                {/* Déconnexion */}
                                <MenuItem>
                                    {({ focus }) => (
                                        <button
                                            onClick={onLogout}
                                            className={clsx(
                                                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm',
                                                'text-red-600 transition-colors outline-none',
                                                focus ? 'bg-red-50' : 'hover:bg-red-50'
                                            )}
                                        >
                                            <LogOut size={15} aria-hidden="true" />
                                            Déconnexion
                                        </button>
                                    )}
                                </MenuItem>
                            </MenuItems>
                        </>
                    )}
                </Menu>

            </div>
        </header>
    );
}
