import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { ShoppingCart, ChevronLeft, Package } from 'lucide-react';
import clsx from 'clsx';

const STATUS_COLORS = {
    draft: 'bg-gray-100 text-gray-600',
    confirmed: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

function fmt(cents) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format((cents ?? 0) / 100) + ' MAD';
}

export default function PurchasesShow({ purchase, statuses }) {
    return (
        <AppLayout title={`Achat #${purchase.reference ?? purchase.id}`}>
            <Head title={`Achat #${purchase.reference ?? purchase.id}`} />
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.purchases.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                        <ChevronLeft size={18} />
                    </Link>
                    <ShoppingCart size={20} className="text-blue-600" />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        Achat — {purchase.reference ?? `#${purchase.id}`}
                    </h1>
                    <span className={clsx('ml-auto px-3 py-1 rounded-full text-xs font-semibold', STATUS_COLORS[purchase.status])}>
                        {statuses[purchase.status]}
                    </span>
                </div>

                {/* Infos */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                    <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                            <dt className="text-xs font-semibold text-gray-500 uppercase">Fournisseur</dt>
                            <dd className="mt-1 font-medium text-gray-800 dark:text-gray-100">
                                {purchase.supplier?.name ?? <span className="text-gray-400 italic">—</span>}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-gray-500 uppercase">Date</dt>
                            <dd className="mt-1 text-gray-700 dark:text-gray-300">{purchase.purchased_at}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-gray-500 uppercase">Créé par</dt>
                            <dd className="mt-1 text-gray-700 dark:text-gray-300">{purchase.creator?.name ?? '—'}</dd>
                        </div>
                        {purchase.notes && (
                            <div className="col-span-2 sm:col-span-3">
                                <dt className="text-xs font-semibold text-gray-500 uppercase">Notes</dt>
                                <dd className="mt-1 text-gray-600 dark:text-gray-400">{purchase.notes}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Articles */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b dark:border-slate-700">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Package size={16} /> Articles ({purchase.items?.length ?? 0})
                        </h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Désignation</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qté</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">P.U.</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {(purchase.items ?? []).map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                                        {item.product_name}
                                        <span className="ml-1 text-gray-400 text-xs">({item.unit})</span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(item.unit_price_cents)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">{fmt(item.total_cents)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 dark:border-slate-600">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-lg text-gray-900 dark:text-gray-50">{fmt(purchase.total_cents)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
