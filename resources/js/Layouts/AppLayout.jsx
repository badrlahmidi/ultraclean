import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Ticket, Users, Settings, LogOut,
    Menu, X, Wrench, ClipboardList,
    Car, BarChart3, ShieldCheck, Waves, Tag, ChevronDown, CarFront, CalendarDays,
    PanelLeftClose, PanelLeftOpen, UserCheck, History, Search, Percent, Bell, Package, Gift,
    TrendingUp, CalendarRange, RefreshCw, FileText, Receipt,
} from 'lucide-react';
import clsx from 'clsx';
import toast, { Toaster } from 'react-hot-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ROLE_NAV, ROLE_LABELS, ROLE_COLORS, safeRoute, isRouteActive } from '@/Layouts/navConfig';
import CommandPalette from '@/Components/CommandPalette';
import { AppProvider } from '@/Contexts/AppContext';

/* ─── Navigation par rôle → importée depuis navConfig.js ─── */

/* ─── NavItem simple ─── */
function NavItem({ item, currentRoute, collapsed, sharedProps = {} }) {
    const isActive = isRouteActive(currentRoute, item.href);
    const alertCount = item.alertKey ? (sharedProps[item.alertKey] ?? 0) : 0;
    return (
        <Link
            href={safeRoute(item.href)}
            aria-current={isActive ? 'page' : undefined}
            className={clsx(
                'relative flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 min-h-[36px] touch-manipulation group select-none',
                collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-2.5',
                item.accent && !isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-200'
                    : isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}
        >
            {/* Active left-bar indicator */}
            {isActive && !item.accent && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-full" />
            )}
            <item.icon size={15} className={clsx('flex-shrink-0', isActive && !item.accent && 'text-blue-600')} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {/* Alert badge */}
            {alertCount > 0 && !collapsed && (
                <span className="ml-auto flex-shrink-0 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {alertCount}
                </span>
            )}
            {alertCount > 0 && collapsed && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-slate-900" />
            )}
            {/* Tooltip mode réduit */}
            {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {item.label}
                    {alertCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full">{alertCount}</span>}
                </span>
            )}
        </Link>
    );
}

