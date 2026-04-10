import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ShoppingCart, Plus, Trash2, ChevronLeft, Save } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

function fmt(cents) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format((cents ?? 0) / 100) + ' MAD';
}

const emptyItem = () => ({
    stock_product_id: '',
    product_name: '',
    quantity: 1,
    unit: 'unité',
    unit_price_cents: 0,
});

export default function PurchasesCreate({ suppliers, products, statuses }) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        reference: '',
        purchased_at: new Date().toISOString().slice(0, 10),
        status: 'draft',
        notes: '',
        items: [emptyItem()],
    });

    function setItem(i, field, value) {
        const items = [...data.items];
        items[i] = { ...items[i], [field]: value };
        // Auto-fill name when product selected
        if (field === 'stock_product_id' && value) {
            const prod = products.find(p => String(p.id) === String(value));
            if (prod) {
                items[i].product_name = prod.name;
                items[i].unit = prod.unit;
                items[i].unit_price_cents = prod.cost_price_cents ?? 0;
            }
        }
        // Recalc total
        items[i].total_cents = Math.round(
            parseFloat(items[i].quantity || 0) * parseInt(items[i].unit_price_cents || 0)
        );
        setData('items', items);
    }

    function addItem() { setData('items', [...data.items, emptyItem()]); }
    function removeItem(i) { setData('items', data.items.filter((_, idx) => idx !== i)); }

    const grandTotal = data.items.reduce((s, it) =>
        s + Math.round(parseFloat(it.quantity || 0) * parseInt(it.unit_price_cents || 0)), 0
    );

    function submit(e) {
        e.preventDefault();
        post(route('admin.purchases.store'));
    }

    return (
        <AppLayout title="Nouvel achat">
            <Head title="Nouvel achat" />
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.purchases.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                        <ChevronLeft size={18} />
                    </Link>
                    <ShoppingCart size={20} className="text-blue-600" />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Nouvel achat fournisseur</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Infos générales */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Informations générales</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Fournisseur</label>
                                <select className={inputCls} value={data.supplier_id}
                                    onChange={e => setData('supplier_id', e.target.value)}>
                                    <option value="">— Sans fournisseur —</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Référence / N° bon de commande</label>
                                <input className={inputCls} value={data.reference}
                                    onChange={e => setData('reference', e.target.value)}
                                    placeholder="Ex: BC-2026-001" />
                            </div>
                            <div>
                                <label className={labelCls}>Date d'achat *</label>
                                <input type="date" className={clsx(inputCls, errors.purchased_at && 'border-red-500')}
                                    value={data.purchased_at}
                                    onChange={e => setData('purchased_at', e.target.value)} />
                                {errors.purchased_at && <p className="text-xs text-red-500 mt-1">{errors.purchased_at}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Statut</label>
                                <select className={inputCls} value={data.status}
                                    onChange={e => setData('status', e.target.value)}>
                                    {Object.entries(statuses).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Notes</label>
                                <textarea className={inputCls} rows={2} value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Conditions, remarques…" />
                            </div>
                        </div>
                    </div>

                    {/* Lignes d'articles */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Articles</h2>
                            <button type="button" onClick={addItem}
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                <Plus size={14} /> Ajouter une ligne
                            </button>
                        </div>

                        {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}

                        <div className="space-y-3">
                            {data.items.map((item, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                    {/* Produit catalogue */}
                                    <div className="col-span-12 sm:col-span-4">
                                        {i === 0 && <label className={labelCls}>Produit stock</label>}
                                        <select className={inputCls} value={item.stock_product_id}
                                            onChange={e => setItem(i, 'stock_product_id', e.target.value)}>
                                            <option value="">— Libre —</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    {/* Désignation */}
                                    <div className="col-span-12 sm:col-span-3">
                                        {i === 0 && <label className={labelCls}>Désignation *</label>}
                                        <input className={inputCls} value={item.product_name}
                                            onChange={e => setItem(i, 'product_name', e.target.value)}
                                            placeholder="Nom du produit" />
                                    </div>
                                    {/* Qté */}
                                    <div className="col-span-4 sm:col-span-1">
                                        {i === 0 && <label className={labelCls}>Qté</label>}
                                        <input type="number" step="0.001" min="0.001" className={inputCls}
                                            value={item.quantity}
                                            onChange={e => setItem(i, 'quantity', e.target.value)} />
                                    </div>
                                    {/* Unité */}
                                    <div className="col-span-4 sm:col-span-1">
                                        {i === 0 && <label className={labelCls}>Unité</label>}
                                        <input className={inputCls} value={item.unit}
                                            onChange={e => setItem(i, 'unit', e.target.value)} />
                                    </div>
                                    {/* Prix unitaire */}
                                    <div className="col-span-4 sm:col-span-2">
                                        {i === 0 && <label className={labelCls}>P.U. (centimes)</label>}
                                        <input type="number" min="0" className={inputCls}
                                            value={item.unit_price_cents}
                                            onChange={e => setItem(i, 'unit_price_cents', e.target.value)} />
                                    </div>
                                    {/* Total ligne + suppr */}
                                    <div className="col-span-12 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 sm:hidden">
                                            {fmt(Math.round(item.quantity * item.unit_price_cents))}
                                        </span>
                                        {data.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(i)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="mt-4 flex justify-end">
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{fmt(grandTotal)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Link href={route('admin.purchases.index')}
                            className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition">
                            Annuler
                        </Link>
                        <button type="submit" disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                            <Save size={15} />
                            {processing ? 'Enregistrement…' : 'Enregistrer l\'achat'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
