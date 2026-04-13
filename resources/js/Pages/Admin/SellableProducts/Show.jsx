import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import DOMPurify from 'dompurify';
import { ArrowLeft, Package, TrendingUp, TrendingDown, RefreshCw, User } from 'lucide-react';
import clsx from 'clsx';

function fmt(n) { return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
function fmtMAD(cents) { return (cents / 100).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'; }
function fmtDate(d) { return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

const TYPE_STYLES = {
    in: { icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', label: 'Entrée' },
    out: { icon: TrendingDown, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', label: 'Sortie' },
    adjustment: { icon: RefreshCw, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', label: 'Ajustement' },
};

export default function Show({ product, movements }) {
    return (
        <AppLayout title={`Stock - ${product.name}`}>
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                    <Link href={route('admin.sellable-products.index')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl">
                        <ArrowLeft size={20} className="text-gray-500" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="text-blue-600" size={24} />
                            {product.name}
                        </h1>
                        {product.barcode && (
                            <p className="text-sm text-gray-500 font-mono mt-1">Code-barres: {product.barcode}</p>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Stock actuel</p>
                        <p className={clsx(
                            'text-2xl font-bold mt-1',
                            product.is_low_stock ? 'text-amber-600' : 'text-gray-900 dark:text-white'
                        )}>
                            {fmt(product.current_stock)} <span className="text-sm font-normal">{product.unit}</span>
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Seuil d'alerte</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {fmt(product.alert_threshold)} <span className="text-sm font-normal">{product.unit}</span>
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Prix d'achat</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {fmtMAD(product.purchase_price_cents)}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Prix de vente</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                            {fmtMAD(product.selling_price_cents)}
                        </p>
                    </div>
                </div>

                {/* Movements Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-4 border-b dark:border-slate-700">
                        <h2 className="font-bold text-gray-900 dark:text-white">Historique des mouvements</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                                    <th className="px-4 py-3 text-right font-semibold">Quantité</th>
                                    <th className="px-4 py-3 text-left font-semibold">Note</th>
                                    <th className="px-4 py-3 text-left font-semibold">Utilisateur</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {movements.data.map(m => {
                                    const style = TYPE_STYLES[m.type] || TYPE_STYLES.adjustment;
                                    const Icon = style.icon;
                                    return (
                                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {fmtDate(m.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={clsx(
                                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                                                    style.color
                                                )}>
                                                    <Icon size={14} />
                                                    {style.label}
                                                    {m.is_free && ' (gratuit)'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                                {m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''}{fmt(m.quantity)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {m.note || '—'}
                                                {m.reference && (
                                                    <span className="text-xs text-gray-400 ml-2">({m.reference})</span>
                                                )}
                                                {m.ticket && (
                                                    <span className="text-xs text-blue-500 ml-2">Ticket #{m.ticket.ticket_number}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                {m.user ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <User size={14} className="text-gray-400" />
                                                        {m.user.name}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {movements.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                            Aucun mouvement enregistré
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {movements.last_page > 1 && (
                        <div className="px-5 py-4 border-t dark:border-slate-700 flex justify-center gap-2">
                            {movements.links.filter(l => l.url).map((link, i) => (
                                <Link key={i} href={link.url}
                                    className={clsx(
                                        'px-3 py-1 rounded-lg text-sm',
                                        link.active
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'
                                    )}
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(link.label) }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
