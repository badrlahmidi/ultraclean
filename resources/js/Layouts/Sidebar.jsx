/**
 * Sidebar.jsx
 * ─────────────────────────────────────────────────────────────────
 * Sidebar de navigation — visible uniquement sur tablette (md+)
 * et desktop (lg+).
 *
 * Comportement responsive :
 *   • Mobile (< 768px)    → masquée, navigation via MobileDrawer
 *   • Tablette (768-1023) → toujours en mode icônes seules (w-[60px])
 *                           sans bouton de toggle
 *   • Desktop (≥ 1024px)  → collapsed/expanded selon préférence
 *                           utilisateur (localStorage)
 *
 * Props :
 *   collapsed         — boolean (préférence desktop depuis localStorage)
 *   onToggleCollapse  — () => void
 *   navItems          — array (items de navigation pour le rôle courant)
 *   currentRoute      — string
 *   sharedProps       — object (ex: { stockAlerts: 3 })
 *   appName           — string
 *   role              — 'admin' | 'caissier' | 'laveur'
 *   onLogout          — () => void
 * ─────────────────────────────────────────────────────────────────
 */
import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { Waves, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { safeRoute, ROLE_DASHBOARD } from '@/Layouts/navConfig';
import NavItem from '@/Layouts/NavItem';
import NavGroup from '@/Layouts/NavGroup';

export default function Sidebar({
    collapsed,
    onToggleCollapse,
    navItems,
    currentRoute,
    sharedProps = {},
    appName,
    role,
    onLogout,
}) {
    /* ── Détection du breakpoint lg (1024px) en JS ─────────────────
     * Permet de forcer le mode icônes sur tablette (md–lg) sans
     * avoir besoin de props supplémentaires depuis le parent.
     * ─────────────────────────────────────────────────────────────── */
    const [isLg, setIsLg] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
    );

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        setIsLg(mq.matches);
        const handler = (e) => setIsLg(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    /* ── Mode effectif ──────────────────────────────────────────────
     * • Sur tablette (!isLg) : toujours icon-only
     * • Sur desktop (isLg)   : suit la préférence `collapsed`
     * ─────────────────────────────────────────────────────────────── */
    const isCollapsed = !isLg || collapsed;

    /* ── Route du dashboard pour le lien logo ───────────────────── */
    const dashboardHref = safeRoute(ROLE_DASHBOARD[role] ?? 'dashboard');

    return (
        <aside
            aria-label="Navigation principale"
            className={clsx(
                // Masquée sur mobile, visible à partir de md:
                'hidden md:flex flex-col',
                'bg-white border-r border-gray-200 flex-shrink-0 h-full',
                // Transition fluide sur la largeur uniquement
                'transition-[width] duration-300 ease-in-out overflow-hidden',
                isCollapsed ? 'w-[60px]' : 'w-56'
            )}
        >
            {/* ════════════════════════════════════════
             * 1. LOGO / BRANDING (cliquable → dashboard)
             * ════════════════════════════════════════ */}
            <div className={clsx(
                'flex items-center border-b border-gray-100 shrink-0 h-14',
                isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
            )}>
                <Link
                    href={dashboardHref}
                    title={`${appName ?? 'UltraClean'} — Accueil`}
                    className={clsx(
                        'flex items-center gap-3 rounded-lg outline-none',
                        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'
                    )}
                >
                    {/* Icône logo */}
                    <div className={clsx(
                        'w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0',
                        'hover:bg-blue-700 transition-colors',
                        'shadow-sm shadow-blue-200/60'
                    )}>
                        <Waves size={18} className="text-white" aria-hidden="true" />
                    </div>

                    {/* Nom de l'app (masqué en mode collapsed) */}
                    {!isCollapsed && (
                        <div className="min-w-0">
                            <p className="text-gray-900 font-bold text-sm leading-tight truncate">
                                {appName ?? 'UltraClean'}
                            </p>
                            <p className="text-gray-400 text-[11px] leading-tight">Lavage auto</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* ════════════════════════════════════════
             * 2. NAVIGATION (zone scrollable)
             * ════════════════════════════════════════ */}
            <nav
                aria-label="Menu principal"
                className={clsx(
                    'flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden',
                    isCollapsed ? 'px-1' : 'px-2.5'
                )}
            >
                {navItems.map((item, i) => {
                    // Séparateur
                    if (item.type === 'divider') {
                        return (
                            <div
                                key={i}
                                role="separator"
                                aria-hidden="true"
                                className={clsx(
                                    'my-1.5 border-t border-gray-100',
                                    isCollapsed && 'mx-2'
                                )}
                            />
                        );
                    }

                    // Groupe avec sous-menu
                    if (item.type === 'group') {
                        return (
                            <NavGroup
                                key={i}
                                item={item}
                                currentRoute={currentRoute}
                                collapsed={isCollapsed}
                            />
                        );
                    }

                    // Item simple
                    return (
                        <NavItem
                            key={i}
                            item={item}
                            currentRoute={currentRoute}
                            collapsed={isCollapsed}
                            sharedProps={sharedProps}
                        />
                    );
                })}
            </nav>

            {/* ════════════════════════════════════════
             * 3. FOOTER : Collapse toggle + Logout
             * ════════════════════════════════════════ */}
            <div className={clsx(
                'border-t border-gray-100 py-2 shrink-0 space-y-0.5',
                isCollapsed ? 'px-1' : 'px-2.5'
            )}>

                {/* ── Bouton collapse (desktop lg+ uniquement) ── */}
                {isLg && (
                    <button
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
                        title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
                        className={clsx(
                            'flex items-center gap-3 rounded-xl text-sm w-full',
                            'min-h-[40px] touch-manipulation transition-all duration-150 outline-none',
                            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                            'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                            isCollapsed ? 'px-0 justify-center' : 'px-3'
                        )}
                    >
                        {collapsed
                            ? <PanelLeftOpen size={17} aria-hidden="true" className="flex-shrink-0" />
                            : <PanelLeftClose size={17} aria-hidden="true" className="flex-shrink-0" />
                        }
                        {!isCollapsed && (
                            <span className="flex-1 text-left text-xs font-medium">Réduire</span>
                        )}
                    </button>
                )}

                {/* ── Bouton déconnexion ── */}
                <button
                    onClick={onLogout}
                    aria-label="Se déconnecter"
                    title="Déconnexion"
                    className={clsx(
                        'relative flex items-center gap-3 rounded-xl text-sm w-full group/logout',
                        'min-h-[40px] touch-manipulation transition-all duration-150 outline-none',
                        'text-gray-400 hover:bg-red-50 hover:text-red-600',
                        'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1',
                        isCollapsed ? 'px-0 justify-center' : 'px-3'
                    )}
                >
                    <LogOut size={17} aria-hidden="true" className="flex-shrink-0" />

                    {!isCollapsed && (
                        <span className="flex-1 text-left text-xs font-medium">Déconnexion</span>
                    )}

                    {/* Tooltip déconnexion (mode collapsed) */}
                    {isCollapsed && (
                        <span
                            role="tooltip"
                            className={clsx(
                                'pointer-events-none absolute left-full ml-3 z-[60]',
                                'px-2.5 py-1.5 text-xs font-medium leading-tight',
                                'bg-slate-800 text-white rounded-lg shadow-lg whitespace-nowrap',
                                'opacity-0 group-hover/logout:opacity-100',
                                'translate-x-1 group-hover/logout:translate-x-0',
                                'transition-all duration-150'
                            )}
                        >
                            Déconnexion
                            <span
                                aria-hidden="true"
                                className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"
                            />
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}
