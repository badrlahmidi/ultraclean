import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import { Search, Ticket, Car, User, ArrowRight, Clock, CheckCircle2, Wrench, CreditCard, XCircle, Hash } from 'lucide-react';
import clsx from 'clsx';
import { formatMAD, formatDateTime } from '@/utils/format';
import { TICKET_STATUS } from '@/utils/constants';

// Icon map — kept local because icons are not part of the shared data model
const STATUS_ICONS = {
    pending: Clock, in_progress: Wrench, completed: CheckCircle2,
    paid: CreditCard, cancelled: XCircle,
};

function StatusChip({ status }) {
    const cfg = TICKET_STATUS[status] ?? TICKET_STATUS.pending;
    const Icon = STATUS_ICONS[status] ?? Clock;
    return (
        <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.cls)}>
            <Icon size={11} />{cfg.label}
        </span>
    );
}

function TicketRow({ ticket }) {
    return (
        <Link
            href={route('caissier.tickets.show', ticket.ulid)}
            className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group"
        >
            {/* Icône */}
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Ticket size={18} className="text-blue-600 dark:text-blue-400" />
            </div>

            {/* Info principale */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{ticket.ticket_number}</span>
                    <StatusChip status={ticket.status} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {ticket.vehicle_plate && (
                        <span className="flex items-center gap-1"><Car size={11} />{ticket.vehicle_plate}</span>
                    )}
                    {ticket.client?.name && (
                        <span className="flex items-center gap-1"><User size={11} />{ticket.client.name}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock size={11} />{formatDateTime(ticket.created_at)}</span>
                </div>
            </div>

            {/* Montant */}
            <div className="flex-shrink-0 text-right">
                <p className="font-bold text-sm text-gray-900 dark:text-white tabular-nums">{formatMAD(ticket.total_cents)}</p>
                {ticket.vehicle_type?.name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{ticket.vehicle_type.name}</p>
                )}
            </div>

            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
        </Link>
    );
}

export default function TicketSearch({ tickets, query: initialQuery }) {
    const [q, setQ] = useState(initialQuery ?? '');
    const [loading, setLoading] = useState(false);

    const doSearch = useCallback((val) => {
        setLoading(true);
        router.get(route('caissier.tickets.search'), { q: val }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onFinish: () => setLoading(false),
        });
    }, []);

    // Debounce
    const [timer, setTimer] = useState(null);
    function handleChange(e) {
        const val = e.target.value;
        setQ(val);
        clearTimeout(timer);
        if (val.length >= 2) {
            setTimer(setTimeout(() => doSearch(val), 400));
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (q.length >= 2) doSearch(q);
    }

    const hasQuery = q.length >= 2;

    return (
        <AppLayout title="Recherche tickets">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recherche tickets</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Recherchez par numéro de ticket, plaque, nom ou téléphone client.
                    </p>
                </div>

                {/* Barre de recherche */}
                <form onSubmit={handleSubmit} className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        autoFocus
                        type="search"
                        value={q}
                        onChange={handleChange}
                        placeholder="TK-2026…, AA-1234-A, Mohamed…"
                        className="w-full pl-11 pr-4 py-3.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    />
                    {loading && (
                        <div className="absolute inset-y-0 right-4 flex items-center">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </form>

                {/* Résultats */}
                {!hasQuery && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                            <Hash size={28} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Saisissez au moins 2 caractères</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Plaque · N° ticket · Client</p>
                    </div>
                )}

                {hasQuery && tickets.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                            <Search size={28} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun résultat pour « {q} »</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Essayez avec la plaque complète ou le numéro de ticket</p>
                    </div>
                )}

                {tickets.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {tickets.length} résultat{tickets.length !== 1 ? 's' : ''}
                        </p>
                        {tickets.map(t => <TicketRow key={t.id} ticket={t} />)}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
