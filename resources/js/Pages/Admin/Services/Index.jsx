import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Copy } from 'lucide-react';
import { formatMAD } from '@/utils/format';
import clsx from 'clsx';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import ActionButton from '@/Components/ActionButton';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#84CC16'];

function ColorPicker({ value, onChange }) {
    return (
        <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
                <button key={c} type="button" onClick={() => onChange(c)}
                    style={{ background: c }}
                    className={clsx('w-7 h-7 rounded-full border-2 transition-all',
                        value === c ? 'border-gray-800 scale-110' : 'border-transparent')} />
            ))}
            <input type="color" value={value} onChange={e => onChange(e.target.value)}
                className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer p-0.5" />
        </div>
    );
}

function ServiceModal({ service, vehicleTypes, onClose }) {
    const isEdit = !!service;
    const [form, setForm] = useState({
        name: service?.name ?? '',
        description: service?.description ?? '',
        color: service?.color ?? '#3B82F6',
        duration_minutes: service?.duration_minutes ?? 20,
        sort_order: service?.sort_order ?? 0,
        is_active: service?.is_active ?? true,
        price_type: service?.price_type ?? 'fixed',
        base_price_cents: service?.base_price_cents != null ? service.base_price_cents / 100 : '',
        prices: vehicleTypes.reduce((acc, vt) => {
            const p = service?.prices?.find(p => p.vehicle_type_id === vt.id);
            acc[vt.id] = p ? p.price_cents / 100 : '';
            return acc;
        }, {}),
    });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const copyPriceToAll = () => {
        const firstVal = Object.values(form.prices).find(v => v !== '');
        if (!firstVal) return;
        set('prices', vehicleTypes.reduce((acc, vt) => { acc[vt.id] = firstVal; return acc; }, {}));
    };

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        const payload = {
            ...form,
            base_price_cents: form.price_type === 'fixed' && form.base_price_cents !== ''
                ? Math.round(parseFloat(form.base_price_cents) * 100) : null,
            prices: Object.fromEntries(
                Object.entries(form.prices).map(([id, v]) => [id, v !== '' ? Math.round(parseFloat(v) * 100) : ''])
            ),
        };
        const opts = {
            onSuccess: onClose,
            onError: (errs) => { setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        };
        if (isEdit) router.put(route('admin.services.update', service.id), payload, opts);
        else router.post(route('admin.services.store'), payload, opts);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-semibold text-gray-800">
                        {isEdit ? `Modifier « ${service.name} »` : 'Nouveau service'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du service *</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} required
                        placeholder="Ex: Lavage Extérieur"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={form.description} onChange={e => set('description', e.target.value)}
                            rows={2} placeholder="Description courte…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min) *</label>
                            <input type="number" min={5} max={480} value={form.duration_minutes}
                                onChange={e => set('duration_minutes', +e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                            <input type="number" min={0} value={form.sort_order}
                                onChange={e => set('sort_order', +e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                        <ColorPicker value={form.color} onChange={v => set('color', v)} />
                    </div>

                    {/* ── Mode de tarification ── */}
                    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Mode de tarification *</label>
                        <div className="flex gap-3">
                            {[
                                { val: 'fixed', label: 'Prix unique', desc: 'Même prix quel que soit le véhicule' },
                                { val: 'variant', label: 'Prix variant', desc: 'Tarif différent par catégorie' },
                            ].map(opt => (
                                <label key={opt.val} className={clsx(
                                    'flex-1 flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                                    form.price_type === opt.val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                )}>
                                    <input type="radio" name="price_type" value={opt.val}
                                        checked={form.price_type === opt.val}
                                        onChange={() => set('price_type', opt.val)}
                                        className="mt-0.5 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                                        <p className="text-xs text-gray-500">{opt.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>                        {form.price_type === 'fixed' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Prix (MAD) *</label>
                                <div className="relative max-w-[160px]">
                                    <input type="number" min={0} step={0.5} placeholder="0"
                                        value={form.base_price_cents}
                                        onChange={e => set('base_price_cents', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">MAD</span>
                                </div>
                                {errors.base_price_cents && <p className="text-red-500 text-xs mt-1">{errors.base_price_cents}</p>}
                            </div>
                        )}

                        {form.price_type === 'variant' && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-medium text-gray-600">Prix par catégorie (MAD)</label>
                                    <button type="button" onClick={copyPriceToAll}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                                        <Copy size={11} /> Copier partout
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {vehicleTypes.map(vt => (
                                        <div key={vt.id} className="flex items-center gap-2">
                                            <span className="text-sm w-5 flex-shrink-0">{vt.icon ?? '🚗'}</span>
                                            <span className="text-xs text-gray-600 flex-1 truncate">{vt.name}</span>
                                            <div className="relative w-24 flex-shrink-0">
                                                <input type="number" min={0} step={0.5} placeholder="—"
                                                    value={form.prices[vt.id] ?? ''}
                                                    onChange={e => set('prices', { ...form.prices, [vt.id]: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">MAD</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_active_svc" checked={form.is_active}
                            onChange={e => set('is_active', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600" />
                        <label htmlFor="is_active_svc" className="text-sm text-gray-700">Service actif</label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                            {processing ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer le service')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ServicesIndex({ services, vehicleTypes }) {
    const [modal, setModal] = useState(null);

    const deleteService = (svc) => {
        if (!confirm(`Désactiver « ${svc.name} » ?`)) return;
        router.delete(route('admin.services.destroy', svc.id));
    };

    return (
        <AppLayout title="Services & Tarifs">
            <Head title="Services" />
            {modal && (
                <ServiceModal
                    service={modal === 'create' ? null : modal}
                    vehicleTypes={vehicleTypes}
                    onClose={() => setModal(null)}
                />
            )}            <PageHeader
                title="Catalogue de services"
                subtitle={`${services.length} service(s) configuré(s)`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Services & Tarifs' },
                ]}
            >
                <button
                    onClick={() => setModal('create')}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors touch-manipulation"
                >
                    <Plus size={16} /> Nouveau service
                </button>
            </PageHeader>

            <DataTable
                columns={[
                    { label: 'Service' },
                    { label: 'Tarification', align: 'center' },
                    { label: 'Durée', align: 'center' },
                    { label: 'Statut', align: 'center' },
                    { label: '', width: '80px' },
                ]}
                isEmpty={services.length === 0}
                emptyMessage="Aucun service configuré. Créez votre premier service."
            >
                {services.map(svc => (
                    <tr key={svc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: svc.color }} />
                                <div>
                                    <p className="font-medium text-gray-800">{svc.name}</p>
                                    {svc.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{svc.description}</p>
                                    )}
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                            {svc.price_type === 'fixed' ? (
                                <div>
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Fixe</span>
                                    <p className="text-sm font-semibold text-gray-800 mt-1">
                                        {svc.base_price_cents != null ? formatMAD(svc.base_price_cents) : '—'}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Variant</span>
                                    <p className="text-xs text-gray-400 mt-1">{svc.prices?.length ?? 0} catégorie(s)</p>
                                </div>
                            )}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-500">{svc.duration_minutes} min</td>
                        <td className="px-3 py-3 text-center">
                            <span className={clsx(
                                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                                svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            )}>
                                {svc.is_active ? <Check size={10} /> : <X size={10} />}
                                {svc.is_active ? 'Actif' : 'Inactif'}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                                <ActionButton icon={Pencil} variant="edit" onClick={() => setModal(svc)} label="Modifier" />
                                <ActionButton icon={Trash2} variant="delete" onClick={() => deleteService(svc)} label="Désactiver" />
                            </div>
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AppLayout>
    );
}
