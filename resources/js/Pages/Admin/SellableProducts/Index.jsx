import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Package, Plus, Pencil, Trash2, TrendingDown, TrendingUp,
    AlertTriangle, RefreshCw, History, X, Filter, Barcode,
} from 'lucide-react';
import clsx from 'clsx';

/* ─── Helpers ─── */
const UNITS = ['unité', 'pièce', 'boîte', 'pack', 'bouteille', 'flacon', 'bidon', 'carton', 'kg', 'g', 'L', 'mL'];
const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

function fmt(n) { return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
function fmtMAD(cents) { return (cents / 100).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'; }

/* ─── ProductForm ─── */
function ProductForm({ initial = {}, onCancel }) {
    const isEdit = !!initial.id;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: initial.name ?? '',
        barcode: initial.barcode ?? '',
        description: initial.description ?? '',
        purchase_price_cents: initial.purchase_price_cents ?? 0,
        selling_price_cents: initial.selling_price_cents ?? 0,
        current_stock: initial.current_stock ?? 0,
        alert_threshold: initial.alert_threshold ?? 5,
        unit: initial.unit ?? 'unité',
        is_active: initial.is_active ?? true,
    });

    // Convert cents to MAD for display
    const purchasePriceMAD = data.purchase_price_cents / 100;
    const sellingPriceMAD = data.selling_price_cents / 100;

    function submit(e) {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onCancel?.(); } };
        if (isEdit) put(route('admin.sellable-products.update', initial.id), opts);
        else post(route('admin.sellable-products.store'), opts);
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className={labelCls}>Nom du produit *</label>
                    <input className={clsx(inputCls, errors.name && 'border-red-500')} value={data.name}
                        onChange={e => setData('name', e.target.value)} placeholder="Ex: Désodorisant voiture" />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className={labelCls}>Code-barres (EAN/UPC)</label>
                    <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input className={clsx(inputCls, 'pl-9', errors.barcode && 'border-red-500')} value={data.barcode}
                            onChange={e => setData('barcode', e.target.value)} placeholder="6111234567890" />
                    </div>
                    {errors.barcode && <p className="text-xs text-red-500 mt-1">{errors.barcode}</p>}
                </div>
                <div>
                    <label className={labelCls}>Unité *</label>
                    <select className={inputCls} value={data.unit} onChange={e => setData('unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Prix d'achat (MAD) *</label>
                    <input type="number" min="0" step="0.01" className={inputCls}
                        value={purchasePriceMAD}
                        onChange={e => setData('purchase_price_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                        placeholder="50.00" />
                </div>
                <div>
                    <label className={labelCls}>Prix de vente (MAD) *</label>
                    <input type="number" min="0" step="0.01" className={inputCls}
                        value={sellingPriceMAD}
                        onChange={e => setData('selling_price_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                        placeholder="80.00" />
                </div>
                {!isEdit && (
                    <div>
                        <label className={labelCls}>Stock initial</label>
                        <input type="number" min="0" step="1" className={inputCls} value={data.current_stock}
                            onChange={e => setData('current_stock', parseFloat(e.target.value) || 0)} />
                    </div>
                )}
                <div>
                    <label className={labelCls}>Seuil d'alerte</label>
                    <input type="number" min="0" step="1" className={clsx(inputCls, errors.alert_threshold && 'border-red-500')}
                        value={data.alert_threshold} onChange={e => setData('alert_threshold', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>Description</label>
                    <textarea className={inputCls} rows={2} value={data.description}
                        onChange={e => setData('description', e.target.value)} placeholder="Description optionnelle..." />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={data.is_active}
                        onChange={e => setData('is_active', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Produit actif</label>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Annuler</button>
                <button type="submit" disabled={processing}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                    {processing ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer'}
                </button>
            </div>
        </form>
    );
}

/* ─── MovementModal ─── */
function MovementModal({ product, onClose }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'in',
        quantity: '',
        note: '',
        reference: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.sellable-products.movement', product.id), { onSuccess: () => { reset(); onClose(); } });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Mouvement de stock</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{product.name}</span>
                        <br />Stock actuel : <span className="font-medium">{fmt(product.current_stock)} {product.unit}</span>
                    </div>
                    <div>
                        <label className={labelCls}>Type de mouvement</label>
                        <select className={inputCls} value={data.type} onChange={e => setData('type', e.target.value)}>
                            <option value="in">Entrée (achat)</option>
                            <option value="out">Sortie (perte/usage)</option>
                            <option value="adjustment">Ajustement (inventaire)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>
                            {data.type === 'adjustment' ? 'Nouvelle quantité' : 'Quantité'}
                        </label>
                        <input type="number" min="0" step="0.01"
                            className={clsx(inputCls, errors.quantity && 'border-red-500')}
                            value={data.quantity} onChange={e => setData('quantity', e.target.value)}
                            placeholder={data.type === 'adjustment' ? 'Ex: 15' : 'Ex: 10'} />
                        {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>Note</label>
                        <input className={inputCls} value={data.note} onChange={e => setData('note', e.target.value)}
                            placeholder="Ex: Achat fournisseur" />
                    </div>
                    <div>
                        <label className={labelCls}>Référence (facture, BL…)</label>
                        <input className={inputCls} value={data.reference} onChange={e => setData('reference', e.target.value)}
                            placeholder="Ex: FAC-2024-001" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Annuler</button>
                        <button type="submit" disabled={processing}
                            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                            {processing ? 'Enregistrement…' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Main Index ─── */
export default function Index({ products, lowStockCount, filters }) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [movementProduct, setMovementProduct] = useState(null);
    const [search, setSearch] = useState(filters?.q ?? '');
    const [lowStockOnly, setLowStockOnly] = useState(filters?.low_stock ?? false);

    function applyFilters() {
        router.get(route('admin.sellable-products.index'), {
            q: search || undefined,
            low_stock: lowStockOnly || undefined,
        }, { preserveState: true });
    }

    function handleDelete(p) {
        if (confirm(`Supprimer « ${p.name} » ?`)) {
            router.delete(route('admin.sellable-products.destroy', p.id));
        }
    }

    return (
        <AppLayout title="Produits à vendre">
            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="text-blue-600" size={28} /> Produits à vendre
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {products.length} produit{products.length > 1 ? 's' : ''}
                            {lowStockCount > 0 && (
                                <span className="ml-2 text-amber-600 font-medium">
                                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                                    {lowStockCount} en stock bas
                                </span>
                            )}
                        </p>
                    </div>
                    <button onClick={() => { setShowForm(true); setEditing(null); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm">
                        <Plus size={18} /> Nouveau produit
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-4 shadow-sm border border-gray-200 dark:border-slate-700">
                    <div className="flex-1 min-w-[200px]">
                        <label className={labelCls}>Recherche</label>
                        <input className={inputCls} placeholder="Nom ou code-barres…" value={search}
                            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                        Stock bas uniquement
                    </label>
                    <button onClick={applyFilters}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-sm font-semibold flex items-center gap-1.5">
                        <Filter size={16} /> Filtrer
                    </button>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-200 dark:border-slate-700 p-5 mb-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                            {editing ? 'Modifier le produit' : 'Nouveau produit'}
                        </h3>
                        <ProductForm initial={editing ?? {}} onCancel={() => { setShowForm(false); setEditing(null); }} />
                    </div>
                )}

                {/* Products Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Produit</th>
                                    <th className="px-4 py-3 text-left font-semibold">Code-barres</th>
                                    <th className="px-4 py-3 text-right font-semibold">Prix achat</th>
                                    <th className="px-4 py-3 text-right font-semibold">Prix vente</th>
                                    <th className="px-4 py-3 text-right font-semibold">Stock</th>
                                    <th className="px-4 py-3 text-right font-semibold">Seuil</th>
                                    <th className="px-4 py-3 text-center font-semibold">Marge</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {products.map(p => (
                                    <tr key={p.id} className={clsx(
                                        'hover:bg-gray-50 dark:hover:bg-slate-700/50',
                                        !p.is_active && 'opacity-50'
                                    )}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {p.is_low_stock && (
                                                    <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                                            </div>
                                            {p.description && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{p.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                            {p.barcode || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                                            {fmtMAD(p.purchase_price_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                            {fmtMAD(p.selling_price_cents)}
                                        </td>
                                        <td className={clsx(
                                            'px-4 py-3 text-right font-medium',
                                            p.is_low_stock ? 'text-amber-600' : 'text-gray-900 dark:text-white'
                                        )}>
                                            {fmt(p.current_stock)} {p.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                                            {fmt(p.alert_threshold)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={clsx(
                                                'inline-block px-2 py-0.5 rounded-full text-xs font-semibold',
                                                p.profit_cents > 0
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            )}>
                                                {p.profit_cents > 0 ? '+' : ''}{fmtMAD(p.profit_cents)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setMovementProduct(p)} title="Mouvement de stock"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                                    <RefreshCw size={16} />
                                                </button>
                                                <button onClick={() => router.visit(route('admin.sellable-products.movements', p.id))} title="Historique"
                                                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                                                    <History size={16} />
                                                </button>
                                                <button onClick={() => { setEditing(p); setShowForm(true); }} title="Modifier"
                                                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(p)} title="Supprimer"
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                            <Package className="mx-auto mb-2" size={32} />
                                            Aucun produit trouvé
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Movement Modal */}
                {movementProduct && (
                    <MovementModal product={movementProduct} onClose={() => setMovementProduct(null)} />
                )}
            </div>
        </AppLayout>
    );
}
