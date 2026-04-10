import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FileText, ChevronLeft, Plus, Trash2, Save } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

const emptyLine = () => ({ service_id: '', description: '', quantity: 1, unit_price_cents: 0 });

export default function QuotesCreate({ clients, services }) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: '',
        notes: '',
        valid_until: '',
        tax_rate: '20',
        billing_name: '',
        billing_ice: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.quotes.store'), {
            onSuccess: () => window.location.href = route('admin.quotes.index'),
        });
    }

    return (
        <AppLayout title="Créer un devis">
            <Head title="Nouveau devis" />
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={route('admin.quotes.index')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                        <ChevronLeft size={18} />
                    </Link>
                    <FileText size={20} className="text-indigo-600" />
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Nouveau devis</h1>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Informations</h2>

                        <div>
                            <label className={labelCls}>Client *</label>
                            <select className={clsx(inputCls, errors.client_id && 'border-red-500')}
                                value={data.client_id} onChange={e => setData('client_id', e.target.value)}>
                                <option value="">— Sélectionner un client —</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.is_company && c.ice ? ` (ICE: ${c.ice})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.client_id && <p className="text-xs text-red-500 mt-1">{errors.client_id}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Valable jusqu'au</label>
                                <input type="date" className={inputCls} value={data.valid_until}
                                    onChange={e => setData('valid_until', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>TVA (%)</label>
                                <input type="number" min="0" max="100" className={inputCls}
                                    value={data.tax_rate}
                                    onChange={e => setData('tax_rate', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Nom facturation</label>
                                <input className={inputCls} value={data.billing_name}
                                    onChange={e => setData('billing_name', e.target.value)}
                                    placeholder="Raison sociale" />
                            </div>
                            <div>
                                <label className={labelCls}>ICE facturation</label>
                                <input className={inputCls} value={data.billing_ice}
                                    onChange={e => setData('billing_ice', e.target.value)}
                                    placeholder="ICE" />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Notes / Conditions</label>
                            <textarea className={inputCls} rows={3} value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                                placeholder="Conditions de paiement, remarques…" />
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
                        💡 Le devis sera créé en brouillon. Vous pourrez ajouter les lignes depuis la page de détail.
                    </p>

                    <div className="flex justify-end gap-3">
                        <Link href={route('admin.quotes.index')}
                            className="px-5 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition">
                            Annuler
                        </Link>
                        <button type="submit" disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition">
                            <Save size={15} />
                            {processing ? 'Création…' : 'Créer le devis'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
