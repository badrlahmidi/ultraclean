import AppLayout from '@/Layouts/AppLayout';
import { useForm, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { RefreshCw, User, Car, Clock, Play, Power, Pencil, Trash2, Plus, Eye } from 'lucide-react';
import clsx from 'clsx';
import Badge from '@/Components/Badge';
import PageHeader from '@/Components/PageHeader';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';

/* ─── helpers ─────────────────────────────────────────────────────── */
function formatNext(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ─── Badge statut ───────────────────────────────────────────────── */
function ActiveBadge({ active }) {
    return active
        ? <Badge color="emerald" dot dotPulse>Actif</Badge>
        : <Badge color="gray">Pausé</Badge>;
}

/* ─── Formulaire template (create / edit) ─────────────────────────── */
function TemplateForm({ form, clients, vehicleTypes, services, laveurs, cronPresets, onSubmit, submitLabel }) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {/* Client */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client *</label>
                <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.data.client_id}
                    onChange={e => form.setData('client_id', e.target.value)}
                    required
                >
                    <option value="">— Sélectionner —</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.vehicle_plate ? ` · ${c.vehicle_plate}` : ''}</option>
                    ))}
                </select>
                {form.errors.client_id && <p className="text-xs text-red-500 mt-1">{form.errors.client_id}</p>}
            </div>

            {/* Label */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Libellé</label>
                <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ex: Flotte Entreprise XYZ - lundi"
                    value={form.data.label}
                    onChange={e => form.setData('label', e.target.value)}
                />
            </div>

            {/* Plaque + Marque */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Plaque</label>
                    <input
                        type="text"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="AB-123-CD"
                        value={form.data.vehicle_plate}
                        onChange={e => form.setData('vehicle_plate', e.target.value.toUpperCase())}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie véhicule</label>
                    <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={form.data.vehicle_type_id}
                        onChange={e => form.setData('vehicle_type_id', e.target.value)}
                    >
                        <option value="">— Catégorie —</option>
                        {vehicleTypes.map(vt => (
                            <option key={vt.id} value={vt.id}>{vt.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Services */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Services inclus</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-gray-50">
                    {services.map(s => (
                        <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="rounded accent-blue-600"
                                checked={(form.data.service_ids ?? []).includes(s.id)}
                                onChange={e => {
                                    const ids = form.data.service_ids ?? [];
                                    form.setData('service_ids',
                                        e.target.checked ? [...ids, s.id] : ids.filter(id => id !== s.id)
                                    );
                                }}
                            />
                            <span>{s.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Durée + Laveur */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Durée estimée (min) *</label>
                    <input
                        type="number"
                        min={5} max={480}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={form.data.estimated_duration}
                        onChange={e => form.setData('estimated_duration', parseInt(e.target.value))}
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Laveur préféré</label>
                    <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={form.data.assigned_to_preference}
                        onChange={e => form.setData('assigned_to_preference', e.target.value)}
                    >
                        <option value="">— Auto —</option>
                        {laveurs.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Récurrence */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Récurrence (cron) *</label>
                <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={form.data.recurrence_rule}
                    onChange={e => form.setData('recurrence_rule', e.target.value)}
                    required
                >
                    {cronPresets.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                    <option value="custom">— Personnalisé —</option>
                </select>
                {form.data.recurrence_rule === 'custom' && (
                    <input
                        type="text"
                        className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="ex: 0 8 * * 1"
                        onChange={e => form.setData('recurrence_rule', e.target.value)}
                    />
                )}
            </div>

            {/* Notes */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes internes</label>
                <textarea
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    value={form.data.notes}
                    onChange={e => form.setData('notes', e.target.value)}
                />
            </div>

            {/* Actif */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    className="rounded accent-blue-600"
                    checked={form.data.is_active}
                    onChange={e => form.setData('is_active', e.target.checked)}
                />
                <span className="text-sm text-gray-700">Activer ce template dès la création</span>
            </label>

            {/* Errors */}
            {Object.values(form.errors).length > 0 && (
                <ul className="text-xs text-red-500 list-disc pl-4">
                    {Object.values(form.errors).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button type="submit" disabled={form.processing}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
                    {form.processing ? 'Enregistrement…' : submitLabel}
                </button>
            </div>
        </form>
    );
}

/* ─── Page principale ────────────────────────────────────────────── */
export default function TicketTemplatesIndex({ templates, clients, vehicleTypes, services, laveurs, cronPresets }) {
    const [showCreate, setShowCreate] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'run', tpl }

    const emptyForm = {
        client_id: '', label: '', vehicle_plate: '', vehicle_brand: '',
        vehicle_type_id: '', service_ids: [], estimated_duration: 30,
        assigned_to_preference: '', recurrence_rule: cronPresets[0]?.value ?? '0 8 * * 1',
        notes: '', is_active: true,
    };

    const createForm = useForm(emptyForm);
    const editForm = useForm(emptyForm);

    function openEdit(tpl) {
        setEditing(tpl);
        editForm.setData({
            client_id: tpl.client_id ?? '',
            label: tpl.label ?? '',
            vehicle_plate: tpl.vehicle_plate ?? '',
            vehicle_brand: tpl.vehicle_brand ?? '',
            vehicle_type_id: tpl.vehicle_type_id ?? '',
            service_ids: tpl.service_ids ?? [],
            estimated_duration: tpl.estimated_duration ?? 30,
            assigned_to_preference: tpl.assigned_to_preference ?? '',
            recurrence_rule: tpl.recurrence_rule ?? cronPresets[0]?.value,
            notes: tpl.notes ?? '',
            is_active: tpl.is_active ?? true,
        });
    }

    function submitCreate(e) {
        e.preventDefault();
        createForm.post(route('admin.ticket-templates.store'), {
            onSuccess: () => { setShowCreate(false); createForm.reset(); },
        });
    }

    function submitEdit(e) {
        e.preventDefault();
        editForm.put(route('admin.ticket-templates.update', editing.id), {
            onSuccess: () => setEditing(null),
        });
    } function handleDelete(tpl) {
        setConfirmAction({ type: 'delete', tpl });
    }

    function handleToggle(tpl) {
        router.post(route('admin.ticket-templates.toggle', tpl.id));
    }

    function handleRunNow(tpl) {
        setConfirmAction({ type: 'run', tpl });
    }

    function doConfirmAction() {
        if (!confirmAction) return;
        if (confirmAction.type === 'delete') {
            router.delete(route('admin.ticket-templates.destroy', confirmAction.tpl.id), {
                onFinish: () => setConfirmAction(null),
            });
        } else {
            router.post(route('admin.ticket-templates.run-now', confirmAction.tpl.id), {}, {
                onFinish: () => setConfirmAction(null),
            });
        }
    } return (
        <AppLayout title="Templates récurrents">
            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.type === 'run' ? 'Créer un ticket maintenant' : 'Supprimer le template'}
                message={confirmAction?.type === 'run'
                    ? `Créer un ticket immédiatement pour «${confirmAction.tpl?.label || confirmAction.tpl?.client?.name}» ?`
                    : `Supprimer le template «${confirmAction?.tpl?.label || confirmAction?.tpl?.id}» ? Cette action est irréversible.`}
                confirmLabel={confirmAction?.type === 'run' ? 'Créer le ticket' : 'Supprimer'}
                variant={confirmAction?.type === 'run' ? 'info' : 'danger'}
                onConfirm={doConfirmAction}
                onCancel={() => setConfirmAction(null)}
            />
            <PageHeader
                title="Templates récurrents"
                subtitle="Création automatique de tickets selon un planning cron"
                icon={<RefreshCw size={20} />}
                actions={
                    <button onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                        <Plus size={16} /> Nouveau template
                    </button>
                }
            />

            {/* Liste */}
            <div className="space-y-3">
                {templates.data.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <RefreshCw size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucun template récurrent configuré.</p>
                    </div>
                )}

                {templates.data.map(tpl => (
                    <div key={tpl.id}
                        className={clsx(
                            'bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition',
                            tpl.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                        )}>

                        {/* Badge récurrence */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                            <RefreshCw size={20} className="text-blue-500" />
                        </div>

                        {/* Infos principales */}
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">
                                    {tpl.label || tpl.client?.name || `Template #${tpl.id}`}
                                </span>
                                <ActiveBadge active={tpl.is_active} />
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1">
                                    <User size={11} />{tpl.client?.name ?? '—'}
                                </span>
                                {tpl.vehicle_plate && (
                                    <span className="flex items-center gap-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                        <Car size={10} />{tpl.vehicle_plate}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Clock size={11} />{tpl.estimated_duration} min
                                </span>
                                <span className="font-medium text-blue-600 font-mono text-xs">
                                    {tpl.recurrence_rule}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                                <span>Prochain : <span className="font-medium text-gray-600">{formatNext(tpl.next_run_at)}</span></span>
                                {tpl.last_run_at && (
                                    <span>Dernier : {formatNext(tpl.last_run_at)}</span>
                                )}
                                {tpl.assigned_to_user && (
                                    <span>Laveur : {tpl.assigned_to_user.name}</span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Déclencher maintenant */}
                            <button
                                onClick={() => handleRunNow(tpl)}
                                title="Créer ticket maintenant"
                                className="p-2 rounded-xl hover:bg-green-50 text-green-600 transition"
                            >
                                <Play size={15} />
                            </button>
                            {/* Activer / désactiver */}
                            <button
                                onClick={() => handleToggle(tpl)}
                                title={tpl.is_active ? 'Désactiver' : 'Activer'}
                                className={clsx(
                                    'p-2 rounded-xl transition',
                                    tpl.is_active
                                        ? 'hover:bg-amber-50 text-amber-500'
                                        : 'hover:bg-emerald-50 text-emerald-500'
                                )}
                            >
                                <Power size={15} />
                            </button>                            {/* Voir détail */}
                            <Link
                                href={route('admin.ticket-templates.show', tpl.id)}
                                title="Voir le détail"
                                className="p-2 rounded-xl hover:bg-indigo-50 text-indigo-500 transition inline-flex items-center"
                            >
                                <Eye size={15} />
                            </Link>
                            {/* Modifier */}
                            <button
                                onClick={() => openEdit(tpl)}
                                title="Modifier"
                                className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 transition"
                            >
                                <Pencil size={15} />
                            </button>
                            {/* Supprimer */}
                            <button
                                onClick={() => handleDelete(tpl)}
                                title="Supprimer"
                                className="p-2 rounded-xl hover:bg-red-50 text-red-400 transition"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <Pagination links={templates.links} className="mt-6" />            {/* Modal création */}
            <Modal show={showCreate} onClose={() => setShowCreate(false)} title="Nouveau template récurrent" maxWidth="lg">
                <TemplateForm
                    form={createForm}
                    clients={clients}
                    vehicleTypes={vehicleTypes}
                    services={services}
                    laveurs={laveurs}
                    cronPresets={cronPresets}
                    onSubmit={submitCreate}
                    submitLabel="Créer le template"
                />
            </Modal>            {/* Modal édition */}
            <Modal show={!!editing} onClose={() => setEditing(null)} title={`Modifier — ${editing?.label || editing?.client?.name}`} maxWidth="lg">
                <TemplateForm
                    form={editForm}
                    clients={clients}
                    vehicleTypes={vehicleTypes}
                    services={services}
                    laveurs={laveurs}
                    cronPresets={cronPresets}
                    onSubmit={submitEdit}
                    submitLabel="Enregistrer"
                />
            </Modal>
        </AppLayout>
    );
}
