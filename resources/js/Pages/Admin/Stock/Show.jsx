import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import {
    Package, ArrowLeft, TrendingUp, TrendingDown, RefreshCw,
    AlertTriangle, User, Ticket, Clock,
} from 'lucide-react';
import clsx from 'clsx';

/* ─── Helpers ─── */
function fmt(n) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n);
}
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-MA', { dateStyle: 'medium', timeStyle: 'short' });
}

const TYPE_CONFIG = {
    in: {
        label: 'Entrée',
        icon: TrendingUp,
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        qty: 'text-green-600 dark:text-green-400',
        prefix: '+',
    },
    out: {
        label: 'Sortie',
        icon: TrendingDown,
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        qty: 'text-red-600 dark:text-red-400',
        prefix: '−',
    },
    adjustment: {
        label: 'Inventaire',
        icon: RefreshCw,
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        qty: 'text-blue-600 dark:text-blue-400',
        prefix: '=',
    },
};

function MovementRow({ movement, unit }) {
    const cfg = TYPE_CONFIG[movement.type] ?? TYPE_CONFIG.adjustment;
    const Icon = cfg.icon;

    return (
        <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', cfg.badge)}>
                        <Icon size={13} />
                    </div>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                        {cfg.label}
                    </span>
                </div>
            </td>
            <td className="px-4 py-3 text-right">
                <span className={clsx('font-bold text-sm', cfg.qty)}>
                    {cfg.prefix} {fmt(movement.quantity)} {unit}
                </span>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell">
                <p className="text-sm text-gray-700 dark:text-gray-300">{movement.note || '—'}</p>
                {movement.reference && (
                    <p className="text-xs text-gray-400 mt-0.5">Réf: {movement.reference}</p>
                )}
            </td>
            <td className="px-4 py-3 hidden md:table-cell">
                {movement.ticket ? (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <Ticket size={12} />
                        {movement.ticket.ticket_number}
                    </span>
                ) : movement.user ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <User size={12} />
                        {movement.user.name}
                    </span>
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                )}
            </td>
            <td className="px-4 py-3 text-right hidden lg:table-cell">
                <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                    <Clock size={11} />
                    {fmtDate(movement.created_at)}
                </span>
            </td>
        </tr>
    );
}

/* ─── Pagination ─── */
function Pagination({ meta, links }) {
    if (!meta || meta.last_page <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {meta.current_page} / {meta.last_page} — {meta.total} mouvement{meta.total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
                {links.prev && (
                    <Link href={links.prev}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400">
                        ← Précédent
                    </Link>
                )}
                {links.next && (
                    <Link href={links.next}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400">
                        Suivant →
                    </Link>
                )}
            </div>
        </div>
    );
}

/* ─── Page ─── */
export default function StockShow({ product, movements }) {
    const items = movements?.data ?? [];
    const meta = movements?.meta ?? null;
    const links = movements?.links ?? {};

    const totalIn = items.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0);
    const totalOut = items.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0);

    return (
        <AppLayout title={`Stock — ${product.name}`}>
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

                {/* ── Back + Header ── */}
                <div>
                    <Link href={route('admin.stock.index')}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors">
                        <ArrowLeft size={15} /> Retour au stock
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Package size={22} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{product.category_label}</p>
                            </div>
                        </div>
                        {product.is_low_stock && (
                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl text-sm text-orange-700 dark:text-orange-300">
                                <AlertTriangle size={15} />
                                Stock bas — réapprovisionner
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Info produit ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Stock actuel', value: `${fmt(product.current_quantity)} ${product.unit}`, highlight: product.is_low_stock },
                        { label: 'Seuil alerte', value: `${fmt(product.min_quantity)} ${product.unit}` },
                        { label: 'Entrées (page)', value: `+${fmt(totalIn)} ${product.unit}` },
                        { label: 'Sorties (page)', value: `−${fmt(totalOut)} ${product.unit}` },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                            <p className={clsx('font-bold text-lg', kpi.highlight ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white')}>
                                {kpi.value}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Détails produit ── */}
                {(product.supplier || product.sku || product.description) && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        {product.supplier && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Fournisseur</p>
                                <p className="text-gray-700 dark:text-gray-300">{product.supplier}</p>
                            </div>
                        )}
                        {product.sku && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">SKU</p>
                                <p className="text-gray-700 dark:text-gray-300 font-mono">{product.sku}</p>
                            </div>
                        )}
                        {product.description && (
                            <div className="sm:col-span-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Description</p>
                                <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Historique mouvements ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Historique des mouvements</h2>
                    </div>

                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <RefreshCw size={32} className="mb-3 opacity-40" />
                            <p className="font-medium">Aucun mouvement enregistré</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Quantité</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Note / Référence</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Source</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right hidden lg:table-cell">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(m => (
                                            <MovementRow key={m.id} movement={m} unit={product.unit} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination meta={meta} links={links} />
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
