import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useCallback } from 'react';
import {
    Clock, Car, User, AlertTriangle, CheckCircle2,
    PlayCircle, Hourglass, RefreshCw, ChevronRight,
    Timer, Loader2, X
} from 'lucide-react';
import clsx from 'clsx';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const fmt = (cents) =>
    cents != null
        ? (cents / 100).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 })
        : '—';

const fmtTime = (isoStr) =>
    isoStr
        ? new Date(isoStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : null;

const fmtDur = (min) =>
    !min ? null : min >= 60
        ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
        : `${min} min`;

/* ─── Configuration des colonnes ─────────────────────────────────────── */

const COLUMNS = [
    {
        key: 'pending',
        label: 'En attente',
        icon: Hourglass,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        headerBg: 'bg-amber-100',
        dot: 'bg-amber-400',
        nextStatus: 'in_progress',
        nextLabel: 'Démarrer',
        nextColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
        key: 'in_progress',
        label: 'En cours',
        icon: PlayCircle,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        headerBg: 'bg-blue-100',
        dot: 'bg-blue-500',
        nextStatus: 'completed',
        nextLabel: 'Terminer',
        nextColor: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
        key: 'done',
        label: 'Terminé',
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        headerBg: 'bg-green-100',
        dot: 'bg-green-500',
        nextStatus: null,
        nextLabel: null,
    },
    {
        key: 'overdue',
        label: 'En retard',
        icon: AlertTriangle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        headerBg: 'bg-red-100',
        dot: 'bg-red-500',
        nextStatus: null, // actions dynamiques selon statut réel du ticket
        nextLabel: null,
    },
];

/* ─── BrandLogo ───────────────────────────────────────────────────────── */

function BrandLogo({ url, name }) {
    const [err, setErr] = useState(false);
    if (!url || err) return <Car size={14} className="text-gray-300" />;
    return (
        <img src={url} alt={name ?? ''} className="w-full h-full object-contain"
            onError={() => setErr(true)} />
    );
}

/* ─── TicketCard ──────────────────────────────────────────────────────── */

function TicketCard({ ticket, colKey, onStatusChange }) {
    const [loading, setLoading] = useState(false);

    const isOverdue = colKey === 'overdue';
    const realStatus = ticket.status; // 'pending' | 'in_progress' | 'completed' | 'paid'

    /* Actions disponibles pour la colonne "En retard"
       selon le statut réel du ticket                                       */
    let overdueNextStatus = null;
    let overdueNextLabel = null;
    if (isOverdue) {
        if (realStatus === 'pending') { overdueNextStatus = 'in_progress'; overdueNextLabel = 'Démarrer'; }
        else if (realStatus === 'in_progress') { overdueNextStatus = 'completed'; overdueNextLabel = 'Terminer'; }
    }

    const col = COLUMNS.find(c => c.key === colKey);
    const nextStatus = isOverdue ? overdueNextStatus : col?.nextStatus;
    const nextLabel = isOverdue ? overdueNextLabel : col?.nextLabel;

    function advance() {
        if (!nextStatus) return;
        setLoading(true);
        router.patch(
            route('caissier.tickets.status', ticket.ulid),
            { status: nextStatus },
            {
                preserveScroll: true,
                onFinish: () => setLoading(false),
                onSuccess: () => onStatusChange?.(),
            }
        );
    }

    /* Total du ticket : somme des lignes */
    const total = ticket.services?.reduce(
        (s, ts) => s + (ts.unit_price_cents ?? 0) * (ts.quantity ?? 1), 0
    ) ?? ticket.total_cents ?? 0;

    const dueAt = ticket.due_at ? new Date(ticket.due_at) : null;
    const isLate = dueAt && dueAt < new Date() && !['completed', 'paid', 'cancelled'].includes(realStatus);
    const minutesLate = dueAt && isLate
        ? Math.round((Date.now() - dueAt.getTime()) / 60000)
        : null;

    const washerInitials = ticket.assigned_to
        ? ticket.assigned_to.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
        : null;

    return (
        <div className={clsx(
            'rounded-2xl border p-3 space-y-2.5 transition-shadow hover:shadow-md',
            isOverdue ? 'border-red-200 bg-red-50/60' : `${col?.border} bg-white`
        )}>
            {/* Header : numéro + marque */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <BrandLogo url={ticket.vehicle_brand?.logo_url} name={ticket.vehicle_brand?.name} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 leading-tight">
                            #{ticket.ticket_number}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                            {ticket.vehicle_brand
                                ? `${ticket.vehicle_brand.name}${ticket.vehicle_model ? ` ${ticket.vehicle_model.name}` : ''}`
                                : ticket.vehicle_plate ?? '—'
                            }
                        </p>
                    </div>
                </div>

                {/* Badge opérateur */}
                {washerInitials && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold
                                    flex items-center justify-center shrink-0"
                        title={ticket.assigned_to?.name}>
                        {washerInitials}
                    </div>
                )}
            </div>

            {/* Plaque + client */}
            <div className="flex items-center justify-between gap-2">
                {ticket.vehicle_plate && (
                    <span className="text-[11px] font-mono font-semibold text-gray-600
                                     bg-gray-100 px-2 py-0.5 rounded-md tracking-wider">
                        {ticket.vehicle_plate}
                    </span>
                )}
                {ticket.client && (
                    <div className="flex items-center gap-1 min-w-0">
                        <User size={11} className="text-gray-400 shrink-0" />
                        <span className="text-[11px] text-gray-500 truncate">{ticket.client.name}</span>
                    </div>
                )}
            </div>

            {/* Services */}
            {ticket.services && ticket.services.length > 0 && (
                <div className="space-y-0.5">
                    {ticket.services.slice(0, 3).map((ts, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 truncate">
                                {ts.service_name ?? ts.service?.name}
                            </span>
                            <span className="text-[10px] font-medium text-gray-600 shrink-0 ml-1">
                                {fmt(ts.unit_price_cents * (ts.quantity ?? 1))}
                            </span>
                        </div>
                    ))}
                    {ticket.services.length > 3 && (
                        <p className="text-[10px] text-gray-400">+{ticket.services.length - 3} autres</p>
                    )}
                </div>
            )}

            {/* Footer : durée + retard + total */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    {/* Durée / heure due */}
                    {ticket.estimated_duration && (
                        <div className={clsx('flex items-center gap-1 text-[10px]',
                            isLate ? 'text-red-500 font-semibold' : 'text-gray-400')}>
                            <Timer size={10} />
                            {isLate && minutesLate
                                ? `+${minutesLate} min`
                                : fmtDur(ticket.estimated_duration)
                            }
                        </div>
                    )}
                    {dueAt && !isLate && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock size={10} />
                            {fmtTime(ticket.due_at)}
                        </div>
                    )}
                </div>
                <span className="text-xs font-bold text-gray-800">{fmt(total)}</span>
            </div>

            {/* Bouton action */}
            {nextStatus && (
                <button
                    onClick={advance}
                    disabled={loading}
                    className={clsx(
                        'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                        loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : (
                            isOverdue
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : col?.nextColor
                        )
                    )}>
                    {loading
                        ? <Loader2 size={12} className="animate-spin" />
                        : <><ChevronRight size={12} />{nextLabel}</>
                    }
                </button>
            )}
        </div>
    );
}

