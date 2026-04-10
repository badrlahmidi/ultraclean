import AppLayout from '@/Layouts/AppLayout';
import { router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Gift, Users, Star, TrendingUp, Search, ChevronRight, Award } from 'lucide-react';
import clsx from 'clsx';
import { formatMAD } from '@/utils/format';

const TIER_CONFIG = {
    standard: { label: 'Standard', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
    silver:   { label: 'Silver',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
    gold:     { label: 'Gold',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-400' },
    platinum: { label: 'Platinum', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' },
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

function KPICard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 flex items-start gap-4">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
            </div>
        </div>
    );
}

export default function LoyaltyIndex({ clients, kpis, filters, tiers }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [tier, setTier] = useState(filters.tier ?? '');

    function applyFilters(params) {
        router.get(route('admin.loyalty.index'), params, { preserveState: true, replace: true });
    }

    function onSearch(e) {
        e.preventDefault();
        applyFilters({ search, tier });
    }

    function onTierChange(val) {
        setTier(val);
        applyFilters({ search, tier: val });
    }

    return (
        <AppLayout title="Fidélité clients">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Gift size={24} className="text-violet-500" />
                            Programme Fidélité
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Gérez les points et paliers de vos clients
                        </p>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <KPICard label="Total points actifs" value={kpis.total_points.toLocaleString('fr-FR')} icon={Star} color="bg-amber-500" />
                    <KPICard label="Clients inscrits" value={kpis.total_clients} icon={Users} color="bg-blue-500" />
                    <KPICard label="Clients Gold" value={kpis.gold_count} icon={Award} color="bg-amber-400" />
                    <KPICard label="Clients Platinum" value={kpis.platinum_count} icon={TrendingUp} color="bg-violet-500" />
                </div>

                {/* Tier summary pills */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(tiers).map(([key, t]) => (
                        <button
                            key={key}
                            onClick={() => onTierChange(tier === key ? '' : key)}
                            className={clsx(
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                tier === key
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                            )}
                        >
                            {t.label}
                            {t.min_visits !== null && <span className="ml-1 opacity-60">≥{t.min_visits} visites</span>}
                        </button>
                    ))}
                </div>

                {/* Search bar */}
                <form onSubmit={onSearch} className="flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Nom ou téléphone..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700">
                        Chercher
                    </button>
                </form>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Client</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Palier</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Points</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Visites</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">CA total</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Dernière visite</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {clients.data.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">Aucun client trouvé</td></tr>
                                )}
                                {clients.data.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900 dark:text-white">{c.name}</div>
                                            <div className="text-xs text-gray-400">{c.phone ?? '—'}</div>
                                        </td>
                                        <td className="px-4 py-3"><TierBadge tier={c.loyalty_tier} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{c.loyalty_points.toLocaleString('fr-FR')}</span>
                                            <span className="text-xs text-gray-400 ml-1">pts</span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium">{c.total_visits}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-medium tabular-nums">{formatMAD(c.total_spent_cents)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 text-xs">
                                            {c.last_visit_date ? new Date(c.last_visit_date).toLocaleDateString('fr-FR') : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={route('admin.loyalty.show', c.id)}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                                            >
                                                Détail <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {clients.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-500">
                                {clients.from}–{clients.to} sur {clients.total}
                            </p>
                            <div className="flex gap-1">
                                {clients.links.map((link, i) => (
                                    <button
                                        key={i}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        className={clsx(
                                            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                                            link.active ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700',
                                            !link.url && 'opacity-30 cursor-not-allowed'
                                        )}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
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
