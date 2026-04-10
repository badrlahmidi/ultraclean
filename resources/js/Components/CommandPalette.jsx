import { useState, useEffect, useRef, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search, LayoutDashboard, Ticket, Users, Settings, BarChart3, CalendarDays, Package, FileText, Receipt, ShieldCheck, CreditCard, X } from 'lucide-react';
import clsx from 'clsx';
import { safeRoute } from '@/Layouts/navConfig';

// Commandes statiques par rôle
const STATIC_COMMANDS = {
    admin: [
        { id: 'dash-admin', label: 'Tableau de bord', group: 'Navigation', icon: LayoutDashboard, route: 'admin.dashboard' },
        { id: 'appointments', label: 'Rendez-vous', group: 'Navigation', icon: CalendarDays, route: 'admin.appointments.index' },
        { id: 'quotes', label: 'Devis', group: 'Navigation', icon: FileText, route: 'admin.quotes.index' },
        { id: 'invoices', label: 'Factures', group: 'Navigation', icon: Receipt, route: 'admin.invoices.index' },
        { id: 'reports', label: 'Rapports & exports', group: 'Navigation', icon: BarChart3, route: 'admin.reports.index' },
        { id: 'users', label: 'Utilisateurs', group: 'Configuration', icon: Users, route: 'admin.users.index' },
        { id: 'services', label: 'Services & tarifs', group: 'Configuration', icon: Settings, route: 'admin.services.index' },
        { id: 'stock', label: 'Stock produits', group: 'Navigation', icon: Package, route: 'admin.stock.index' },
        { id: 'clients-admin', label: 'Clients', group: 'Navigation', icon: Users, route: 'admin.clients.index' },
        { id: 'payments-admin', label: 'Historique paiements', group: 'Navigation', icon: CreditCard, route: 'admin.payments.index' },
        { id: 'activity-log', label: "Journal d'audit", group: 'Navigation', icon: ShieldCheck, route: 'admin.activity-log.index' },
        { id: 'caisse-access', label: 'Accès caisse', group: 'Accès rapide', icon: Ticket, route: 'caissier.dashboard' },
    ],
    caissier: [
        { id: 'dash-caissier', label: 'Tableau de bord', group: 'Navigation', icon: LayoutDashboard, route: 'caissier.dashboard' },
        { id: 'ticket-new', label: 'Nouveau ticket', group: 'Action rapide', icon: Ticket, route: 'caissier.tickets.create' },
        { id: 'tickets', label: 'Tickets du jour', group: 'Navigation', icon: Ticket, route: 'caissier.tickets.index' },
        { id: 'search-tickets', label: 'Recherche tickets', group: 'Navigation', icon: Search, route: 'caissier.tickets.search' },
        { id: 'clients', label: 'Clients', group: 'Navigation', icon: Users, route: 'caissier.clients.index' },
    ],
    laveur: [
        { id: 'queue', label: "File d'attente", group: 'Navigation', icon: LayoutDashboard, route: 'laveur.queue' },
        { id: 'stats', label: 'Mes stats', group: 'Navigation', icon: BarChart3, route: 'laveur.stats' },
    ],
};

export default function CommandPalette({ open, onClose }) {
    const { auth } = usePage().props;
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const [selected, setSelected] = useState(0);

    const commands = STATIC_COMMANDS[auth.user?.role] ?? [];

    const filtered = query.trim() === ''
        ? commands
        : commands.filter(c =>
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            c.group.toLowerCase().includes(query.toLowerCase())
        );

    // Reset when opened
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelected(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const execute = useCallback((cmd) => {
        onClose();
        router.visit(safeRoute(cmd.route));
    }, [onClose]);

    // Keyboard nav
    useEffect(() => {
        if (!open) return;
        function handleKey(e) {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter' && filtered[selected]) { execute(filtered[selected]); }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, filtered, selected, execute, onClose]);

    // Reset selection when query changes
    useEffect(() => { setSelected(0); }, [query]);

    if (!open) return null;

    // Group commands
    const groups = filtered.reduce((acc, cmd) => {
        if (!acc[cmd.group]) acc[cmd.group] = [];
        acc[cmd.group].push(cmd);
        return acc;
    }, {});

    let itemIndex = 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
            role="dialog" aria-modal="true" aria-label="Palette de commandes">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                    <Search size={18} className="text-gray-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Rechercher une page, une action…"
                        className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                        autoComplete="off"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[360px] overflow-y-auto py-2">
                    {filtered.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-10">Aucun résultat pour « {query} »</p>
                    )}

                    {Object.entries(groups).map(([groupName, items]) => (
                        <div key={groupName}>
                            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                {groupName}
                            </p>
                            {items.map(cmd => {
                                const idx = itemIndex++;
                                const Icon = cmd.icon;
                                return (
                                    <button
                                        key={cmd.id}
                                        onClick={() => execute(cmd)}
                                        onMouseEnter={() => setSelected(idx)}
                                        className={clsx(
                                            'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left',
                                            idx === selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                        )}
                                    >
                                        <div className={clsx(
                                            'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                                            idx === selected ? 'bg-blue-100' : 'bg-gray-100'
                                        )}>
                                            <Icon size={14} />
                                        </div>
                                        <span className="font-medium">{cmd.label}</span>
                                        {idx === selected && (
                                            <kbd className="ml-auto text-[10px] font-mono text-blue-400 bg-blue-100 rounded px-1.5 py-0.5">↵</kbd>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
                    <span><kbd className="font-mono bg-gray-100 px-1 rounded">↑↓</kbd> naviguer</span>
                    <span><kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> ouvrir</span>
                    <span><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> fermer</span>
                    <span className="ml-auto"><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+K</kbd> ouvrir</span>
                </div>
            </div>
        </div>
    );
}
