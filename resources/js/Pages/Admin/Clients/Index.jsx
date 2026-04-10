import AppLayout from '@/Layouts/AppLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Users, Search, Filter, X, ChevronRight, ChevronLeft, Star, UserX } from 'lucide-react';
import { formatMAD, formatDate } from '@/utils/format';
import clsx from 'clsx';

const TIER_CONFIG = {
    standard: { label: 'Standard', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    silver: { label: 'Silver', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    gold: { label: 'Gold', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
    platinum: { label: 'Platinum', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
};

function TierBadge({ tier }) {
    const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.standard;
    return (
        <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', cfg.color)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
        </span>
    );
}

export default function AdminClientsIndex({ clients, tiers, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [tier, setTier] = useState(filters.tier ?? '');

    function apply(e) {
        e.preventDefault();
        router.get(route('admin.clients.index'), { search, tier }, { preserveState: true });
    }

    function reset() {
        setSearch(''); setTier('');
        router.get(route('admin.clients.index'));
    }

    const hasFilters = search || tier;

    return (
        <AppLayout title="Gestion clients">
            <Head title="Clients — Admin" />

            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Users size={20} className="text-blue-600" />
                        <h1 className="text-lg font-bold text-gray-800">Clients</h1>
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">{clients.total}</span>
                    </div>
                </div>

                {/* Filtres */}
                <form onSubmit={apply} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px] relative">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Recherche</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Nom, téléphone, email, plaque…"
                                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Tier fidélité</label>
                        <select value={tier} onChange={e => setTier(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Tous</option>
                            {Object.entries(tiers).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
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
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Client</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Contact</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Fidélité</th>
                                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Visites</th>
                                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">CA total</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Dernière visite</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {clients.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            <Users size={32} className="mx-auto mb-2 opacity-30" />
                                            Aucun client trouvé
                                        </td>
                                    </tr>
                                )}
                                {clients.data.map(client => (
                                    <tr key={client.id} className={clsx('hover:bg-gray-50 transition-colors', client.deleted_at && 'opacity-50')}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                                                    {client.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{client.name}</p>
                                                    {client.vehicle_plate && (
                                                        <p className="text-xs text-gray-400 font-mono">{client.vehicle_plate}</p>
                                                    )}
                                                </div>
                                                {client.deleted_at && <UserX size={14} className="text-red-400 flex-shrink-0" />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            <p>{client.phone ?? '—'}</p>
                                            {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <TierBadge tier={client.loyalty_tier ?? 'standard'} />
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                <Star size={10} className="inline mr-0.5" />
                                                {client.loyalty_points ?? 0} pts
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-700">
                                            {client.tickets_count ?? 0}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                            {formatMAD(client.total_spent_cents ?? 0)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {client.last_visit_date ? formatDate(client.last_visit_date, 'medium') : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={route('admin.clients.show', client.id)}
                                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                                Voir <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clients.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                            <span className="text-gray-500">Page {clients.current_page} / {clients.last_page} ({clients.total})</span>
                            <div className="flex gap-2">
                                <button disabled={!clients.prev_page_url}
                                    onClick={() => router.get(clients.prev_page_url)}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ChevronLeft size={14} /> Préc.
                                </button>
                                <button disabled={!clients.next_page_url}
                                    onClick={() => router.get(clients.next_page_url)}
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
