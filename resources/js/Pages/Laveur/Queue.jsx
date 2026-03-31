import AppLayout from '@/Layouts/AppLayout';
import StatusBadge from '@/Components/StatusBadge';
import { formatMAD, formatDateTime } from '@/utils/format';
import { router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Car, Clock, PlayCircle, CheckCircle2, RefreshCw, Layers } from 'lucide-react';
import clsx from 'clsx';

/* ─── Carte ticket ─── */
function TicketCard({ ticket, onStart, onComplete, isLaveur }) {
    const isPending = ticket.status === 'pending';
    const isInProgress = ticket.status === 'in_progress';

    // Durée depuis création
    const [elapsed, setElapsed] = useState('');
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

    return (
        <div className={clsx(
            'bg-white rounded-2xl border shadow-sm p-4 space-y-3 transition-all hover:shadow-md',
            isInProgress && 'ring-2 ring-blue-400 ring-offset-1'
        )}>
            {/* En-tête */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-bold text-gray-900 text-sm">{ticket.ticket_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(ticket.created_at)}</p>
                </div>
                <StatusBadge status={ticket.status} size="sm" />
            </div>            {/* Véhicule */}
            <div className="flex items-center gap-2">
                <Car size={16} className="text-gray-400 flex-shrink-0" />
                <span className="font-semibold text-gray-800 text-sm">
                    {ticket.vehicle_brand ?? ticket.vehicle_plate ?? '—'}
                </span>
                {ticket.vehicle_brand && ticket.vehicle_plate && (
                    <span className="text-xs text-gray-400 font-mono">· {ticket.vehicle_plate}</span>
                )}
            </div>

            {/* Services */}
            {ticket.services?.length > 0 && (
                <div className="space-y-0.5">
                    {ticket.services.slice(0, 3).map(s => (
                        <div key={s.id} className="flex justify-between text-xs text-gray-600">
                            <span>{s.service_name}</span>
                            <span className="text-gray-400">×{s.quantity}</span>
                        </div>
                    ))}
                    {ticket.services.length > 3 && (
                        <p className="text-xs text-gray-400">+{ticket.services.length - 3} autre(s)</p>
                    )}
                </div>
            )}

            {/* Timer */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={12} />
                <span>{isInProgress ? 'En cours depuis' : 'Attente depuis'} {elapsed}</span>
            </div>

            {/* Laveur assigné */}
            {ticket.assigned_to && (
                <p className="text-xs text-blue-600 font-medium">
                    ✦ {ticket.assigned_to.name}
                </p>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-xs text-gray-400">{ticket.services?.length ?? 0} service(s)</span>
                <span className="text-sm font-bold text-gray-900">{formatMAD(ticket.total_cents)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {isPending && (
                    <button
                        onClick={() => onStart(ticket.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                    >
                        <PlayCircle size={14} /> Démarrer
                    </button>
                )}
                {isInProgress && (
                    <button
                        onClick={() => onComplete(ticket.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
                    >
                        <CheckCircle2 size={14} /> Terminé
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Colonne kanban ─── */
function KanbanColumn({ title, status, tickets, count, colorClass, children }) {
    return (
        <div className="flex flex-col min-h-0">
            <div className={clsx('flex items-center gap-2 px-4 py-3 rounded-t-2xl border-b', colorClass)}>
                <Layers size={16} className="opacity-70" />
                <h2 className="font-bold text-sm">{title}</h2>
                <span className="ml-auto text-xs font-bold bg-white/40 rounded-full px-2 py-0.5">{count}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-b-2xl min-h-[200px] max-h-[calc(100vh-260px)]">
                {tickets.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-12">Aucun ticket</p>
                ) : tickets.map(t => children(t))}
            </div>
        </div>
    );
}

/* ─── Page principale ─── */
export default function Queue({ tickets, laveurs }) {
    const pending = tickets.filter(t => t.status === 'pending');
    const inProgress = tickets.filter(t => t.status === 'in_progress');

    const [polling, setPolling] = useState(true);

    // Auto-refresh toutes les 15 secondes
    useEffect(() => {
        if (!polling) return;
        const id = setInterval(() => {
            router.reload({ only: ['tickets'] });
        }, 15000);
        return () => clearInterval(id);
    }, [polling]);

    function handleStart(ticketId) {
        router.patch(route('laveur.tickets.start', ticketId));
    }

    function handleComplete(ticketId) {
        router.patch(route('laveur.tickets.complete', ticketId));
    }

    return (
        <AppLayout title="File d'attente">
            <div className="space-y-4 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">File d'attente lavage</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {pending.length} en attente · {inProgress.length} en cours
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={polling}
                                onChange={e => setPolling(e.target.checked)}
                                className="rounded"
                            />
                            Actualisation auto (15s)
                        </label>
                        <button
                            onClick={() => router.reload({ only: ['tickets'] })}
                            className="flex items-center gap-2 px-3 py-2 border rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                        >
                            <RefreshCw size={14} /> Actualiser
                        </button>
                    </div>
                </div>

                {/* Kanban 2 colonnes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <KanbanColumn
                        title="En attente"
                        status="pending"
                        tickets={pending}
                        count={pending.length}
                        colorClass="bg-yellow-100 text-yellow-800 border-yellow-200"
                    >
                        {t => (
                            <TicketCard
                                key={t.id}
                                ticket={t}
                                onStart={handleStart}
                                onComplete={handleComplete}
                            />
                        )}
                    </KanbanColumn>

                    <KanbanColumn
                        title="En cours"
                        status="in_progress"
                        tickets={inProgress}
                        count={inProgress.length}
                        colorClass="bg-blue-100 text-blue-800 border-blue-200"
                    >
                        {t => (
                            <TicketCard
                                key={t.id}
                                ticket={t}
                                onStart={handleStart}
                                onComplete={handleComplete}
                            />
                        )}
                    </KanbanColumn>
                </div>
            </div>
        </AppLayout>
    );
}
