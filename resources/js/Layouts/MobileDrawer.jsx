/**
 * MobileDrawer.jsx
 * ─────────────────────────────────────────────────────────────────
 * Drawer de navigation mobile (< 768px).
 *
 * Utilise HeadlessUI Dialog (v2) qui fournit nativement :
 *   ✅ Focus trap (le focus reste dans le drawer)
 *   ✅ Fermeture sur touche Escape
 *   ✅ Attributs ARIA (role="dialog", aria-modal, aria-label)
 *   ✅ Blocage du scroll body via overflow-hidden
 *
 * Props :
 *   isOpen     — boolean
 *   onClose    — () => void
 *   navItems   — array
 *   currentRoute — string
 *   sharedProps  — object
 *   appName    — string
 *   role       — 'admin' | 'caissier' | 'laveur'
 *   onLogout   — () => void
 * ─────────────────────────────────────────────────────────────────
 */
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { Waves, X, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { safeRoute, ROLE_DASHBOARD, ROLE_LABELS, ROLE_COLORS } from '@/Layouts/navConfig';
import NavItem from '@/Layouts/NavItem';
import NavGroup from '@/Layouts/NavGroup';

export default function MobileDrawer({
    isOpen,
    onClose,
    navItems,
    currentRoute,
    sharedProps = {},
    appName,
    role,
    user,
    onLogout,
}) {
    const dashboardHref = safeRoute(ROLE_DASHBOARD[role] ?? 'dashboard');

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="relative z-[50] md:hidden"
            aria-label="Menu de navigation"
        >            {/* ── Backdrop ── */}
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 data-[closed]:opacity-0"
            />

            {/* ── Drawer panel ── */}
            <div className="fixed inset-0 flex">
                <DialogPanel
                    className={clsx(
                        'relative flex w-72 max-w-[85vw] flex-col',
                        'bg-white shadow-2xl',
                        'transition-transform duration-300 ease-out',
                        isOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    {/* ── En-tête : logo + bouton fermer ── */}
                    <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 shrink-0">
                        <Link
                            href={dashboardHref}
                            onClick={onClose}
                            className={clsx(
                                'flex items-center gap-3 rounded-lg outline-none',
                                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'
                            )}
                        >
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200/60">
                                <Waves size={18} className="text-white" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-gray-900 font-bold text-sm leading-tight truncate">
                                    {appName ?? 'UltraClean'}
                                </p>
                                <p className="text-gray-400 text-[11px] leading-tight">Lavage auto</p>
                            </div>
                        </Link>

                        <button
                            onClick={onClose}
                            aria-label="Fermer le menu"
                            className={clsx(
                                'p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100',
                                'transition-colors outline-none',
                                'focus-visible:ring-2 focus-visible:ring-blue-500'
                            )}
                        >
                            <X size={20} aria-hidden="true" />
                        </button>
                    </div>

                    {/* ── Info utilisateur ── */}
                    {user && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
                            <div className={clsx(
                                'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0',
                                ROLE_COLORS[role] ?? 'bg-gray-500'
                            )}>
                                {user.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                                <p className="text-xs text-gray-400">{ROLE_LABELS[role]}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Navigation (scrollable) ── */}
                    <nav
                        aria-label="Menu principal"
                        className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden"
                    >
                        {navItems.map((item, i) => {
                            if (item.type === 'divider') {
                                return (
                                    <div
                                        key={i}
                                        role="separator"
                                        aria-hidden="true"
                                        className="my-1.5 border-t border-gray-100"
                                    />
                                );
                            }
                            if (item.type === 'group') {
                                return (
                                    <NavGroup
                                        key={i}
                                        item={item}
                                        currentRoute={currentRoute}
                                        collapsed={false}
                                    />
                                );
                            }
                            return (
                                <NavItem
                                    key={i}
                                    item={item}
                                    currentRoute={currentRoute}
                                    collapsed={false}
                                    sharedProps={sharedProps}
                                />
                            );
                        })}
                    </nav>

                    {/* ── Footer : déconnexion ── */}
                    <div className="border-t border-gray-100 px-3 py-3 shrink-0">
                        <button
                            onClick={() => { onLogout(); onClose(); }}
                            className={clsx(
                                'flex items-center gap-3 px-3 rounded-xl text-sm font-medium w-full',
                                'min-h-[44px] touch-manipulation transition-all duration-150 outline-none',
                                'text-gray-500 hover:bg-red-50 hover:text-red-600',
                                'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1'
                            )}
                        >
                            <LogOut size={17} aria-hidden="true" className="flex-shrink-0" />
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