/* ─── Column ──────────────────────────────────────────────────────────── */

function KanbanColumn({ col, tickets, onStatusChange }) {
    const Icon = col.icon;
    return (
        <div className="flex flex-col min-h-0 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">

            {/* Header */}
            <div className={clsx('flex items-center gap-2 px-4 py-3 border-b border-gray-200', col.headerBg)}>
                <span className={clsx('w-2 h-2 rounded-full', col.dot)} />
                <Icon size={14} className={col.color} />
                <span className={clsx('text-sm font-semibold', col.color)}>{col.label}</span>
                <span className="ml-auto text-xs text-gray-400 font-medium bg-white/70 px-2 py-0.5 rounded-full">
                    {tickets.length}
                </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
                {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                        <Icon size={24} />
                        <p className="text-xs mt-2">Aucun ticket</p>
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <TicketCard
                            key={`${col.key}-${ticket.id}`}
                            ticket={ticket}
                            colKey={col.key}
                            onStatusChange={onStatusChange}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

/* ─── Page principale ─────────────────────────────────────────────────── */

export default function Planning({ columns, washers, now }) {
    const [filterWasher, setFilterWasher] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    function refresh() {
        setRefreshing(true);
        router.reload({ onFinish: () => setRefreshing(false) });
    }

    /* Filtre par laveur */
    function filterTickets(tickets) {
        if (!filterWasher) return tickets;
        return tickets.filter(t => t.assigned_to?.id === filterWasher);
    }

    const nowDate = new Date(now);
    const dateLabel = nowDate.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

    /* Compteurs globaux */
    const totalPending = columns.pending?.length ?? 0;
    const totalInProgress = columns.in_progress?.length ?? 0;
    const totalOverdue = columns.overdue?.length ?? 0;

    return (
        <AppLayout>
            <Head title="Planning" />

            <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

                {/* ── Barre du haut ── */}
                <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 flex-wrap">

                    <div>
                        <h1 className="text-base font-bold text-gray-800 leading-tight">Planning du jour</h1>
                        <p className="text-xs text-gray-400 capitalize">{dateLabel}</p>
                    </div>

                    {/* Badges résumé */}
                    <div className="flex items-center gap-2 ml-2">
                        {totalOverdue > 0 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                <AlertTriangle size={11} />
                                {totalOverdue} en retard
                            </span>
                        )}
                        {totalInProgress > 0 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                <PlayCircle size={11} />
                                {totalInProgress} en cours
                            </span>
                        )}
                        {totalPending > 0 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                <Hourglass size={11} />
                                {totalPending} en attente
                            </span>
                        )}
                    </div>

                    <div className="flex-1" />

                    {/* Filtre laveur */}
                    {washers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setFilterWasher(null)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                                    filterWasher === null
                                        ? 'bg-gray-800 text-white border-gray-800'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                )}>
                                Tous
                            </button>
                            {washers.map(w => (
                                <button key={w.id}
                                    onClick={() => setFilterWasher(w.id === filterWasher ? null : w.id)}
                                    title={w.name}
                                    className={clsx(
                                        'w-8 h-8 rounded-full border-2 text-[11px] font-bold flex items-center justify-center transition-all',
                                        filterWasher === w.id
                                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                                    )}>
                                    {w.avatar
                                        ? <img src={w.avatar} alt={w.name} className="w-full h-full rounded-full object-cover" />
                                        : w.name.slice(0, 2).toUpperCase()
                                    }
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Bouton rafraîchir */}
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200
                                   text-xs text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">
                        <RefreshCw size={13} className={clsx(refreshing && 'animate-spin')} />
                        Actualiser
                    </button>
                </div>

                {/* ── Kanban ── */}
                <div className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 h-full">
                        {COLUMNS.map(col => (
                            <KanbanColumn
                                key={col.key}
                                col={col}
                                tickets={filterTickets(columns[col.key] ?? [])}
                                onStatusChange={() => router.reload({ preserveScroll: true })}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
