import AppLayout from '@/Layouts/AppLayout';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag, ToggleLeft, ToggleRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatMAD } from '@/utils/format';

/* ─── Badge statut ─── */
function StatusBadge({ promo }) {
    const now = new Date();
    const from = promo.valid_from ? new Date(promo.valid_from) : null;
    const until = promo.valid_until ? new Date(promo.valid_until) : null;
    const exhausted = promo.max_uses && promo.used_count >= promo.max_uses;

    if (!promo.is_active)
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"><XCircle size={12} /> Désactivé</span>;
    if (exhausted)
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><Clock size={12} /> Épuisé</span>;
    if (until && now > until)
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle size={12} /> Expiré</span>;
    if (from && now < from)
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"><Clock size={12} /> Planifié</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"><CheckCircle2 size={12} /> Actif</span>;
}

/* ─── Valeur remise ─── */
function DiscountBadge({ promo }) {
    return (
        <span className="inline-flex items-center gap-1 font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg text-sm">
            <Tag size={13} />
            {promo.type === 'percent' ? `${promo.value}%` : formatMAD(promo.value)}
        </span>
    );
}

/* ─── Formulaire (create / edit) ─── */
function PromoForm({ initial = {}, onSuccess, onCancel }) {
    const isEdit = !!initial.id;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        code: initial.code ?? '',
        label: initial.label ?? '',
        type: initial.type ?? 'percent',
        value: initial.value ?? 10,
        min_amount_cents: initial.min_amount_cents ?? 0,
        max_uses: initial.max_uses ?? '',
        is_active: initial.is_active ?? true,
        valid_from: initial.valid_from ? initial.valid_from.substring(0, 10) : '',
        valid_until: initial.valid_until ? initial.valid_until.substring(0, 10) : '',
    });

    function submit(e) {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onSuccess?.(); } };
        if (isEdit) put(route('admin.promotions.update', initial.id), opts);
        else post(route('admin.promotions.store'), opts);
    }

    const inputCls = 'w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none';
    const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Code promo *</label>
                    <input type="text" placeholder="ETE25" value={data.code}
                        onChange={e => setData('code', e.target.value.toUpperCase())}
                        className={clsx(inputCls, 'uppercase font-mono tracking-widest')} />
                    {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>
                <div>
                    <label className={labelCls}>Description</label>
                    <input type="text" placeholder="Offre été 25%" value={data.label}
                        onChange={e => setData('label', e.target.value)}
                        className={inputCls} />
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                    <label className={labelCls}>Type *</label>
                    <select value={data.type} onChange={e => setData('type', e.target.value)}
                        className={inputCls}>
                        <option value="percent">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (MAD)</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>{data.type === 'percent' ? 'Valeur (%)' : 'Montant (centimes)'} *</label>
                    <input type="number" min={1} value={data.value}
                        onChange={e => setData('value', parseInt(e.target.value) || 0)}
                        className={inputCls} />
                    {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                </div>
                <div>
                    <label className={labelCls}>Min. commande (centimes)</label>
                    <input type="number" min={0} value={data.min_amount_cents}
                        onChange={e => setData('min_amount_cents', parseInt(e.target.value) || 0)}
                        className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Limite d'utilisations</label>
                    <input type="number" min={1} placeholder="Illimité" value={data.max_uses}
                        onChange={e => setData('max_uses', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                        className={inputCls} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Valide du</label>
                    <input type="date" value={data.valid_from}
                        onChange={e => setData('valid_from', e.target.value)}
                        className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Valide jusqu'au</label>
                    <input type="date" value={data.valid_until}
                        onChange={e => setData('valid_until', e.target.value)}
                        className={inputCls} />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button type="button"
                    onClick={() => setData('is_active', !data.is_active)}
                    className={clsx('flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-colors',
                        data.is_active
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                    )}>
                    {data.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {data.is_active ? 'Actif' : 'Inactif'}
                </button>
            </div>

            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="flex-1 border border-gray-300 dark:border-slate-600 dark:text-gray-300 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                        Annuler
                    </button>
                )}
                <button type="submit" disabled={processing}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
                    {processing ? '…' : isEdit ? '✓ Mettre à jour' : '+ Créer la promotion'}
                </button>
            </div>
        </form>
    );
}

/* ─── Page principale ─── */
export default function PromotionsIndex({ promotions }) {
    const [showCreate, setShowCreate] = useState(false);
    const [editId, setEditId] = useState(null);

    function handleToggle(promo) {
        router.put(route('admin.promotions.update', promo.id), {
            ...promo,
            valid_from: promo.valid_from ? promo.valid_from.substring(0, 10) : '',
            valid_until: promo.valid_until ? promo.valid_until.substring(0, 10) : '',
            max_uses: promo.max_uses ?? '',
            is_active: !promo.is_active,
        }, { preserveScroll: true });
    }

    function handleDelete(id) {
        if (!confirm('Supprimer cette promotion ?')) return;
        router.delete(route('admin.promotions.destroy', id), { preserveScroll: true });
    }

    const activeCount = promotions.filter(p => p.is_active).length;

    return (
        <AppLayout title="Promotions & codes promo">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promotions & codes promo</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {promotions.length} code{promotions.length !== 1 ? 's' : ''} · {activeCount} actif{activeCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowCreate(v => !v); setEditId(null); }}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Nouveau code promo
                    </button>
                </div>

                {/* Formulaire création */}
                {showCreate && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Nouveau code promo</h2>
                        <PromoForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
                    </div>
                )}

                {/* Liste */}
                {promotions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-12 text-center">
                        <Tag size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun code promo</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Créez votre première promotion ci-dessus.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {promotions.map(promo => (
                            <div key={promo.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                {/* Ligne principale */}
                                <div className="flex items-center gap-4 p-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                                        <Tag size={22} className="text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono font-bold text-base text-gray-900 dark:text-white tracking-wider">{promo.code}</span>
                                            <DiscountBadge promo={promo} />
                                            <StatusBadge promo={promo} />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            {promo.label && <span>{promo.label} · </span>}
                                            {promo.min_amount_cents > 0 && <span>Min {formatMAD(promo.min_amount_cents)} · </span>}
                                            {promo.max_uses ? (
                                                <span>{promo.used_count}/{promo.max_uses} utilisations</span>
                                            ) : (
                                                <span>Utilisations illimitées</span>
                                            )}
                                            {promo.valid_until && (
                                                <span> · Expire le {new Date(promo.valid_until).toLocaleDateString('fr-FR')}</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleToggle(promo)}
                                            title={promo.is_active ? 'Désactiver' : 'Activer'}
                                            className={clsx('p-2 rounded-lg transition-colors',
                                                promo.is_active
                                                    ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                                                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                            )}
                                        >
                                            {promo.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button
                                            onClick={() => setEditId(editId === promo.id ? null : promo.id)}
                                            className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(promo.id)}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Inline edit form */}
                                {editId === promo.id && (
                                    <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-700/40">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Modifier le code</h3>
                                        <PromoForm
                                            initial={promo}
                                            onSuccess={() => setEditId(null)}
                                            onCancel={() => setEditId(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
