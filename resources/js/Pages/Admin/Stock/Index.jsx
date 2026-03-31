import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Package, Plus, Pencil, Trash2, TrendingDown, TrendingUp,
    AlertTriangle, RefreshCw, History, ChevronDown, X, Filter,
} from 'lucide-react';
import clsx from 'clsx';

/* ─── Helpers ─── */
const CATEGORY_LABELS = {
    produit_chimique: 'Produit chimique',
    consommable: 'Consommable',
    outil: 'Outil / Matériel',
    autre: 'Autre',
};
const CATEGORY_COLORS = {
    produit_chimique: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    consommable: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    outil: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    autre: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};
const UNITS = ['L', 'mL', 'kg', 'g', 'unité', 'rouleau', 'bidon', 'carton', 'seau', 'boîte'];
const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

function fmt(n) { return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n); }
function fmtMAD(cents) { return (cents / 100).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'; }

/* ─── ProductForm ─── */
function ProductForm({ initial = {}, onCancel }) {
    const isEdit = !!initial.id;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: initial.name ?? '',
        description: initial.description ?? '',
        category: initial.category ?? 'produit_chimique',
        unit: initial.unit ?? 'L',
        current_quantity: initial.current_quantity ?? 0,
        min_quantity: initial.min_quantity ?? 1,
        cost_price_cents: initial.cost_price_cents ?? 0,
        supplier: initial.supplier ?? '',
        sku: initial.sku ?? '',
        is_active: initial.is_active ?? true,
    });

    function submit(e) {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onCancel?.(); } };
        if (isEdit) put(route('admin.stock.update', initial.id), opts);
        else post(route('admin.stock.store'), opts);
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className={labelCls}>Nom du produit *</label>
                    <input className={clsx(inputCls, errors.name && 'border-red-500')} value={data.name}
                        onChange={e => setData('name', e.target.value)} placeholder="Ex: Shampoing carrosserie" />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className={labelCls}>Catégorie *</label>
                    <select className={inputCls} value={data.category} onChange={e => setData('category', e.target.value)}>
                        {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Unité *</label>
                    <select className={inputCls} value={data.unit} onChange={e => setData('unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        <option value={data.unit === '' ? 'autre' : data.unit}>{!UNITS.includes(data.unit) ? data.unit : ''}</option>
                    </select>
                </div>
                {!isEdit && (
                    <div>
                        <label className={labelCls}>Quantité initiale</label>
                        <input type="number" min="0" step="0.001" className={inputCls} value={data.current_quantity}
                            onChange={e => setData('current_quantity', e.target.value)} />
                    </div>
                )}
                <div>
                    <label className={labelCls}>Seuil d'alerte</label>
                    <input type="number" min="0" step="0.001" className={clsx(inputCls, errors.min_quantity && 'border-red-500')}
                        value={data.min_quantity} onChange={e => setData('min_quantity', e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>Prix d'achat (centimes)</label>
                    <input type="number" min="0" className={inputCls} value={data.cost_price_cents}
                        onChange={e => setData('cost_price_cents', e.target.value)}
                        placeholder="Ex: 5000 = 50 MAD" />
                </div>
                <div>
                    <label className={labelCls}>Fournisseur</label>
                    <input className={inputCls} value={data.supplier} onChange={e => setData('supplier', e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>SKU / Référence</label>
                    <input className={inputCls} value={data.sku} onChange={e => setData('sku', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>Description</label>
                    <textarea rows={2} className={inputCls} value={data.description}
                        onChange={e => setData('description', e.target.value)} />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                    <input type="checkbox" id="is_active" checked={data.is_active}
                        onChange={e => setData('is_active', e.target.checked)}
                        className="rounded" />
                    <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Produit actif</label>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-gray-300 transition-colors">
                    Annuler
                </button>
                <button type="submit" disabled={processing}
                    className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {processing ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer le produit'}
                </button>
            </div>
        </form>
    );
}

/* ─── MovementForm ─── */
function MovementForm({ product, onCancel }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'in',
        quantity: '',
        note: '',
        reference: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.stock.movement', product.id), {
            onSuccess: () => { reset(); onCancel?.(); },
        });
    }

    const typeColors = { in: 'text-green-600', out: 'text-red-600', adjustment: 'text-blue-600' };
    const typeLabels = { in: 'Entrée (+)', out: 'Sortie (−)', adjustment: 'Ajustement (= nouvelle valeur)' };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Mouvement pour <span className="text-blue-600 dark:text-blue-400">{product.name}</span>
                {' '}— Stock actuel : <span className={clsx('font-bold', product.is_low_stock ? 'text-orange-500' : 'text-gray-900 dark:text-white')}>
                    {fmt(product.current_quantity)} {product.unit}
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Type *</label>
                    <select className={clsx(inputCls, typeColors[data.type])} value={data.type} onChange={e => setData('type', e.target.value)}>
                        {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>
                        {data.type === 'adjustment' ? `Nouvelle quantité (${product.unit})` : `Quantité (${product.unit}) *`}
                    </label>
                    <input type="number" min="0.001" step="0.001" className={clsx(inputCls, errors.quantity && 'border-red-500')}
                        value={data.quantity} onChange={e => setData('quantity', e.target.value)} />
                    {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                </div>
                <div>
                    <label className={labelCls}>Référence (BL, etc.)</label>
                    <input className={inputCls} value={data.reference} onChange={e => setData('reference', e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>Note</label>
                    <input className={inputCls} value={data.note} onChange={e => setData('note', e.target.value)} />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-gray-300">
                    Annuler
                </button>
                <button type="submit" disabled={processing}
                    className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60">
                    {processing ? '…' : 'Enregistrer'}
                </button>
            </div>
        </form>
    );
}

/* ─── Modal wrapper ─── */
function Modal({ open, title, onClose, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ─── ProductRow ─── */
function ProductRow({ product, onEdit, onMove, onDelete }) {
    return (
        <tr className={clsx(
            'border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors',
            product.is_low_stock && 'bg-orange-50/60 dark:bg-orange-900/10'
        )}>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {product.is_low_stock && (
                        <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
                    )}
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                        {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 hidden md:table-cell">
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', CATEGORY_COLORS[product.category])}>
                    {product.category_label}
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                <span className={clsx('font-bold text-sm', product.is_low_stock ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white')}>
                    {fmt(product.current_quantity)}
                </span>
                <span className="text-xs text-gray-400 ml-1">{product.unit}</span>
            </td>
            <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    min {fmt(product.min_quantity)} {product.unit}
                </span>
            </td>
            <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-500 dark:text-gray-400">
                {product.supplier || '—'}
            </td>
            <td className="px-4 py-3 hidden lg:table-cell text-sm text-right">
                {product.cost_price_cents > 0 ? fmtMAD(product.cost_price_cents) : '—'}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onMove(product)}
                        title="Mouvement de stock"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                        <RefreshCw size={15} />
                    </button>
                    <a href={route('admin.stock.movements', product.id)}
                        title="Historique"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <History size={15} />
                    </a>
                    <button onClick={() => onEdit(product)}
                        title="Modifier"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <Pencil size={15} />
                    </button>
                    <button onClick={() => onDelete(product)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 size={15} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ─── Page principale ─── */
export default function StockIndex({ products, lowStockCount, filters = {} }) {
    const [modal, setModal] = useState(null); // null | { type: 'create'|'edit'|'move'|'delete', product? }
    const [search, setSearch] = useState(filters.q ?? '');
    const [category, setCategory] = useState(filters.category ?? '');
    const [lowStockOnly, setLowStockOnly] = useState(filters.low_stock ?? false);

    function applyFilters(overrides = {}) {
        const params = {
            q: search || undefined,
            category: category || undefined,
            low_stock: lowStockOnly ? '1' : undefined,
            ...overrides,
        };
        router.get(route('admin.stock.index'), params, { preserveState: true, replace: true });
    }

    function handleDelete(product) {
        if (!confirm(`Supprimer « ${product.name} » ?`)) return;
        router.delete(route('admin.stock.destroy', product.id), {
            onSuccess: () => setModal(null),
        });
    }

    const totalValue = products.reduce((sum, p) => sum + (p.current_quantity * p.cost_price_cents), 0);

    return (
        <AppLayout title="Gestion du stock">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Package size={24} className="text-blue-600" />
                            Gestion du stock
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {products.length} produit{products.length !== 1 ? 's' : ''}
                            {lowStockCount > 0 && (
                                <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-medium">
                                    <AlertTriangle size={13} />
                                    {lowStockCount} en stock bas
                                </span>
                            )}
                        </p>
                    </div>
                    <button onClick={() => setModal({ type: 'create' })}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus size={16} />
                        Nouveau produit
                    </button>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Total produits', value: products.length,
                            icon: Package, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
                        },
                        {
                            label: 'En stock bas', value: lowStockCount,
                            icon: AlertTriangle, color: lowStockCount > 0
                                ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/30'
                                : 'text-gray-400 bg-gray-50 dark:bg-gray-700',
                        },
                        {
                            label: 'Valeur estimée (achat)',
                            value: fmtMAD(totalValue),
                            icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/30',
                            small: true,
                        },
                        {
                            label: 'Catégories',
                            value: new Set(products.map(p => p.category)).size,
                            icon: Filter, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
                        },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', kpi.color)}>
                                <kpi.icon size={18} />
                            </div>
                            <p className={clsx('font-bold text-gray-900 dark:text-white', kpi.small ? 'text-base' : 'text-2xl')}>{kpi.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Low stock alert banner ── */}
                {lowStockCount > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                        <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" />
                        <p className="text-sm text-orange-700 dark:text-orange-300 flex-1">
                            <span className="font-semibold">{lowStockCount} produit{lowStockCount > 1 ? 's' : ''}</span> en dessous du seuil d'alerte.
                        </p>
                        <button
                            onClick={() => { setLowStockOnly(true); applyFilters({ low_stock: '1' }); }}
                            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
                            Voir uniquement →
                        </button>
                    </div>
                )}

                {/* ── Filtres ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[180px]">
                            <label className={labelCls}>Recherche</label>
                            <input className={inputCls} placeholder="Nom, SKU, fournisseur…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()} />
                        </div>
                        <div className="w-44">
                            <label className={labelCls}>Catégorie</label>
                            <select className={inputCls} value={category} onChange={e => { setCategory(e.target.value); applyFilters({ category: e.target.value || undefined }); }}>
                                <option value="">Toutes</option>
                                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pb-0.5">
                            <input type="checkbox" id="low_stock" checked={lowStockOnly}
                                onChange={e => { setLowStockOnly(e.target.checked); applyFilters({ low_stock: e.target.checked ? '1' : undefined }); }}
                                className="rounded" />
                            <label htmlFor="low_stock" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
                                <TrendingDown size={14} className="text-orange-500" /> Stock bas seulement
                            </label>
                        </div>
                        <button onClick={() => applyFilters()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                            Filtrer
                        </button>
                        {(search || category || lowStockOnly) && (
                            <button onClick={() => { setSearch(''); setCategory(''); setLowStockOnly(false); router.get(route('admin.stock.index')); }}
                                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1">
                                <X size={14} /> Effacer
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Package size={40} className="mb-3 opacity-40" />
                            <p className="font-medium">Aucun produit trouvé</p>
                            <p className="text-sm mt-1">Créez votre premier produit de stock.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Produit</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Catégorie</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Quantité</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right hidden sm:table-cell">Seuil</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Fournisseur</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right hidden lg:table-cell">Prix achat</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <ProductRow
                                            key={product.id}
                                            product={product}
                                            onEdit={p => setModal({ type: 'edit', product: p })}
                                            onMove={p => setModal({ type: 'move', product: p })}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            <Modal open={modal?.type === 'create'} title="Nouveau produit" onClose={() => setModal(null)}>
                <ProductForm onCancel={() => setModal(null)} />
            </Modal>
            <Modal open={modal?.type === 'edit'} title="Modifier le produit" onClose={() => setModal(null)}>
                {modal?.product && <ProductForm initial={modal.product} onCancel={() => setModal(null)} />}
            </Modal>
            <Modal open={modal?.type === 'move'} title="Enregistrer un mouvement" onClose={() => setModal(null)}>
                {modal?.product && <MovementForm product={modal.product} onCancel={() => setModal(null)} />}
            </Modal>
        </AppLayout>
    );
}
