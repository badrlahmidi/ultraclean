import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Ticket, Users, Settings, LogOut,
    Menu, X, Wrench, ClipboardList,
    Car, BarChart3, ShieldCheck, Waves, Tag, ChevronDown, CarFront, CalendarDays,
    PanelLeftClose, PanelLeftOpen, UserCheck, History, Search, Percent, Bell, Package, Gift,
} from 'lucide-react';
import clsx from 'clsx';
import toast, { Toaster } from 'react-hot-toast';
import { useNotifications } from '@/hooks/useNotifications';

/* ─── Navigation par rôle ─── */
const ROLE_NAV = {
    admin: [
        { label: 'Tableau de bord', href: 'admin.dashboard', icon: LayoutDashboard },
        { label: 'Rapports & exports', href: 'admin.reports.index', icon: BarChart3 },
        { label: 'Performance laveurs', href: 'admin.employees.index', icon: UserCheck },
        { label: 'Promotions & codes', href: 'admin.promotions.index', icon: Percent },
        { label: 'Stock produits', href: 'admin.stock.index', icon: Package, alertKey: 'stockAlerts' },
        { label: 'Fidélité clients', href: 'admin.loyalty.index', icon: Gift },
        { type: 'divider' }, {
            type: 'group', label: 'Configuration', icon: Settings, key: 'config',
            activeRoutes: ['admin.services', 'admin.price-categories', 'admin.users', 'admin.settings', 'admin.vehicles'],
            children: [
                { label: 'Services & tarifs', href: 'admin.services.index', icon: Wrench },
                { label: 'Catégories de prix', href: 'admin.price-categories.index', icon: Tag },
                { label: 'Marques & Modèles', href: 'admin.vehicles.index', icon: CarFront },
                { label: 'Utilisateurs', href: 'admin.users.index', icon: Users },
                { label: 'Paramètres', href: 'admin.settings.index', icon: Settings },
            ],
        },
        { type: 'divider' },
        { label: 'Accès caisse', href: 'caissier.dashboard', icon: Ticket },
        { label: "File d'attente", href: 'laveur.queue', icon: Car },
    ], caissier: [
        { label: 'Tableau de bord', href: 'caissier.dashboard', icon: LayoutDashboard },
        { type: 'divider' },
        { label: 'Nouveau ticket', href: 'caissier.tickets.create', icon: Ticket, accent: true },
        { type: 'divider' },
        { label: 'Tickets du jour', href: 'caissier.tickets.index', icon: ClipboardList },
        { label: 'Recherche tickets', href: 'caissier.tickets.search', icon: Search },
        { label: 'Planning', href: 'caissier.planning', icon: CalendarDays },
        { label: 'Clients', href: 'caissier.clients.index', icon: Users },
        { label: 'Shift / Caisse', href: 'caissier.shift.index', icon: ShieldCheck },
        { label: 'Historique shifts', href: 'caissier.shift.history', icon: History },
        { label: 'Promotions', href: 'admin.promotions.index', icon: Percent },
        { type: 'divider' },
        { label: "File d'attente", href: 'laveur.queue', icon: Car },
    ], laveur: [
        { label: "File d'attente", href: 'laveur.queue', icon: Car },
        { label: 'Mes stats', href: 'laveur.stats', icon: BarChart3 },
    ],
};

const ROLE_LABELS = { admin: 'Admin', caissier: 'Caissier', laveur: 'Laveur' };
const ROLE_COLORS = { admin: 'bg-purple-600', caissier: 'bg-blue-600', laveur: 'bg-green-600' };

