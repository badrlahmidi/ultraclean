import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { ShieldCheck, Filter, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { formatDateTime } from '@/utils/format';
import clsx from 'clsx';

const ROLE_COLORS = {
    admin: 'bg-purple-100 text-purple-700',
    caissier: 'bg-blue-100 text-blue-700',
    laveur: 'bg-green-100 text-green-700',
};

// Catégorise le préfixe d'action pour la couleur du badge
function actionColor(action) {
    if (action.includes('created')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-700';
    if (action.includes('deleted')) return 'bg-red-100 text-red-700';
    if (action.includes('login')) return 'bg-purple-100 text-purple-700';
    if (action.includes('payment') || action.includes('paid')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
}

// Raccourcit le type de sujet (App\Models\Ticket → Ticket)
function shortSubject(type) {
    if (!type) return '—';
    return type.split('\\').pop();
}

export default function ActivityLogIndex({ logs, users, actions, filters }) {
    const [userId, setUserId] = useState(filters.user_id ?? '');
    const [action, setAction] = useState(filters.action ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    function apply(e) {
        e.preventDefault();
        router.get(route('admin.activity-log.index'), { user_id: userId, action, from, to }, { preserveState: true });
    }

    function reset() {
        setUserId(''); setAction(''); setFrom(''); setTo('');
        router.get(route('admin.activity-log.index'));
    }

    const hasFilters = userId || action || from || to;

    return (
        <AppLayout title="Journal d'audit">
            <Head title="Journal d'audit" />

            <div className="space-y-5">                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={20} className="text-purple-600" />
                        <h1 className="text-lg font-bold text-gray-800">Journal d'audit</h1>
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                            {logs.total} entrées
                        </span>
                    </div>
                    <a
                        href={route('admin.activity-log.export', { user_id: userId, action, from, to })}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Download size={13} />
                        Exporter CSV
                    </a>
                </div>

                {/* Filtres */}
                <form onSubmit={apply} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Utilisateur</label>
                        <select value={userId} onChange={e => setUserId(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Tous</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Action</label>
                        <select value={action} onChange={e => setAction(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Toutes</option>
                            {actions.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Du</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Au</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <button type="submit"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        <Filter size={14} /> Filtrer
                    </button>

                    {hasFilters && (
                        <button type="button" onClick={reset}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg border border-gray-200 hover:border-red-200 transition-colors">
                            <X size={14} /> Reset
                        </button>
                    )}
                </form>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Date & Heure</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Utilisateur</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Action</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Entité</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Détails</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-gray-400">
                                            <ShieldCheck size={32} className="mx-auto mb-2 opacity-30" />
                                            Aucune entrée pour ces filtres
                                        </td>
                                    </tr>
                                )}
                                {logs.data.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                                            {formatDateTime(log.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.user ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-800">{log.user.name}</span>
                                                    <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', ROLE_COLORS[log.user.role] ?? 'bg-gray-100 text-gray-600')}>
                                                        {log.user.role}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Système</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full font-mono', actionColor(log.action))}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.subject_type ? (
                                                <div className="text-xs">
                                                    <span className="font-medium text-gray-700">{shortSubject(log.subject_type)}</span>
                                                    {log.subject_id && <span className="text-gray-400 ml-1">#{log.subject_id}</span>}
                                                </div>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 max-w-[280px]">
                                            {log.properties && Object.keys(log.properties).length > 0 ? (
                                                <div className="text-xs text-gray-600 truncate font-mono bg-gray-50 rounded px-2 py-1">
                                                    {JSON.stringify(log.properties)}
                                                </div>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                                            {log.ip_address ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                            <span className="text-gray-500">
                                Page {logs.current_page} / {logs.last_page}
                                <span className="ml-2 text-gray-400">({logs.total} entrées)</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={!logs.prev_page_url}
                                    onClick={() => router.get(logs.prev_page_url)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={14} /> Préc.
                                </button>
                                <button
                                    disabled={!logs.next_page_url}
                                    onClick={() => router.get(logs.next_page_url)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Suiv. <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
