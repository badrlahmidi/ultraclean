import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    Car, Clock, PlayCircle, CheckCircle2, RefreshCw,
    AlertTriangle, Hourglass, CreditCard, User,
    Timer, Loader2, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

/* ─── Helpers ──────────────────────────────────────────────────────── */

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

/* ─── Configuration des colonnes ───────────────────────────────────── */

const COLUMNS = [
    {
        key: 'pending',
        label: 'En attente',
        icon: Hourglass,
        color: 'text-amber-600',
        headerBg: 'bg-amber-100',
        dot: 'bg-amber-400',
        emptyIcon: Hourglass,
    },
    {
        key: 'in_progress',
        label: 'En cours',
        icon: PlayCircle,
        color: 'text-blue-600',
        headerBg: 'bg-blue-100',
        dot: 'bg-blue-500',
        emptyIcon: PlayCircle,
    },
    {
        key: 'prepaid',
        label: 'Prépayés — à laver',
        icon: CreditCard,
        color: 'text-emerald-600',
        headerBg: 'bg-emerald-100',
        dot: 'bg-emerald-500',
        emptyIcon: CreditCard,
    },
    {
        key: 'overdue',
        label: 'En retard',
        icon: AlertTriangle,
        color: 'text-red-600',
        headerBg: 'bg-red-100',
        dot: 'bg-red-500',
        emptyIcon: AlertTriangle,
    },
];

/* ─── BrandLogo ─────────────────────────────────────────────────────── */

function BrandLogo({ url, name }) {
    const [err, setErr] = useState(false);
    if (!url || err) return <Car size={14} className="text-gray-300" />;
    return (
        <img src={url} alt={name ?? ''} className="w-full h-full object-contain"
            onError={() => setErr(true)} />
    );
}

/* ─── TicketCard ────────────────────────────────────────────────────── */