/* ─── NavGroup collapsible ─── */
function NavGroup({ item, currentRoute, collapsed }) {
    const storageKey = `nav-group-${item.key}`;
    const isChildActive = item.activeRoutes?.some(r => currentRoute.startsWith(r));

    const [open, setOpen] = useState(() => {
        try { const s = localStorage.getItem(storageKey); return s !== null ? s === 'true' : isChildActive; }
        catch { return isChildActive; }
    });

    useEffect(() => { if (isChildActive && !open) setOpen(true); }, [currentRoute, isChildActive, open]);

    const toggle = () => {
        const next = !open; setOpen(next);
        try { localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
    };

    /* Mode icônes seules : bouton + sous-menu flyout au hover ET au focus */
    if (collapsed) {
        return (
            <div className="relative group">
                <button
                    aria-label={item.label}
                    aria-haspopup="menu"
                    aria-expanded={isChildActive}
                    className={clsx(
                        'flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-all touch-manipulation',
                        isChildActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    )}
                >
                    <item.icon size={15} className={clsx(isChildActive && 'text-blue-600')} />
                </button>
                {/* Flyout submenu — visible on hover AND keyboard focus-within */}
                <div className="absolute left-full top-0 ml-3 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity duration-150 z-50 py-2 min-w-[200px]">
                    <p className="px-3 pb-1.5 pt-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{item.label}</p>
                    {item.children.map((child, i) => (
                        <Link key={i} href={safeRoute(child.href)}
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                            <child.icon size={14} />
                            {child.label}
                        </Link>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <button onClick={toggle} className={clsx(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium w-full transition-all min-h-[36px] touch-manipulation select-none',
                isChildActive ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}>
                <item.icon size={15} className={clsx('flex-shrink-0', isChildActive && 'text-blue-600')} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown size={13} className={clsx('transition-transform duration-200 flex-shrink-0 text-gray-300', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="ml-[18px] pl-3 border-l border-gray-100 mt-0.5 space-y-0.5">
                    {item.children.map((child, i) => <NavItem key={i} item={child} currentRoute={currentRoute} collapsed={false} />)}
                </div>
            )}
        </div>
    );
}

/* ─── UserDropdown — avatar + nom + déconnexion dans le header ─── */
function UserDropdown({ user, onLogout }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative flex-shrink-0" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label={`Menu utilisateur — ${user?.name ?? 'Profil'}`}
                aria-expanded={open}
                aria-haspopup="true"
            >
                <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                    ROLE_COLORS[user?.role] ?? 'bg-gray-600'
                )}>
                    {initials}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight truncate max-w-[120px]">{user?.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{ROLE_LABELS[user?.role]}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400 hidden md:block" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 z-50 py-1 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 md:hidden">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</p>
                        <p className="text-xs text-gray-400">{ROLE_LABELS[user?.role]}</p>
                    </div>
                    <Link
                        href={route('profile.edit')}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        onClick={() => setOpen(false)}
                    >
                        <Settings size={15} />
                        Mon profil
                    </Link>
                    <button
                        onClick={() => { setOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <LogOut size={15} />
                        Déconnexion
                    </button>
                </div>
            )}
        </div>
    );
}

function AppLayout({ children, title }) {
    const { auth, flash, appName, stockAlerts } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const notifRef = useRef(null);

    const { notifications, unreadCount, markAllRead, dismiss, clearAll } = useNotifications();

    const isOnline = useOnlineStatus();

    // Barre de progression Inertia — remplace useInertiaLoading (fichier supprimé)
    const [navigating, setNavigating] = useState(false);
    useEffect(() => {
        const startHandler = router.on('start', () => setNavigating(true));
        const finishHandler = router.on('finish', () => setNavigating(false));
        return () => {
            startHandler();
            finishHandler();
        };
    }, []);

    // Raccourcis clavier globaux (ne s'activent pas depuis un <input>)
    useKeyboardShortcuts({
        'g d': () => router.visit(safeRoute(auth.user?.role === 'admin' ? 'admin.dashboard'
            : auth.user?.role === 'caissier' ? 'caissier.dashboard' : 'laveur.queue')),
        'g t': () => auth.user?.role === 'caissier' && router.visit(safeRoute('caissier.tickets.create')),
        'g q': () => auth.user?.role !== 'laveur' && router.visit(safeRoute('laveur.queue')),
    });

    // Ctrl+K → palette de commandes
    useEffect(() => {
        function handleCtrlK(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setPaletteOpen(o => !o);
            }
        }
        window.addEventListener('keydown', handleCtrlK);
        return () => window.removeEventListener('keydown', handleCtrlK);
    }, []);

    // Close notif panel on outside click
    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Sidebar collapsible desktop — état persisté dans localStorage
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; }
        catch { return false; }
    });
    const toggleCollapse = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { /* ignore */ }
            return next;
        });
    };

    const currentRoute = route().current() ?? '';
    const navItems = ROLE_NAV[auth.user?.role] ?? [];

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast(flash.warning, { icon: '⚠️' });
    }, [flash]);

    const logout = () => router.post(route('logout'));

    /* ── Contenu partagé sidebar (mobile + desktop) ── */
    const SidebarContent = ({ isMobile = false }) => {
        const { centerLogo } = usePage().props;
        const col = sidebarCollapsed && !isMobile;
        const userInitials = auth.user?.name
            ? auth.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            : '??';

        return (
            <div className="flex flex-col h-full bg-white border-r border-gray-200">
                {/* ── Header : logo centré + collapse button ── */}
                <div className={clsx(
                    'flex items-center border-b border-gray-100 flex-shrink-0',
                    col ? 'h-[60px] justify-center px-0 flex-col gap-0' : 'h-auto min-h-[60px] px-3 gap-2'
                )}>
                    {col ? (
                        /* Mode réduit — icône seule centrée */
                        <div className="flex flex-col items-center gap-1 py-3 w-full">
                            {centerLogo ? (
                                <img src={centerLogo} alt={appName ?? 'Logo'} className="h-7 w-7 object-contain" />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-200">
                                    <Waves size={16} className="text-white" />
                                </div>
                            )}
                            <button
                                onClick={toggleCollapse}
                                className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                aria-label="Agrandir la sidebar"
                            >
                                <PanelLeftOpen size={13} />
                            </button>
                        </div>
                    ) : (
                        /* Mode étendu — logo centré + nom + collapse */
                        <div className="flex flex-col items-center w-full py-4 gap-1.5 relative">
                            {/* Bouton collapse ancré en haut à droite */}
                            {!isMobile && (
                                <button
                                    onClick={toggleCollapse}
                                    className="absolute top-2 right-1 p-1.5 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    aria-label="Réduire la sidebar"
                                >
                                    <PanelLeftClose size={13} />
                                </button>
                            )}
                            {isMobile && (
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="absolute top-2 right-1 p-1.5 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    aria-label="Fermer le menu"
                                >
                                    <X size={15} />
                                </button>
                            )}
                            {/* Logo centré */}
                            {centerLogo ? (
                                <img
                                    src={centerLogo}
                                    alt={appName ?? 'Logo'}
                                    className="h-10 max-w-[140px] object-contain"
                                />
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
                                        <Waves size={20} className="text-white" />
                                    </div>
                                    <p className="text-gray-800 font-bold text-sm leading-tight">{appName ?? 'UltraClean'}</p>
                                    <p className="text-gray-400 text-[10px] leading-tight -mt-0.5">Gestion Lavage</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Navigation ── */}
                <nav
                    aria-label="Navigation principale"
                    className={clsx(
                        'flex-1 overflow-y-auto overflow-x-hidden py-3',
                        col ? 'px-1.5 space-y-1' : 'px-2.5 space-y-0.5'
                    )}
                >
                    {navItems.map((item, i) => {
                        if (item.type === 'divider') return (
                            <div key={i} className={clsx('border-t border-gray-100', col ? 'my-2 mx-1' : 'my-1.5')} />
                        );
                        if (item.type === 'group') return (
                            <NavGroup key={i} item={item} currentRoute={currentRoute} collapsed={col} />
                        );
                        return <NavItem key={i} item={item} currentRoute={currentRoute} collapsed={col} sharedProps={{ stockAlerts }} />;
                    })}
                </nav>

                {/* ── Footer : utilisateur ── */}
                <div className={clsx(
                    'flex-shrink-0 border-t border-gray-100',
                    col ? 'p-2' : 'p-3'
                )}>
                    <div className={clsx(
                        'flex items-center rounded-lg transition-colors hover:bg-gray-50 cursor-default',
                        col ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-2'
                    )}>
                        <div className={clsx(
                            'rounded-full flex items-center justify-center text-white font-bold flex-shrink-0',
                            col ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs',
                            ROLE_COLORS[auth.user?.role] ?? 'bg-gray-500'
                        )}>
                            {userInitials}
                        </div>
                        {!col && (
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-700 text-[12px] font-semibold leading-tight truncate">{auth.user?.name}</p>
                                <p className="text-gray-400 text-[10px] leading-tight truncate">{ROLE_LABELS[auth.user?.role]}</p>
                            </div>
                        )}
                        {!col && (
                            <button
                                onClick={logout}
                                className="flex-shrink-0 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                aria-label="Se déconnecter"
                                title="Déconnexion"
                            >
                                <LogOut size={14} />
                            </button>
                        )}
                    </div>
                    {/* Logout en mode réduit */}
                    {col && (
                        <div className="mt-1 flex justify-center">
                            <button
                                onClick={logout}
                                className="group relative p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                aria-label="Se déconnecter"
                            >
                                <LogOut size={13} />
                                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    Déconnexion
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* ── Skip-link (keyboard / screen-reader navigation) ── */}
            <a
                href="#app-main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
            >
                Passer au contenu principal
            </a>

            <Toaster position="top-right" />

            {/* ── Palette de commandes Ctrl+K ── */}
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

            {/* ── Barre de progression navigation Inertia ── */}
            {navigating && (
                <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-blue-200 dark:bg-blue-900 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
                </div>
            )}

            {/* ── Bannière hors-ligne ── */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-[90] bg-orange-500 text-white text-xs font-semibold text-center py-1.5 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Connexion perdue — mode hors-ligne
                </div>
            )}

            {/* ── Sidebar desktop ── */}
            <aside
                id="app-sidebar"
                className={clsx(
                    'hidden lg:flex flex-col flex-shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden border-r border-gray-200',
                    sidebarCollapsed ? 'w-[56px]' : 'w-[220px]'
                )}
            >
                <SidebarContent isMobile={false} />
            </aside>

            {/* ── Sidebar mobile overlay ── */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" role="button" tabIndex={-1} aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} onKeyDown={e => { if (e.key === 'Escape') setSidebarOpen(false); }} />
                    <aside className="relative z-50 flex w-[220px] flex-col shadow-2xl">
                        <SidebarContent isMobile={true} />
                    </aside>
                </div>
            )}

            {/* ── Contenu principal ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Topbar */}
                <header id="app-topbar" className="flex items-center gap-3 px-4 h-[60px] bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                    {/* Hamburger mobile */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{title ?? appName}</span>
                    </div>                    {/* Indicateur shift actif — cliquable → page caisse */}
                    {auth.activeShift && (
                        <Link
                            href={safeRoute('caissier.shift.index')}
                            className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 flex-shrink-0 hover:bg-green-100 hover:border-green-300 transition-colors"
                            title="Gérer le shift"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="hidden sm:inline">Shift ouvert</span>
                        </Link>
                    )}

                    {/* ── Ctrl+K palette trigger ── */}
                    <button
                        onClick={() => setPaletteOpen(true)}
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200"
                        title="Recherche globale (Ctrl+K)"
                    >
                        <Search size={13} />
                        <span>Rechercher…</span>
                        <kbd className="ml-1 font-mono text-[10px] bg-white border border-gray-300 rounded px-1">Ctrl K</kbd>
                    </button>
                    <button
                        onClick={() => setPaletteOpen(true)}
                        className="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="Recherche"
                    >
                        <Search size={18} />
                    </button>

                    {/* ── Cloche notifications ── */}
                    <div className="relative flex-shrink-0" ref={notifRef}>
                        <button
                            onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Notifications"
                            aria-expanded={notifOpen}
                            aria-haspopup="true"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown panel */}
                        {notifOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                                <span className="font-semibold text-sm text-gray-800 dark:text-white">Notifications</span>
                                <div className="flex items-center gap-3">
                                    {notifications.some(n => !n.read) && (
                                        <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                            Tout lire
                                        </button>
                                    )}
                                    {notifications.length > 0 && (
                                        <button onClick={clearAll} className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:underline">
                                            Effacer
                                        </button>
                                    )}
                                </div>
                            </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <Bell size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-sm text-gray-400 dark:text-gray-500">Aucune notification</p>
                                        </div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} className={clsx(
                                            'flex items-start gap-3 px-4 py-3 transition-colors',
                                            !n.read ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                        )}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{n.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{n.body}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
                                                    {new Date(n.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <button onClick={() => dismiss(n.id)} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 flex-shrink-0 mt-0.5">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Séparateur + User dropdown ── */}
                    <div className="w-px h-8 bg-gray-200 dark:bg-slate-600 mx-1 hidden md:block flex-shrink-0" />
                    <UserDropdown user={auth.user} onLogout={logout} />
                </header>{/* Page content */}                <main id="app-main" className="flex-1 overflow-y-auto p-4 lg:p-6 dark:bg-slate-900">
                    {children}
                </main>
            </div>
        </div>
    );
}

// Wrap with AppProvider so useApp() is available in all page components.
// AppProvider calls usePage() and MUST be inside the Inertia tree — hence it
// lives here rather than in app.jsx.
const AppLayoutWithProvider = (props) => (
    <AppProvider>
        <AppLayout {...props} />
    </AppProvider>
);

export { AppLayoutWithProvider as default };
