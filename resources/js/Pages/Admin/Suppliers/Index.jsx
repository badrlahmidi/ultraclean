import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Truck, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Phone, Mail, Building2, X } from 'lucide-react';
import clsx from 'clsx';

const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

function SupplierForm({ initial = {}, onCancel }) {
    const isEdit = !!initial.id;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: initial.name ?? '',
        contact_name: initial.contact_name ?? '',
        phone: initial.phone ?? '',
        email: initial.email ?? '',
        address: initial.address ?? '',
        ice: initial.ice ?? '',
        notes: initial.notes ?? '',
        is_active: initial.is_active ?? true,
    });

    function submit(e) {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onCancel?.(); } };
        if (isEdit) put(route('admin.suppliers.update', initial.id), opts);
        else post(route('admin.suppliers.store'), opts);
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className={labelCls}>Nom du fournisseur *</label>
                    <input className={clsx(inputCls, errors.name && 'border-red-500')}
                        value={data.name} onChange={e => setData('name', e.target.value)}
                        placeholder="Ex: Maroc Détergents SA" />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label className={labelCls}>Contact</label>
                    <input className={inputCls} value={data.contact_name}
                        onChange={e => setData('contact_name', e.target.value)}
                        placeholder="Nom du contact" />
                </div>
                <div>
                    <label className={labelCls}>Téléphone</label>
                    <input className={inputCls} value={data.phone}
                        onChange={e => setData('phone', e.target.value)}
                        placeholder="0600000000" />
                </div>
                <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} value={data.email}
                        onChange={e => setData('email', e.target.value)}
                        placeholder="contact@fournisseur.ma" />
                </div>
                <div>
                    <label className={labelCls}>ICE</label>
                    <input className={inputCls} value={data.ice}
                        onChange={e => setData('ice', e.target.value)}
                        placeholder="Identifiant commun entreprise" />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>Adresse</label>
                    <textarea className={inputCls} rows={2} value={data.address}
                        onChange={e => setData('address', e.target.value)}
                        placeholder="Adresse complète…" />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>Notes</label>
                    <textarea className={inputCls} rows={2} value={data.notes}
                        onChange={e => setData('notes', e.target.value)}
                        placeholder="Conditions, délais, remarques…" />
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_active" checked={data.is_active}
                        onChange={e => setData('is_active', e.target.checked)}
                        className="rounded border-gray-300" />
                    <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Actif</label>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t dark:border-slate-700">
                <button type="button" onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl">
                    Annuler
                </button>
                <button type="submit" disabled={processing}
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                    {isEdit ? 'Enregistrer' : 'Créer'}
                </button>
            </div>
        </form>
    );
}

export default function SuppliersIndex({ suppliers, stats, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState(null);

    function applyFilters(e) {
        e?.preventDefault();
        router.get(route('admin.suppliers.index'), { search }, { preserveState: true });
    }

    function destroy(id, name) {
        if (!confirm(`Supprimer « ${name} » ?`)) return;
        router.delete(route('admin.suppliers.destroy', id), { preserveScroll: true });
    }

    return (
        <AppLayout title="Fournisseurs">
            <Head title="Fournisseurs" />
            <div className="space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Truck size={20} className="text-blue-600" />
                        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Fournisseurs</h1>
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 font-medium">
                            {stats.total}
                        </span>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition touch-manipulation">
                        <Plus size={16} /> Nouveau fournisseur
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Actifs</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{stats.active}</p>
                    </div>
                </div>

                {/* Création inline */}
                {showCreate && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Nouveau fournisseur</h2>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <SupplierForm onCancel={() => setShowCreate(false)} />
                    </div>
                )}

                {/* Filtres */}
                <form onSubmit={applyFilters} className="flex gap-3 items-center flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Nom, téléphone, email…"
                            className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button type="submit"
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        Rechercher
                    </button>
                </form>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {suppliers.data.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Truck size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun fournisseur trouvé</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-700">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Fournisseur</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase hidden md:table-cell">Contact</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase hidden lg:table-cell">ICE</th>
                                        <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Achats</th>
                                        <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Statut</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {suppliers.data.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                            {editing?.id === s.id ? (
                                                <td colSpan={6} className="px-4 py-4">
                                                    <SupplierForm initial={editing}
                                                        onCancel={() => setEditing(null)} />
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{s.name}</p>
                                                        {s.address && <p className="text-xs text-gray-400 truncate max-w-[200px]">{s.address}</p>}
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell">
                                                        <div className="space-y-0.5">
                                                            {s.contact_name && <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1"><Building2 size={12} className="text-gray-400" /> {s.contact_name}</p>}
                                                            {s.phone && <p className="text-gray-500 flex items-center gap-1"><Phone size={12} className="text-gray-400" /> {s.phone}</p>}
                                                            {s.email && <p className="text-gray-500 flex items-center gap-1"><Mail size={12} className="text-gray-400" /> {s.email}</p>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 font-mono text-xs">{s.ice ?? '—'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{s.purchases_count}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {s.is_active
                                                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full"><CheckCircle size={11} /> Actif</span>
                                                            : <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"><XCircle size={11} /> Inactif</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => setEditing(s)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button onClick={() => destroy(s.id, s.name)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {suppliers.last_page > 1 && (
                    <div className="flex justify-center gap-2">
                        {suppliers.links.map((link, i) => (
                            <button key={i} disabled={!link.url || link.active}
                                onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                className={clsx('px-3 py-1.5 rounded-lg text-sm border transition',
                                    link.active
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40'
                                )}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(link.label) }} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