function TicketCard({ ticket, colKey, onStart, onComplete }) {
    const [loading, setLoading] = useState(false);
    const [elapsed, setElapsed] = useState('');

    const isPending   = ticket.status === 'pending';
    const isInProgress = ticket.status === 'in_progress';
    const isPrepaid   = ticket.status === 'paid' && ticket.is_prepaid;
    const isPartial   = ticket.status === 'partial';
    const isOverdue   = colKey === 'overdue';

    // Live timer
    useEffect(() => {
        function update() {
            const from = new Date(ticket.started_at ?? ticket.created_at);
            const diff = Math.floor((Date.now() - from.getTime()) / 1000);
            const m = Math.floor(diff / 60);
            const s = diff % 60;
            setElapsed(`${m}:${String(s).padStart(2, '0')}`);
        }
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [ticket.started_at, ticket.created_at]);

    /* Determine action for the card — overdue tickets follow the same rules */
    const canStart    = isPending || isPrepaid || isPartial;
    const canComplete = isInProgress;

    function handleStart() {
        setLoading(true);
        router.patch(route('laveur.tickets.start', ticket.id), {}, {
            preserveScroll: true,
            onFinish: () => setLoading(false),
        });
    }

    function handleComplete() {
        setLoading(true);
        router.patch(route('laveur.tickets.complete', ticket.id), {}, {
            preserveScroll: true,
            onFinish: () => setLoading(false),
        });
    }

    const total = ticket.services?.reduce(
        (s, ts) => s + (ts.unit_price_cents ?? 0) * (ts.quantity ?? 1), 0
    ) ?? ticket.total_cents ?? 0;

    const dueAt = ticket.due_at ? new Date(ticket.due_at) : null;
    const isLate = dueAt && dueAt < new Date() && !['completed', 'paid', 'cancelled'].includes(ticket.status);
    const minutesLate = dueAt && isLate ? Math.round((Date.now() - dueAt.getTime()) / 60000) : null;

    const washerInitials = ticket.assigned_to
        ? ticket.assigned_to.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()
        : null;

    return (
        <div className={clsx(
            'rounded-2xl border p-3 space-y-2.5 transition-shadow hover:shadow-md',
            isOverdue ? 'border-red-200 bg-red-50/60' : 'bg-white border-gray-200',
            isInProgress && !isOverdue && 'ring-2 ring-blue-300 ring-offset-1',
            isPrepaid && !isOverdue && 'ring-2 ring-emerald-300 ring-offset-1',
        )}>
            {/* Header : numéro + marque + opérateur */}
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
                <div className="flex items-center gap-1.5 shrink-0">
                    {isPrepaid && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">
                            <CreditCard size={9} /> Prépayé
                        </span>
                    )}
                    {isPartial && (
                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5">
                            Partiel
                        </span>
                    )}
                    {washerInitials && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold
                                        flex items-center justify-center"
                            title={ticket.assigned_to?.name}>
                            {washerInitials}
                        </div>
                    )}
                </div>
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
            {ticket.services?.length > 0 && (
                <div className="space-y-0.5">
                    {ticket.services.slice(0, 3).map((ts, i) => (
                        <div key={ts.id ?? i} className="flex items-center justify-between">
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

            {/* Footer : timer + retard + total */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <div className={clsx('flex items-center gap-1 text-[10px]',
                        isLate ? 'text-red-500 font-semibold' : 'text-gray-400')}>
                        <Clock size={10} />
                        {isLate && minutesLate ? `+${minutesLate} min` : elapsed}
                    </div>
                    {ticket.estimated_duration && !isLate && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Timer size={10} />
                            {fmtDur(ticket.estimated_duration)}
                        </div>
                    )}
                    {dueAt && !isLate && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            {fmtTime(ticket.due_at)}
                        </div>
                    )}
                </div>
                <span className="text-xs font-bold text-gray-800">{fmt(total)}</span>
            </div>

            {/* Boutons action */}
            {canStart && (
                <button
                    onClick={handleStart}
                    disabled={loading}
                    className={clsx(
                        'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                        loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isOverdue ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : isPrepaid ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}>
                    {loading ? <Loader2 size={12} className="animate-spin" />
                        : <><ChevronRight size={12} />Démarrer le lavage</>
                    }
                </button>
            )}
            {canComplete && (
                <button
                    onClick={handleComplete}
                    disabled={loading}
                    className={clsx(
                        'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                        loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                    )}>
                    {loading ? <Loader2 size={12} className="animate-spin" />
                        : <><CheckCircle2 size={12} />Terminé</>
                    }
                </button>
            )}
        </div>
    );
}

/* ─── KanbanColumn ──────────────────────────────────────────────────── */

function KanbanColumn({ col, tickets, onStart, onComplete }) {
    const Icon = col.icon;
    return (
        <div className="flex flex-col min-h-0 rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
            <div className={clsx('flex items-center gap-2 px-4 py-3 border-b border-gray-200', col.headerBg)}>
                <span className={clsx('w-2 h-2 rounded-full', col.dot)} />
                <Icon size={14} className={col.color} />
                <span className={clsx('text-sm font-semibold', col.color)}>{col.label}</span>
                <span className="ml-auto text-xs text-gray-400 font-medium bg-white/70 px-2 py-0.5 rounded-full">
                    {tickets.length}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px] max-h-[calc(100vh-260px)]">
                {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                        <Icon size={24} />
                        <p className="text-xs mt-2">Aucun ticket</p>
                    </div>
                ) : tickets.map(t => (
                    <TicketCard
                        key={`${col.key}-${t.id}`}
                        ticket={t}
                        colKey={col.key}
                        onStart={onStart}
                        onComplete={onComplete}
                    />
                ))}
            </div>
        </div>
    );
}

/* ─── Page principale ───────────────────────────────────────────────── */

export default function Queue({ tickets, overdue: overdueList, laveurs: _laveurs }) {
    const pending    = tickets.filter(t => t.status === 'pending');
    const inProgress = tickets.filter(t => t.status === 'in_progress');
    const prepaid    = tickets.filter(t => (t.status === 'paid' && t.is_prepaid) || t.status === 'partial');
    const overdue    = overdueList ?? [];

    const [polling, setPolling] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!polling) return;
        const id = setInterval(() => {
            router.reload({ only: ['tickets', 'overdue'] });
        }, 15000);
        return () => clearInterval(id);
    }, [polling]);

    function refresh() {
        setRefreshing(true);
        router.reload({ onFinish: () => setRefreshing(false) });
    }

    const columnData = {
        pending,
        in_progress: inProgress,
        prepaid,
        overdue,
    };

    // Only show prepaid column if there are tickets (or always show overdue)
    const visibleColumns = COLUMNS.filter(col =>
        col.key !== 'prepaid' || prepaid.length > 0
    );

    const reloadPreserve = () => router.reload({ preserveScroll: true });

    return (
        <AppLayout title="File d'attente">
            <Head title="File d'attente" />

            <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

                {/* ── Barre du haut ── */}
                <div className="shrink-0 flex items-start gap-3 px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex-wrap">
                    <div>
                        <h1 className="text-base font-bold text-gray-800 leading-tight">File d'attente lavage</h1>
                        <p className="text-xs text-gray-400">
                            {pending.length} en attente · {inProgress.length} en cours
                            {prepaid.length > 0 && ` · ${prepaid.length} prépayé(s)`}
                        </p>
                    </div>

                    {/* Badges résumé */}
                    <div className="flex items-center gap-2 ml-2">
                        {overdue.length > 0 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                <AlertTriangle size={11} /> {overdue.length} en retard
                            </span>
                        )}
                        {inProgress.length > 0 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                <PlayCircle size={11} /> {inProgress.length} en cours
                            </span>
                        )}
                    </div>

                    <div className="flex-1" />

                    {/* Actualisation auto */}
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={polling}
                            onChange={e => setPolling(e.target.checked)}
                            className="rounded"
                        />
                        Auto (15s)
                    </label>

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
                    {/* Desktop : grille en hauteur fixe */}
                    <div className={clsx(
                        'hidden lg:grid gap-4 p-4 h-full',
                        visibleColumns.length === 4 ? 'lg:grid-cols-4'
                            : visibleColumns.length === 3 ? 'lg:grid-cols-3'
                            : 'lg:grid-cols-2'
                    )}>
                        {visibleColumns.map(col => (
                            <KanbanColumn
                                key={col.key}
                                col={col}
                                tickets={columnData[col.key] ?? []}
                                onStart={reloadPreserve}
                                onComplete={reloadPreserve}
                            />
                        ))}
                    </div>
                    {/* Mobile : scroll horizontal */}
                    <div className="flex lg:hidden gap-3 p-3 overflow-x-auto h-full snap-x snap-mandatory pb-4">
                        {visibleColumns.map(col => (
                            <div key={col.key} className="snap-start shrink-0 w-[82vw] flex flex-col">
                                <KanbanColumn
                                    col={col}
                                    tickets={columnData[col.key] ?? []}
                                    onStart={reloadPreserve}
                                    onComplete={reloadPreserve}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
