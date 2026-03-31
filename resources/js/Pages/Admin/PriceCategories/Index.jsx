import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import clsx from 'clsx';

const EMOJI_SUGGESTIONS = ['🚗', '🚙', '🏍', '🚐', '🚚', '🚌', '🚕', '🏎'];

/* ─── Modal ajout / édition ─── */
function CategoryModal({ category, onClose }) {
    const isEdit = !!category;
    const [form, setForm] = useState({
        name: category?.name ?? '',
        icon: category?.icon ?? '🚗',
        sort_order: category?.sort_order ?? 0,
        is_active: category?.is_active ?? true,
    });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        const options = {
            onSuccess: onClose,
            onError: (errs) => { setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        };
        if (isEdit) {
            router.put(route('admin.price-categories.update', category.id), form, options);
        } else {
            router.post(route('admin.price-categories.store'), form, options);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-semibold text-gray-800">
                        {isEdit ? `Modifier « ${category.name} »` : 'Nouvelle catégorie'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">
                    {/* Icône */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Icône</label>
                        <div className="flex gap-2 flex-wrap mb-2">
                            {EMOJI_SUGGESTIONS.map(e => (
                                <button key={e} type="button" onClick={() => set('icon', e)}
                                    className={clsx(
                                        'w-9 h-9 text-xl rounded-lg border-2 flex items-center justify-center transition-all',
                                        form.icon === e ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                    )}>
                                    {e}
                                </button>
                            ))}
                        </div>
                        <input value={form.icon} onChange={e => set('icon', e.target.value)} maxLength={4}
                            placeholder="Ou saisir un emoji…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    {/* Nom */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                        <input value={form.name} onChange={e => set('name', e.target.value)} required
                            placeholder="Ex: Petite voiture"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    {/* Ordre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
                        <input type="number" min={0} value={form.sort_order}
                            onChange={e => set('sort_order', +e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    {/* Actif */}
                    {isEdit && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="cat_active" checked={form.is_active}
                                onChange={e => set('is_active', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600" />
                            <label htmlFor="cat_active" className="text-sm text-gray-700">Catégorie active</label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                            {processing ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Page principale ─── */
export default function PriceCategoriesIndex({ categories }) {
    const [modal, setModal] = useState(null); // null | 'create' | category

    const toggleActive = (cat) => {
        router.put(route('admin.price-categories.update', cat.id), {
            name: cat.name,
            icon: cat.icon,
            sort_order: cat.sort_order,
            is_active: !cat.is_active,
        });
    };

    const destroy = (cat) => {
        if (cat.service_prices_count > 0 || cat.ticket_services_count > 0) {
            alert(`Impossible : cette catégorie est utilisée par ${cat.service_prices_count} service(s) ou ${cat.ticket_services_count} ticket(s).`);
            return;
        }
        if (!confirm(`Supprimer « ${cat.name} » ?`)) return;
        router.delete(route('admin.price-categories.destroy', cat.id));
    };

    return (
        <AppLayout title="Catégories de prix">
            <Head title="Catégories de prix" />

            {modal && (
                <CategoryModal
                    category={modal === 'create' ? null : modal}
                    onClose={() => setModal(null)}
                />
            )}

            <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Catégories de prix</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Labels de taille utilisés pour la grille tarifaire des services
                        </p>
                    </div>
                    <button onClick={() => setModal('create')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Plus size={16} /> Nouvelle catégorie
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-600">Services liés</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-600">Tickets liés</th>
                                <th className="text-center px-3 py-3 font-medium text-gray-600">Statut</th>
                                <th className="text-right px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {categories.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Aucune catégorie</td></tr>
                            )}
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl leading-none">{cat.icon ?? '📦'}</span>
                                            <span className="font-medium text-gray-800">{cat.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={clsx(
                                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                                            cat.service_prices_count > 0
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-500'
                                        )}>
                                            {cat.service_prices_count}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={clsx(
                                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                                            cat.ticket_services_count > 0
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-gray-100 text-gray-500'
                                        )}>
                                            {cat.ticket_services_count}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <button onClick={() => toggleActive(cat)}
                                            className={clsx(
                                                'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all',
                                                cat.is_active
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                            )}>
                                            {cat.is_active ? <><Check size={11} /> Actif</> : 'Inactif'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => setModal(cat)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <Pencil size={15} />
                                            </button>
                                            <button onClick={() => destroy(cat)}
                                                disabled={cat.service_prices_count > 0 || cat.ticket_services_count > 0}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-gray-400">
                    💡 Ces catégories servent uniquement à définir la grille de prix des services. Elles ne sont plus attachées directement aux véhicules.
                </p>
            </div>
        </AppLayout>
    );
}
