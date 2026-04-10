/**
 * NavGroup.jsx
 * ─────────────────────────────────────────────────────────────────
 * Groupe de navigation collapsible (accordéon en mode expanded,
 * flyout en mode collapsed).
 *
 * Props :
 *   item         — { type:'group', label, icon, key, activeRoutes, children }
 *   currentRoute — string
 *   collapsed    — boolean
 * ─────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { safeRoute, isRouteActive } from '@/Layouts/navConfig';
import NavItem from '@/Layouts/NavItem';

export default function NavGroup({ item, currentRoute, collapsed = false }) {
    const storageKey = `nav-group-${item.key}`;
    const flyoutLabelId = useId();

    /* ── Détection si un enfant est actif ── */
    const isChildActive = useMemo(
        () => item.activeRoutes?.some(r => currentRoute.startsWith(r)) ?? false,
        [currentRoute, item.activeRoutes]
    );

    /* ── État d'ouverture, persisté en localStorage ── */
    const [open, setOpen] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved !== null ? saved === 'true' : isChildActive;
        } catch {
            return isChildActive;
        }
    });

    /* ── Auto-ouverture quand un enfant devient actif ── */
    useEffect(() => {
        if (isChildActive) {
            setOpen(true);
        }
    }, [isChildActive]);

    const toggle = useCallback(() => {
        setOpen(prev => {
            const next = !prev;
            try { localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
            return next;
        });
    }, [storageKey]);

    /* ══════════════════════════════════════════════════════════════
     * MODE COLLAPSED : flyout au survol
     * Uniquement utilisé sur desktop lg+ (la sidebar tablet est
     * toujours en icon-only mais n'a pas de toggle, donc ce mode
     * ne se produit qu'avec interaction souris = desktop).
     * ══════════════════════════════════════════════════════════════ */
    if (collapsed) {
        return (
            <div className="relative group/flyout">
                {/* Bouton icône */}
                <button
                    aria-haspopup="true"
                    aria-label={item.label}
                    className={clsx(
                        'flex items-center justify-center w-10 h-10 mx-auto rounded-xl',
                        'transition-all touch-manipulation outline-none',
                        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                        isChildActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                >
                    <item.icon size={17} aria-hidden="true" />
                </button>

                {/* ── Flyout panel ── */}
                <div
                    role="menu"
                    aria-labelledby={flyoutLabelId}
                    className={clsx(
                        'absolute left-full top-0 ml-3 min-w-[210px] py-2 z-[60]',
                        'bg-white border border-gray-200 rounded-xl shadow-xl',
                        // Transitions : opacity + micro-slide
                        'opacity-0 pointer-events-none',
                        'group-hover/flyout:opacity-100 group-hover/flyout:pointer-events-auto',
                        'translate-x-1 group-hover/flyout:translate-x-0',
                        'transition-all duration-150 ease-out',
                    )}
                >
                    {/* Titre du groupe */}
                    <p
                        id={flyoutLabelId}
                        className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest"
                    >
                        {item.label}
                    </p>

                    {/* Liens enfants */}
                    {item.children.map((child, i) => (
                        <Link
                            key={i}
                            href={safeRoute(child.href)}
                            role="menuitem"
                            aria-current={isRouteActive(currentRoute, child.href) ? 'page' : undefined}
                            className={clsx(
                                'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors outline-none',
                                'focus-visible:bg-blue-50 focus-visible:text-blue-700',
                                isRouteActive(currentRoute, child.href)
                                    ? 'text-blue-700 bg-blue-50 font-medium'
                                    : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                            )}
                        >
                            <child.icon size={15} aria-hidden="true" className="flex-shrink-0" />
                            <span className="truncate">{child.label}</span>
                        </Link>
                    ))}

                    {/* Flèche gauche du flyout */}
                    <span
                        aria-hidden="true"
                        className="absolute right-full top-4 border-8 border-transparent border-r-gray-200"
                    />
                    <span
                        aria-hidden="true"
                        className="absolute right-full top-4 border-[7px] border-transparent border-r-white mt-px"
                    />
                </div>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════
     * MODE EXPANDED : accordéon animé
     * ══════════════════════════════════════════════════════════════ */
    return (
        <div>
            <button
                onClick={toggle}
                aria-expanded={open}
                aria-controls={`nav-group-panel-${item.key}`}
                className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium w-full',
                    'min-h-[40px] touch-manipulation transition-all duration-150 outline-none',
                    'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                    isChildActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
            >
                <item.icon size={17} aria-hidden="true" className="flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={clsx(
                        'flex-shrink-0 transition-transform duration-200 ease-in-out',
                        open ? 'rotate-180' : 'rotate-0'
                    )}
                />
            </button>

            {/* ── Panneau enfants animé (max-height transition) ── */}
            <div
                id={`nav-group-panel-${item.key}`}
                className={clsx(
                    'overflow-hidden transition-all duration-200 ease-in-out',
                    open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                <div className="ml-4 pl-3 border-l-2 border-gray-100 mt-0.5 pb-1 space-y-0.5">
                    {item.children.map((child, i) => (
                        <NavItem
                            key={i}
                            item={child}
                            currentRoute={currentRoute}
                            collapsed={false}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
