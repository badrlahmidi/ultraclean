import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ShoppingCart, Plus, Trash2, Search, Eye } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const STATUS_COLORS = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function fmt(cents) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format((cents ?? 0) / 100) + ' MAD';
}

export default function PurchasesIndex({ purchases, stats, filters, statuses }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function apply(e) {
        e?.preventDefault();
        router.get(route('admin.purchases.index'), { search, status }, { preserveState: true });
    }

    function destroy(id) {
        if (!confirm('Supprimer cet achat ?')) return;
        router.delete(route('admin.purchases.destroy', id), { preserveScroll: true });
    }

    return (
        <AppLayout title="Achats">
            <Head title="Achats fournisseurs" />
            <div className="space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={20} className="text-blue-600" />
                        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Achats fournisseurs</h1>
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 font-medium">
                            {stats.total}
                        </span>
                    </div>
                    <Link href={route('admin.purchases.create')}
                        className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition touch-manipulation">
                        <Plus size={16} /> Nouvel achat
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total achats', value: stats.total, color: 'blue' },
                        { label: 'Brouillons', value: stats.draft, color: 'gray' },
                        { label: 'Réceptionnés', value: stats.received, color: 'green' },
                        { label: 'Montant total', value: fmt(stats.total_cents), color: 'green' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className={clsx('rounded-2xl p-4 border',
                            color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' :
                                color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' :
                                    'bg-gray-50 dark:bg-slate-700/50 border-gray-100 dark:border-slate-700'
                        )}>
                            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p>
                            <p className="text-xl font-bold mt-1">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Filtres */}
                <form onSubmit={apply} className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Référence, fournisseur…"
                            className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <select value={status} onChange={e => setStatus(e.target.value)}
                        className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Tous statuts</option>
                        {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button type="submit" className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        Filtrer
                    </button>
                </form>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {purchases.data.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun achat enregistré</p>
                            <Link href={route('admin.purchases.create')}
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700">
                                <Plus size={14} /> Créer le premier achat
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Référence</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase hidden md:table-cell">Fournisseur</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Total</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Statut</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {purchases.data.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-gray-800 dark:text-gray-100">
                                                    {p.reference ?? `#${p.id}`}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell text-gray-700 dark:text-gray-300">
                                                {p.supplier?.name ?? <span className="text-gray-400 italic">Sans fournisseur</span>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {p.purchased_at}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                                                {fmt(p.total_cents)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[p.status])}>
                                                    {statuses[p.status] ?? p.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={route('admin.purchases.show', p.id)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                                                        <Eye size={14} />
                                                    </Link>
                                                    {p.status === 'draft' && (
                                                        <button onClick={() => destroy(p.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {purchases.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {purchases.links.map((link, i) => (
                            <button key={i} disabled={!link.url || link.active}
                                onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                className={clsx('px-3 py-1.5 rounded-lg text-sm border transition',
                                    link.active
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-40'
                                )}
                                dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
