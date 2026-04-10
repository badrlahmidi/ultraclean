import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { CreditCard, Filter, X, ChevronLeft, ChevronRight, Banknote, Smartphone, Building2, Download } from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import clsx from 'clsx';

const METHOD_CONFIG = {
    cash: { label: 'Espèces', color: 'bg-emerald-100 text-emerald-700', icon: Banknote },
    card: { label: 'Carte', color: 'bg-blue-100 text-blue-700', icon: CreditCard },
    mobile: { label: 'Mobile', color: 'bg-purple-100 text-purple-700', icon: Smartphone },
    wire: { label: 'Virement', color: 'bg-yellow-100 text-yellow-700', icon: Building2 },
    mixed: { label: 'Mixte', color: 'bg-gray-100 text-gray-600', icon: CreditCard },
};

function MethodBadge({ method }) {
    const cfg = METHOD_CONFIG[method] ?? METHOD_CONFIG.mixed;
    const Icon = cfg.icon;
    return (
        <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', cfg.color)}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

export default function PaymentsIndex({ payments, totals, filters, methods }) {
    const [method, setMethod] = useState(filters.method ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [search, setSearch] = useState(filters.search ?? '');

    function apply(e) {
        e.preventDefault();
        router.get(route('admin.payments.index'), { method, from, to, search }, { preserveState: true });
    }

    function reset() {
        setMethod(''); setFrom(''); setTo(''); setSearch('');
        router.get(route('admin.payments.index'));
    }

    const hasFilters = method || from || to || search;

    return (
        <AppLayout title="Historique des paiements">
            <Head title="Historique paiements" />

            <div className="space-y-5">                {/* Header */}
                <div className="flex items-center gap-2">
                    <CreditCard size={20} className="text-blue-600" />
                    <h1 className="text-lg font-bold text-gray-800">Historique des paiements</h1>
                    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                        {payments.total}
                    </span>
                    <a
                        href={route('admin.payments.export', { method, from, to, search })}
                        className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Download size={13} />
                        Exporter CSV
                    </a>
                </div>

                {/* Totaux */}
                {totals && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Total encaissé', value: totals.total, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                            { label: 'Espèces', value: totals.total_cash, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                            { label: 'Carte', value: totals.total_card, color: 'bg-purple-50 text-purple-700 border-purple-100' },
                            { label: 'Mobile / Wire', value: (totals.total_mobile ?? 0) + (totals.total_wire ?? 0), color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className={clsx('rounded-xl border p-4', color)}>
                                <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
                                <p className="text-xl font-bold mt-1">{formatMAD(value ?? 0)}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filtres */}
                <form onSubmit={apply} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Recherche (ticket, client)</label>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="N° ticket, nom client…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Méthode</label>
                        <select value={method} onChange={e => setMethod(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Toutes</option>
                            {methods.map(m => (
                                <option key={m} value={m}>{METHOD_CONFIG[m]?.label ?? m}</option>
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
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Ticket</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Client</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Méthode</th>
                                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Montant</th>
                                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Monnaie rendue</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Caissier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                                            Aucun paiement trouvé
                                        </td>
                                    </tr>
                                )}
                                {payments.data.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {formatDateTime(p.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.ticket ? (
                                                <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                    #{p.ticket.ticket_number}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {p.ticket?.client?.name ?? <span className="text-gray-400">Client anonyme</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <MethodBadge method={p.method} />
                                            {p.method === 'mixed' && (
                                                <div className="text-[10px] text-gray-400 mt-0.5 space-x-1">
                                                    {p.amount_cash_cents > 0 && <span>Esp: {formatMAD(p.amount_cash_cents)}</span>}
                                                    {p.amount_card_cents > 0 && <span>Carte: {formatMAD(p.amount_card_cents)}</span>}
                                                    {p.amount_mobile_cents > 0 && <span>Mob: {formatMAD(p.amount_mobile_cents)}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                                            {formatMAD(p.amount_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                                            {p.change_given_cents > 0 ? formatMAD(p.change_given_cents) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {p.processed_by?.name ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {payments.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                            <span className="text-gray-500">
                                Page {payments.current_page} / {payments.last_page}
                            </span>
                            <div className="flex gap-2">
                                <button disabled={!payments.prev_page_url}
                                    onClick={() => router.get(payments.prev_page_url)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ChevronLeft size={14} /> Préc.
                                </button>
                                <button disabled={!payments.next_page_url}
                                    onClick={() => router.get(payments.next_page_url)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
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
