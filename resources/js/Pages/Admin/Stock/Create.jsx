import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Package, ChevronLeft, Save } from 'lucide-react';
import clsx from 'clsx';

const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

const CATEGORIES = [
    { value: 'produit_chimique', label: 'Produit chimique' },
    { value: 'consommable', label: 'Consommable' },
    { value: 'outil', label: 'Outil / Matériel' },
    { value: 'autre', label: 'Autre' },
];
const UNITS = ['L', 'mL', 'kg', 'g', 'unité', 'rouleau', 'bidon', 'carton', 'seau', 'boîte'];

export default function StockCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        category: 'produit_chimique',
        unit: 'L',
        current_quantity: 0,
        min_quantity: 1,
        cost_price_cents: 0,
        supplier: '',
        sku: '',
        is_active: true,
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.stock.store'), {
            onSuccess: () => window.location.href = route('admin.stock.index'),
        });
    }

    return (
        <AppLayout title="Nouveau produit">
            <Head title="Nouveau produit stock" />
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.stock.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                        <ChevronLeft size={18} />
                    </Link>
                    <Package size={20} className="text-blue-600" />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Nouveau produit stock</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Informations produit</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Nom du produit *</label>
                                <input className={clsx(inputCls, errors.name && 'border-red-500')}
                                    value={data.name} onChange={e => setData('name', e.target.value)}
                                    placeholder="Ex: Shampoing carrosserie" />
                                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Description</label>
                                <textarea className={inputCls} rows={2} value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Description courte…" />
                            </div>
                            <div>
                                <label className={labelCls}>Catégorie *</label>
                                <select className={inputCls} value={data.category}
                                    onChange={e => setData('category', e.target.value)}>
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Unité *</label>
                                <select className={inputCls} value={data.unit}
                                    onChange={e => setData('unit', e.target.value)}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Stock initial</label>
                                <input type="number" step="0.001" min="0" className={inputCls}
                                    value={data.current_quantity}
                                    onChange={e => setData('current_quantity', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Seuil d'alerte</label>
                                <input type="number" step="0.001" min="0" className={inputCls}
                                    value={data.min_quantity}
                                    onChange={e => setData('min_quantity', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Prix de revient (centimes)</label>
                                <input type="number" min="0" className={inputCls}
                                    value={data.cost_price_cents}
                                    onChange={e => setData('cost_price_cents', e.target.value)} />
                                <p className="text-xs text-gray-400 mt-0.5">
                                    = {(data.cost_price_cents / 100).toFixed(2)} MAD
                                </p>
                            </div>
                            <div>
                                <label className={labelCls}>SKU / Référence</label>
                                <input className={inputCls} value={data.sku}
                                    onChange={e => setData('sku', e.target.value)}
                                    placeholder="Référence interne" />
                                {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku}</p>}
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Fournisseur habituel</label>
                                <input className={inputCls} value={data.supplier}
                                    onChange={e => setData('supplier', e.target.value)}
                                    placeholder="Nom du fournisseur" />
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="is_active" checked={data.is_active}
                                    onChange={e => setData('is_active', e.target.checked)}
                                    className="rounded border-gray-300" />
                                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Produit actif</label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Link href={route('admin.stock.index')}
                            className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition">
                            Annuler
                        </Link>
                        <button type="submit" disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                            <Save size={15} />
                            {processing ? 'Création…' : 'Créer le produit'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
