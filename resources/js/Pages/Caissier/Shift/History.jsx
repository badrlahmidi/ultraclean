import AppLayout from '@/Layouts/AppLayout';
import { formatMAD, formatDateTime } from '@/utils/format';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Clock, TrendingUp, Ticket, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import clsx from 'clsx';

function DiffBadge({ cents }) {
    const diff = cents ?? 0;
    if (diff === 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <CheckCircle2 size={11} /> OK
        </span>
    );
    if (diff > 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            +{formatMAD(diff)}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertTriangle size={11} /> {formatMAD(diff)}
        </span>
    );
}

function formatDuration(minutes) {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

export default function ShiftHistory({ shifts, totals }) {
    const items = shifts?.data ?? [];
    const meta = shifts?.meta ?? {};

    const totalDiff = totals?.total_difference ?? 0;

    return (
        <AppLayout title="Historique des shifts">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={route('caissier.shift.index')}
                        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                        <ArrowLeft size={16} /> Shift actuel
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">/</span>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <History size={20} className="text-blue-500" /> Historique des shifts
                    </h1>
                </div>

                {/* Totaux globaux */}
                {totals && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-4">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shifts clôturés</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totals.shift_count ?? 0}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-4">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total encaissé</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatMAD(totals.total_closing ?? 0)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-4">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Attendu (cumul)</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatMAD(totals.total_expected ?? 0)}</p>
                        </div>
                        <div className={clsx('rounded-2xl border shadow-sm p-4',
                            totalDiff === 0 ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                : totalDiff > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        )}>
                            <p className={clsx('text-xs font-semibold uppercase tracking-wider',
                                totalDiff === 0 ? 'text-gray-400 dark:text-gray-500'
                                    : totalDiff > 0 ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-red-600 dark:text-red-400'
                            )}>Écart total</p>
                            <p className={clsx('text-2xl font-bold mt-1',
                                totalDiff === 0 ? 'text-gray-700 dark:text-gray-300'
                                    : totalDiff > 0 ? 'text-blue-700 dark:text-blue-300'
                                        : 'text-red-700 dark:text-red-300'
                            )}>
                                {totalDiff === 0 ? '0,00 MAD' : (totalDiff > 0 ? '+' : '') + formatMAD(totalDiff)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Table des shifts */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b dark:border-gray-700">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            Shifts clôturés ({meta.total ?? items.length})
                        </h2>
                    </div>

                    {items.length === 0 ? (
                        <p className="text-center text-gray-400 py-12 text-sm">Aucun shift clôturé</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                                        <th className="text-left px-4 py-3">Caissier</th>
                                        <th className="text-left px-4 py-3">Ouverture</th>
                                        <th className="text-left px-4 py-3">Clôture</th>
                                        <th className="text-center px-4 py-3">Durée</th>
                                        <th className="text-center px-4 py-3">Tickets</th>
                                        <th className="text-right px-4 py-3">CA</th>
                                        <th className="text-right px-4 py-3">Caisse fermée</th>
                                        <th className="text-right px-4 py-3">Attendu</th>
                                        <th className="text-center px-4 py-3">Écart</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {items.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.user ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{formatDateTime(s.opened_at)}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{formatDateTime(s.closed_at)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                                    <Clock size={11} /> {formatDuration(s.duration_minutes)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                                    <Ticket size={11} />
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{s.tickets_paid}</span>
                                                    <span className="text-gray-400">/{s.tickets_total}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                {formatMAD(s.revenue_cents)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {formatMAD(s.closing_cash_cents)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                {formatMAD(s.expected_cash_cents)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <DiffBadge cents={s.difference_cents} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {meta.last_page > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                            <span>Page {meta.current_page} sur {meta.last_page}</span>
                            <div className="flex gap-2">
                                {shifts.links?.filter(l => ['&laquo; Previous', 'Next &raquo;'].includes(l.label) || !isNaN(Number(l.label))).map((l, i) => (
                                    <a key={i} href={l.url ?? '#'}
                                        className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                            l.active ? 'bg-blue-600 text-white'
                                                : l.url ? 'border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                    : 'opacity-30 pointer-events-none border dark:border-gray-700 text-gray-400'
                                        )}
                                        dangerouslySetInnerHTML={{ __html: l.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
