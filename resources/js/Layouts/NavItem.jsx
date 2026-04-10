/**
 * NavItem.jsx
 * ─────────────────────────────────────────────────────────────────
 * Élément de navigation individuel.
 * Utilisé par Sidebar (desktop/tablette) et MobileDrawer (mobile).
 *
 * Props :
 *   item         — { label, href, icon, accent?, alertKey? }
 *   currentRoute — string  (route().current())
 *   collapsed    — boolean (mode icône seule)
 *   sharedProps  — object  (ex: { stockAlerts: 3 })
 * ─────────────────────────────────────────────────────────────────
 */
import { useId } from 'react';
import { Link } from '@inertiajs/react';
import clsx from 'clsx';
import { safeRoute, isRouteActive } from '@/Layouts/navConfig';

export default function NavItem({ item, currentRoute, collapsed = false, sharedProps = {} }) {
    const tooltipId = useId();
    const isActive = isRouteActive(currentRoute, item.href);
    const alertCount = item.alertKey ? (sharedProps[item.alertKey] ?? 0) : 0;

    return (
        <Link
            href={safeRoute(item.href)}
            aria-current={isActive ? 'page' : undefined}
            aria-describedby={collapsed ? tooltipId : undefined}
            className={clsx(
                // Base
                'relative flex items-center gap-3 rounded-xl text-sm font-medium',
                'min-h-[40px] touch-manipulation group outline-none',
                'transition-all duration-150',
                // Focus visible ring
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                // Collapsed : icône centrée
                collapsed ? 'px-0 justify-center w-10 mx-auto' : 'px-3',
                // Variantes de couleur
                item.accent && !isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200/60'
                    : isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
        >
            {/* ── Icône ── */}
            <span className={clsx(
                'flex items-center justify-center flex-shrink-0 transition-colors',
                // CTA accent en mode collapsed : anneau bleu pour rester visible
                collapsed && item.accent && !isActive
                    ? 'w-9 h-9 rounded-xl bg-blue-600 text-white ring-2 ring-blue-300/60 shadow-md shadow-blue-200/50'
                    : ''
            )}>
                <item.icon size={17} aria-hidden="true" />
            </span>

            {/* ── Label (masqué en mode collapsed) ── */}
            {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
            )}

            {/* ── Badge alerte (mode expanded) ── */}
            {alertCount > 0 && !collapsed && (
                <span
                    aria-label={`${alertCount} alerte${alertCount > 1 ? 's' : ''}`}
                    className="ml-auto flex-shrink-0 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                >
                    {alertCount > 9 ? '9+' : alertCount}
                </span>
            )}

            {/* ── Point alerte (mode collapsed) ── */}
            {alertCount > 0 && collapsed && (
                <span
                    aria-label={`${alertCount} alerte${alertCount > 1 ? 's' : ''}`}
                    className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"
                />
            )}

            {/* ── Tooltip (mode collapsed uniquement) ── */}
            {collapsed && (
                <span
                    id={tooltipId}
                    role="tooltip"
                    className={clsx(
                        'pointer-events-none absolute left-full ml-3 z-[60]',
                        'px-2.5 py-1.5 text-xs font-medium leading-tight',
                        'bg-slate-800 text-white rounded-lg shadow-lg whitespace-nowrap',
                        'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                        'transition-opacity duration-150',
                        // Micro-décalage → slide fluide
                        'translate-x-1 group-hover:translate-x-0 group-focus-visible:translate-x-0',
                    )}
                >
                    {item.label}
                    {alertCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-orange-500 rounded-full text-[9px] font-bold">
                            {alertCount > 9 ? '9+' : alertCount}
                        </span>
                    )}
                    {/* Flèche gauche du tooltip */}
                    <span
                        aria-hidden="true"
                        className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"
                    />
                </span>
            )}
        </Link>
    );
}