/* ─── NavItem simple ─── */
function NavItem({ item, currentRoute, collapsed, sharedProps = {} }) {
    const baseRoute = item.href.replace('.index', '').replace('.dashboard', '').replace('.create', '');
    const isActive = currentRoute.startsWith(baseRoute);
    const alertCount = item.alertKey ? (sharedProps[item.alertKey] ?? 0) : 0;
    return (
        <Link
            href={route(item.href)}
            title={collapsed ? item.label : undefined}
            className={clsx(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-all min-h-[44px] touch-manipulation group relative',
                collapsed ? 'px-0 justify-center w-10 mx-auto' : 'px-3',
                item.accent && !isActive
                    ? 'bg-blue-500/80 text-white hover:bg-blue-500'
                    : isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}
        >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {/* Alert badge */}
            {alertCount > 0 && !collapsed && (
                <span className="ml-auto flex-shrink-0 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {alertCount}
                </span>
            )}
            {alertCount > 0 && collapsed && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full border border-slate-700" />
            )}
            {/* Tooltip mode réduit */}
            {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-slate-700 text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                    {item.label}
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

    useEffect(() => { if (isChildActive && !open) setOpen(true); }, [currentRoute]);

    const toggle = () => {
        const next = !open; setOpen(next);
        try { localStorage.setItem(storageKey, String(next)); } catch { }
    };

    /* Mode icônes seules : bouton + sous-menu flyout au hover */
    if (collapsed) {
        return (
            <div className="relative group">
                <button
                    title={item.label}
                    className={clsx(
                        'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all touch-manipulation',
                        isChildActive ? 'text-white bg-white/10' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                >
                    <item.icon size={18} />
                </button>
                {/* Flyout submenu */}
                <div className="absolute left-full top-0 ml-2 bg-slate-700 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150 z-50 py-2 min-w-[180px]">
                    <p className="px-3 py-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">{item.label}</p>
                    {item.children.map((child, i) => (
                        <Link key={i} href={route(child.href)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                            <child.icon size={15} />
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all min-h-[44px] touch-manipulation',
                isChildActive ? 'text-white bg-white/10' : 'text-white/70 hover:bg-white/10 hover:text-white'
            )}>
                <item.icon size={18} className="flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown size={14} className={clsx('transition-transform duration-200 flex-shrink-0', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="ml-4 pl-3 border-l border-white/10 mt-0.5 space-y-0.5">
                    {item.children.map((child, i) => <NavItem key={i} item={child} currentRoute={currentRoute} collapsed={false} />)}
                </div>
            )}
        </div>
    );
}

export default function AppLayout({ children, title }) {
    const { auth, flash, appName, stockAlerts } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    const { notifications, unreadCount, markAllRead, dismiss, clearAll } = useNotifications();

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
            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { }
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
        const col = sidebarCollapsed && !isMobile;
        return (
            <div className="flex flex-col h-full">
                {/* Logo */}
                <div className={clsx(
                    'flex items-center border-b border-white/10 transition-all duration-300',
                    col ? 'px-0 py-5 justify-center' : 'gap-3 px-4 py-5'
                )}>
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <Waves size={20} className="text-white" />
                    </div>
                    {!col && (
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">{appName ?? 'UltraClean'}</p>
                            <p className="text-white/50 text-xs">Lavage</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={clsx(
                    'flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden',
                    col ? 'px-1' : 'px-3'
                )}>                    {navItems.map((item, i) => {
                    if (item.type === 'divider') return (
                        <div key={i} className={clsx('my-2 border-t border-white/10', col && 'mx-2')} />
                    );
                    if (item.type === 'group') return (
                        <NavGroup key={i} item={item} currentRoute={currentRoute} collapsed={col} />
                    );
                    return <NavItem key={i} item={item} currentRoute={currentRoute} collapsed={col} sharedProps={{ stockAlerts }} />;
                })}
                </nav>

                {/* Utilisateur + Déconnexion */}
                <div className="border-t border-white/10 px-3 py-4">
                    {!col && (
                        <div className="flex items-center gap-3 px-2 mb-3">
                            <div className={clsx(
                                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                                ROLE_COLORS[auth.user?.role] ?? 'bg-gray-600'
                            )}>
                                {auth.user?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-sm font-medium truncate">{auth.user?.name}</p>
                                <p className="text-white/50 text-xs">{ROLE_LABELS[auth.user?.role]}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        title={col ? 'Déconnexion' : undefined}
                        className={clsx(
                            'flex items-center min-h-[44px] text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all touch-manipulation',
                            col ? 'justify-center w-10 mx-auto px-0' : 'gap-2 w-full px-3 py-2.5'
                        )}
                    >
                        <LogOut size={16} />
                        {!col && 'Déconnexion'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-slate-900 overflow-hidden">
            <Toaster position="top-right" />

            {/* ── Sidebar desktop ── */}
            <aside
                id="app-sidebar"
                className={clsx(
                    'hidden lg:flex flex-col bg-slate-800 flex-shrink-0 transition-all duration-300 overflow-hidden',
                    sidebarCollapsed ? 'w-[60px]' : 'w-60'
                )}
            >
                <SidebarContent isMobile={false} />
            </aside>

            {/* ── Sidebar mobile overlay ── */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative z-50 flex w-60 flex-col bg-slate-800">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 p-1 text-white/60 hover:text-white"
                            aria-label="Fermer le menu"
                        >
                            <X size={20} />
                        </button>
                        <SidebarContent isMobile={true} />
                    </aside>
                </div>
            )}

            {/* ── Contenu principal ── */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Topbar */}                <header id="app-topbar" className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
                    {/* Hamburger mobile */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 touch-manipulation"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Bouton collapse desktop */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden lg:flex p-2 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label={sidebarCollapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
                        title={sidebarCollapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
                    >
                        {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{title ?? appName}</span>
                    </div>                    {/* Indicateur shift actif */}
                    {auth.activeShift && (
                        <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="hidden sm:inline">Shift ouvert</span>
                        </div>
                    )}

                    {/* ── Cloche notifications ── */}
                    <div className="relative flex-shrink-0" ref={notifRef}>
                        <button
                            onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Notifications"
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
                </header>{/* Page content */}                <main id="app-main" className="flex-1 overflow-y-auto p-4 lg:p-6 dark:bg-slate-900">
                    {children}
                </main>
            </div>
        </div>
    );
}
