import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Search, Eye, XCircle, ShoppingCart, TrendingUp, X, AlertCircle } from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import clsx from 'clsx';

const STATUS_LABELS = {
    paid:      'Payée',
    cancelled: 'Annulée',
};

const STATUS_COLORS = {
    paid:      'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
};

const PAYMENT_LABELS = {
    cash:   'Espèces',
    card:   'Carte',
    mobile: 'Mobile',
    wire:   'Virement',
    mixed:  'Mixte',
};

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={16} className="text-white" />
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
}

export default function POSIndex({ sales, stats, filters }) {
    const [search, setSearch]   = useState(filters?.search ?? '');
    const [status, setStatus]   = useState(filters?.status ?? '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo]   = useState(filters?.date_to ?? '');

    function applyFilters(overrides = {}) {
        router.get(route('caissier.pos.index'), {
            search:    overrides.search   ?? search,
            status:    overrides.status   ?? status,
            today:     overrides.today    ?? (overrides.date_from || overrides.date_to ? undefined : (!dateFrom && !dateTo ? 1 : undefined)),
            date_from: overrides.date_from ?? dateFrom || undefined,
            date_to:   overrides.date_to   ?? dateTo   || undefined,
        }, { preserveState: true, replace: true });
    }

    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10);

    function clearDates() {
        setDateFrom(''); setDateTo('');
        applyFilters({ date_from: '', date_to: '', today: 1 });
    }

    return (
        <AppLayout>
            <Head title="Ventes POS" />

            <PageHeader
                title="Point de Vente"
                subtitle="Ventes express du jour"
                action={
                    <Link
                        href={route('caissier.pos.create')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Plus size={15} /> Nouvelle vente
                    </Link>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <StatCard
                    label="Ventes aujourd'hui"
                    value={stats.count}
                    icon={ShoppingCart}
                    color="bg-emerald-500"
                />
                <StatCard
                    label="CA aujourd'hui"
                    value={formatMAD(stats.total_cents)}
                    icon={TrendingUp}
                    color="bg-blue-500"
                />
            </div>

            {/* Filtres */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
                <div className="flex gap-2 flex-wrap">
                    {/* Recherche */}
                    <div className="relative flex-1 min-w-40">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters({ search: e.target.value })}
                            placeholder="N° vente, client…"
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                    </div>

                    {/* Statut */}
                    <select
                        value={status}
                        onChange={e => { setStatus(e.target.value); applyFilters({ status: e.target.value }); }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                    >
                        <option value="">Tous statuts</option>
                        <option value="paid">Payées</option>
                        <option value="cancelled">Annulées</option>
                    </select>
                </div>

                {/* Filtres date */}
                <div className="flex gap-2 flex-wrap items-center">
                    <button
                        onClick={() => applyFilters({ today: 1, date_from: '', date_to: '' })}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        Aujourd'hui
                    </button>
                    <button
                        onClick={() => { const w = fmt(new Date(today.setDate(today.getDate() - today.getDay()))); applyFilters({ date_from: w, date_to: fmt(new Date()), today: undefined }); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        Cette semaine
                    </button>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        onBlur={() => applyFilters()}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-gray-400">→</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        onBlur={() => applyFilters()}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    {(dateFrom || dateTo) && (
                        <button onClick={clearDates} className="p-1 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {sales.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                        <ShoppingCart size={32} className="opacity-30" />
                        <p className="text-sm">Aucune vente pour cette période</p>
                        <Link
                            href={route('caissier.pos.create')}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            Créer une vente
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left">N° Vente</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Client</th>
                                    <th className="px-4 py-3 text-center">Produits</th>
                                    <th className="px-4 py-3 text-center">Paiement</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-center">Statut</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sales.data.map(sale => (
                                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                                            {sale.sale_number}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {formatDateTime(sale.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {sale.client?.name ?? <span className="text-gray-400 italic">Anonyme</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                                            {sale.lines_count} article{sale.lines_count > 1 ? 's' : ''}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                                            {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                            {formatMAD(sale.total_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={clsx(
                                                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                                STATUS_COLORS[sale.status] ?? 'bg-gray-100 text-gray-600'
                                            )}>
                                                {STATUS_LABELS[sale.status] ?? sale.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={route('caissier.pos.show', sale.ulid)}
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                <Eye size={13} /> Voir
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {sales.last_page > 1 && (
                <div className="mt-4">
                    <Pagination links={sales.links} />
                </div>
            )}
        </AppLayout>
    );
}
