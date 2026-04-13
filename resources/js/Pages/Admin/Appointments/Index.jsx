import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import FormActions from '@/Components/FormActions';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    CalendarDays, CalendarRange, List, Eye,
    Search, Plus, Clock, Check, Pencil, Trash2, Ticket, User,
    AlertTriangle, Loader2, Phone, Building2, X, Car,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { APPT_STATUS } from '@/utils/constants';

/* ── Tab de navigation Liste ↔ Calendrier ─────────────────────────── */
function AppointmentViewTabs({ active = 'list' }) {
    return (
        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <a
                href={route('admin.appointments.index')}
                className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active === 'list'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
            >
                <List size={13} />
                Liste
            </a>
            <a
                href={route('admin.appointments.calendar')}
                className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active === 'calendar'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
            >
                <CalendarRange size={13} />
                Calendrier
            </a>
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

const SOURCE_LABELS = {
    walk_in: 'Passage', phone: 'Téléphone', online: 'En ligne',
    whatsapp: 'WhatsApp', admin: 'Admin',
};

function ApptStatusBadge({ status }) {
    const cfg = APPT_STATUS[status] ?? APPT_STATUS.pending;
    return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('fr-MA', {
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
}

/* ── Modal formulaire ─────────────────────────────────────────────── */

function AppointmentFormModal({ appointment = null, washers = [], onClose }) {
    const editing = !!appointment;
    const [form, setForm] = useState({
        client_id: appointment?.client_id ?? '',
        assigned_to: appointment?.assigned_to ?? '',
        scheduled_at: appointment?.scheduled_at
            ? new Date(appointment.scheduled_at).toISOString().slice(0, 16)
            : '',
        estimated_duration: appointment?.estimated_duration ?? 30,
        vehicle_plate: appointment?.vehicle_plate ?? '',
        vehicle_brand: appointment?.vehicle_brand ?? '',
        vehicle_brand_id: appointment?.vehicle_brand_id ?? '',
        vehicle_model_id: appointment?.vehicle_model_id ?? '',
        notes: appointment?.notes ?? '',
        source: appointment?.source ?? 'phone',
    }); const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // ── Client search + quick create ──
    const [clientSearch, setClientSearch] = useState(appointment?.client?.name ?? '');
    const [clientResults, setClientResults] = useState([]);
    const [clientLoading, setClientLoading] = useState(false);
    const [selectedClient, setSelectedClient] = useState(appointment?.client ?? null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickForm, setQuickForm] = useState({ name: '', phone: '', is_company: false });
    const [quickSaving, setQuickSaving] = useState(false);
    const [quickErrors, setQuickErrors] = useState({});
    const clientTimerRef = useRef(null);
    const clientAbortRef = useRef(null);

    // ── Vehicle brand autocomplete ──
    const [brandSearch, setBrandSearch] = useState(appointment?.vehicle_brand ?? '');
    const [brandResults, setBrandResults] = useState([]);
    const [brandLoading, setBrandLoading] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [showModels, setShowModels] = useState(false);
    const brandTimerRef = useRef(null);
    const brandAbortRef = useRef(null);

    // ── Conflict detection ──
    const [conflicts, setConflicts] = useState([]);
    const [conflictLoading, setConflictLoading] = useState(false);
    const conflictTimerRef = useRef(null);

    // ── Client search with debounce ──
    function searchClients(q) {
        setClientSearch(q);
        setShowQuickAdd(false);
        clearTimeout(clientTimerRef.current);
        clientAbortRef.current?.abort();
        if (q.length < 2) { setClientResults([]); return; }
        setClientLoading(true);
        const controller = new AbortController();
        clientAbortRef.current = controller;
        clientTimerRef.current = setTimeout(async () => {
            try {
                const r = await fetch(route('caissier.clients.search') + '?q=' + encodeURIComponent(q), {
                    signal: controller.signal,
                });
                const data = await r.json();
                setClientResults(data);
            } catch (e) {
                if (e.name !== 'AbortError') console.error('[ClientSearch]', e);
            } finally { setClientLoading(false); }
        }, 300);
    }

    function pickClient(c) {
        setSelectedClient(c);
        setForm(f => ({ ...f, client_id: c.id }));
        setClientSearch(c.name);
        setClientResults([]);
        setShowQuickAdd(false);
    }

    function clearClient() {
        setSelectedClient(null);
        setForm(f => ({ ...f, client_id: '' }));
        setClientSearch('');
        setClientResults([]);
    }

    // ── Quick client create ──
    async function submitQuickClient(e) {
        e.preventDefault();
        setQuickSaving(true);
        setQuickErrors({});
        try {
            const r = await fetch(route('caissier.clients.quick'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    'Accept': 'application/json',
                },
                body: JSON.stringify(quickForm),
            });
            if (r.status === 422) {
                const err = await r.json();
                setQuickErrors(err.errors ?? {});
                return;
            }
            const client = await r.json();
            pickClient(client);
            toast.success(`Client "${client.name}" créé`);
            setShowQuickAdd(false);
        } catch {
            toast.error('Erreur lors de la création');
        } finally {
            setQuickSaving(false);
        }
    }

    // ── Vehicle brand search with debounce ──
    function searchBrands(q) {
        setBrandSearch(q);
        setForm(f => ({ ...f, vehicle_brand: q, vehicle_brand_id: '', vehicle_model_id: '' }));
        setSelectedBrand(null);
        setShowModels(false);
        clearTimeout(brandTimerRef.current);
        brandAbortRef.current?.abort();
        if (q.length < 1) { setBrandResults([]); return; }
        setBrandLoading(true);
        const controller = new AbortController();
        brandAbortRef.current = controller;
        brandTimerRef.current = setTimeout(async () => {
            try {
                const r = await fetch(route('admin.appointments.vehicle-brands') + '?q=' + encodeURIComponent(q), {
                    signal: controller.signal,
                });
                const data = await r.json();
                setBrandResults(data);
            } catch (e) {
                if (e.name !== 'AbortError') console.error('[BrandSearch]', e);
            } finally { setBrandLoading(false); }
        }, 300);
    }

    function pickBrand(brand) {
        setSelectedBrand(brand);
        setForm(f => ({ ...f, vehicle_brand_id: brand.id, vehicle_model_id: '' }));
        setBrandSearch(brand.name);
        setBrandResults([]);
        if (brand.models?.length > 0) {
            setShowModels(true);
        }
    }

    function pickModel(model) {
        setForm(f => ({ ...f, vehicle_model_id: model.id }));
        setBrandSearch(selectedBrand.name + ' ' + model.name);
        setShowModels(false);
    }

    // ── Conflict detection — auto-check when washer + time + duration change ──
    const checkConflicts = useCallback(() => {
        clearTimeout(conflictTimerRef.current);
        if (!form.assigned_to || !form.scheduled_at || !form.estimated_duration) {
            setConflicts([]);
            return;
        }
        setConflictLoading(true);
        conflictTimerRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    assigned_to: form.assigned_to,
                    scheduled_at: form.scheduled_at,
                    estimated_duration: form.estimated_duration,
                    ...(editing ? { exclude_id: appointment.id } : {}),
                });
                const r = await fetch(route('admin.appointments.check-conflicts') + '?' + params);
                const data = await r.json();
                setConflicts(data.conflicts ?? []);
            } catch { /* ignore */ }
            finally { setConflictLoading(false); }
        }, 500);
    }, [form.assigned_to, form.scheduled_at, form.estimated_duration, editing, appointment?.id]);

    useEffect(() => {
        checkConflicts();
        return () => clearTimeout(conflictTimerRef.current);
    }, [checkConflicts]);    // ── Submit ──
    function submit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        const payload = { ...form };
        if (!payload.client_id) delete payload.client_id;
        if (!payload.assigned_to) delete payload.assigned_to;
        if (!payload.vehicle_brand_id) delete payload.vehicle_brand_id;
        if (!payload.vehicle_model_id) delete payload.vehicle_model_id;

        const callbacks = {
            onSuccess: () => { toast.success(editing ? 'RDV mis à jour' : 'RDV créé'); onClose(); },
            onError: (errs) => {
                setErrors(errs);
                const firstMsg = Object.values(errs)[0];
                toast.error(typeof firstMsg === 'string' ? firstMsg : firstMsg?.[0] ?? 'Erreur de validation');
            },
            onFinish: () => setSaving(false),
        };

        if (editing) {
            router.put(route('admin.appointments.update', appointment.id), payload, callbacks);
        } else {
            router.post(route('admin.appointments.store'), payload, callbacks);
        }
    }

    return (
        <Modal
            show
            onClose={onClose}
            title={editing ? 'Modifier le RDV' : 'Nouveau rendez-vous'}
            maxWidth="lg"
        >
            <form onSubmit={submit} className="p-5 space-y-4">
                {/* ── Client search + quick create ── */}
                <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>

                    {selectedClient ? (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <User size={14} className="text-blue-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-800">{selectedClient.name}</span>
                                {selectedClient.phone && (
                                    <span className="text-xs text-gray-400 ml-2">{selectedClient.phone}</span>
                                )}
                            </div>
                            <button type="button" onClick={clearClient}
                                className="p-1 rounded hover:bg-blue-100 text-blue-400">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={clientSearch}
                                    onChange={e => searchClients(e.target.value)}
                                    placeholder="Rechercher un client…"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-9"
                                />
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                {clientLoading && (
                                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                                )}
                            </div>

                            {/* Results dropdown */}
                            {clientResults.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {clientResults.map(c => (
                                        <button key={c.id} type="button" onClick={() => pickClient(c)}
                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2">
                                            {c.is_company
                                                ? <Building2 size={13} className="text-amber-500 flex-shrink-0" />
                                                : <User size={13} className="text-gray-400 flex-shrink-0" />
                                            }
                                            <span className="font-medium">{c.name}</span>
                                            {c.phone && <span className="text-gray-400 text-xs ml-auto">{c.phone}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No results → Quick add prompt */}
                            {clientSearch.length >= 2 && !clientLoading && clientResults.length === 0 && !showQuickAdd && (
                                <div className="mt-2 p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center">
                                    <p className="text-xs text-gray-400 mb-2">Aucun client trouvé pour « {clientSearch} »</p>
                                    <button type="button"
                                        onClick={() => { setShowQuickAdd(true); setQuickForm({ name: clientSearch, phone: '', is_company: false }); }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                                        <Plus size={12} /> Créer ce client
                                    </button>
                                </div>
                            )}

                            {/* Quick add form */}
                            {showQuickAdd && (
                                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold text-gray-600">Nouveau client rapide</p>
                                    <div className="flex gap-2">
                                        {[{ v: false, label: 'Particulier', Icon: User }, { v: true, label: 'Entreprise', Icon: Building2 }].map(o => (
                                            <button key={String(o.v)} type="button"
                                                onClick={() => setQuickForm(f => ({ ...f, is_company: o.v }))}
                                                className={clsx(
                                                    'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border transition-all',
                                                    quickForm.is_company === o.v
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                                                )}>
                                                <o.Icon size={11} /> {o.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input type="text" value={quickForm.name}
                                        onChange={e => setQuickForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Nom *"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                                    {quickErrors.name && <p className="text-xs text-red-500">{quickErrors.name[0]}</p>}
                                    <input type="tel" value={quickForm.phone}
                                        onChange={e => setQuickForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="Téléphone"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowQuickAdd(false)}
                                            className="flex-1 py-1.5 text-xs text-gray-500 hover:text-gray-700">Annuler</button>
                                        <button type="button" onClick={submitQuickClient} disabled={quickSaving}
                                            className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1">
                                            {quickSaving && <Loader2 size={11} className="animate-spin" />}
                                            Créer
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Date/heure + durée ── */}                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date & heure *</label>
                        <input
                            type="datetime-local"
                            required
                            value={form.scheduled_at}
                            onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                            className={clsx(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500",
                                errors.scheduled_at ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            )}
                        />
                        {errors.scheduled_at && <p className="text-xs text-red-500 mt-1">{errors.scheduled_at}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Durée (min) *</label>
                        <input
                            type="number" min="5" max="480" step="5"
                            required
                            value={form.estimated_duration}
                            onChange={e => setForm(f => ({ ...f, estimated_duration: +e.target.value }))}
                            className={clsx(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500",
                                errors.estimated_duration ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            )}
                        />
                        {errors.estimated_duration && <p className="text-xs text-red-500 mt-1">{errors.estimated_duration}</p>}
                    </div>
                </div>

                {/* ── Laveur + source ── */}                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Laveur assigné</label>
                        <select
                            value={form.assigned_to}
                            onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                            className={clsx(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500",
                                errors.assigned_to ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            )}
                        >
                            <option value="">— Non assigné —</option>
                            {washers.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        {errors.assigned_to && <p className="text-xs text-red-500 mt-1">{errors.assigned_to}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
                        <select
                            value={form.source}
                            onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                            className={clsx(
                                "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500",
                                errors.source ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            )}
                        >
                            {Object.entries(SOURCE_LABELS).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                            ))}
                        </select>
                        {errors.source && <p className="text-xs text-red-500 mt-1">{errors.source}</p>}
                    </div>
                </div>

                {/* ── Conflict warning ── */}
                {conflicts.length > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <p className="font-semibold text-amber-800 mb-1">
                                {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} de créneau détecté{conflicts.length > 1 ? 's' : ''}
                            </p>
                            <ul className="space-y-0.5 text-amber-700">
                                {conflicts.map((c, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                        <Clock size={10} />
                                        <span>{c.scheduled_at_human} — {c.client_name}</span>
                                        {c.vehicle_plate && <span className="font-mono text-amber-600">({c.vehicle_plate})</span>}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-amber-600 mt-1">Le RDV peut quand même être créé.</p>
                        </div>
                    </div>
                )}
                {conflictLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Loader2 size={12} className="animate-spin" />
                        Vérification des conflits…
                    </div>
                )}

                {/* ── Véhicule ── */}
                <div className="grid grid-cols-2 gap-3">                    <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Plaque</label>
                    <input
                        type="text"
                        value={form.vehicle_plate}
                        onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value.toUpperCase() }))}
                        placeholder="12345 A 1"
                        maxLength={20}
                        className={clsx(
                            "w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500",
                            errors.vehicle_plate ? 'border-red-400 bg-red-50' : 'border-gray-300'
                        )}
                    />
                    {errors.vehicle_plate && <p className="text-xs text-red-500 mt-1">{errors.vehicle_plate}</p>}
                </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Marque / Modèle</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={brandSearch}
                                onChange={e => searchBrands(e.target.value)}
                                placeholder="Toyota Corolla"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 pl-8"
                            />
                            <Car size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            {brandLoading && (
                                <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                            )}
                        </div>

                        {/* Brand suggestions dropdown */}
                        {brandResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {brandResults.map(b => (
                                    <button key={b.id} type="button" onClick={() => pickBrand(b)}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-0">
                                        {b.logo_url
                                            ? <img src={b.logo_url} alt="" className="w-5 h-5 object-contain" />
                                            : <Car size={13} className="text-gray-300" />
                                        }
                                        <span className="font-medium">{b.name}</span>
                                        {b.models?.length > 0 && (
                                            <span className="text-xs text-gray-400 ml-auto">{b.models.length} modèle(s)</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Model sub-selector */}
                        {showModels && selectedBrand?.models?.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                                    Modèles {selectedBrand.name}
                                </div>
                                {selectedBrand.models.map(m => (
                                    <button key={m.id} type="button" onClick={() => pickModel(m)}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">
                                        {m.name}
                                    </button>
                                ))}
                                <button type="button"
                                    onClick={() => setShowModels(false)}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 border-t">
                                    Fermer
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Notes ── */}                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                        rows={2}
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Instructions particulières…"
                        className={clsx(
                            "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none",
                            errors.notes ? 'border-red-400 bg-red-50' : 'border-gray-300'
                        )}
                    />
                    {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes}</p>}
                </div>

                <div className="flex gap-3 pt-1">
                    <FormActions
                        onCancel={onClose}
                        processing={saving}
                        submitLabel={editing ? 'Enregistrer' : 'Créer le RDV'}
                    />
                </div>
            </form>
        </Modal>
    );
}

/* ── Page principale ──────────────────────────────────────────────── */

export default function AppointmentsIndex({ appointments, washers, statusCounts, filters }) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'convert'|'delete', id }
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? '');
    const [washerFilter, setWasherFilter] = useState(filters.washer_id ?? '');
    const [dateFilter, setDateFilter] = useState(filters.date ?? '');

    function applyFilters(overrides = {}) {
        router.get(route('admin.appointments.index'), {
            search: search || undefined,
            status: statusFilter || undefined,
            washer_id: washerFilter || undefined,
            date: dateFilter || undefined,
            ...overrides,
        }, { preserveState: true, replace: true });
    }

    function handleConfirm(id) {
        router.post(route('admin.appointments.confirm', id), {}, {
            onSuccess: () => toast.success('RDV confirmé'),
            onError: () => toast.error('Impossible de confirmer'),
        });
    } function handleConvert(id) {
        setConfirmAction({ type: 'convert', id });
    }

    function handleDelete(id) {
        setConfirmAction({ type: 'delete', id });
    }

    function doConfirmAction() {
        if (!confirmAction) return;
        if (confirmAction.type === 'convert') {
            router.post(route('admin.appointments.convert', confirmAction.id), {}, {
                onSuccess: () => { toast.success('Ticket créé !'); setConfirmAction(null); },
                onError: () => { toast.error('Conversion impossible'); setConfirmAction(null); },
            });
        } else {
            router.delete(route('admin.appointments.destroy', confirmAction.id), {
                onSuccess: () => { toast.success('RDV supprimé'); setConfirmAction(null); },
                onError: () => setConfirmAction(null),
            });
        }
    }

    const totalUpcoming = Object.values(statusCounts).reduce((a, b) => a + b, 0); return (
        <AppLayout title="Rendez-vous">
            <Head title="Rendez-vous" />
            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.type === 'convert' ? 'Convertir en ticket' : 'Supprimer le rendez-vous'}
                message={confirmAction?.type === 'convert'
                    ? 'Convertir ce RDV en ticket de caisse ? Un ticket sera créé immédiatement.'
                    : 'Supprimer définitivement ce rendez-vous ?'}
                confirmLabel={confirmAction?.type === 'convert' ? 'Convertir' : 'Supprimer'}
                variant={confirmAction?.type === 'convert' ? 'info' : 'danger'}
                onConfirm={doConfirmAction}
                onCancel={() => setConfirmAction(null)}
            />

            <div className="space-y-5">                {/* Header */}                <PageHeader
                title="Rendez-vous"
                subtitle={`${totalUpcoming} RDV à venir`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Rendez-vous' },
                ]}
            >
                <AppointmentViewTabs active="list" />
                <button onClick={() => { setEditing(null); setShowForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium touch-manipulation">
                    <Plus size={16} />
                    Nouveau RDV
                </button>
            </PageHeader>

                {/* Status pills */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: '', label: 'Tous' },
                        ...Object.entries(APPT_STATUS).map(([k, v]) => ({ key: k, label: v.label })),
                    ].map(({ key, label }) => (
                        <button key={key}
                            onClick={() => { setStatusFilter(key); applyFilters({ status: key || undefined }); }}
                            className={clsx(
                                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                                statusFilter === key
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            )}>
                            {label}
                            {key && statusCounts[key] ? ` (${statusCounts[key]})` : ''}
                        </button>
                    ))}
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            placeholder="Plaque, client…"
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={e => { setDateFilter(e.target.value); applyFilters({ date: e.target.value || undefined }); }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={washerFilter}
                        onChange={e => { setWasherFilter(e.target.value); applyFilters({ washer_id: e.target.value || undefined }); }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous les laveurs</option>
                        {washers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>                {/* Table */}
                <DataTable
                    columns={[
                        { label: 'Date & heure' },
                        { label: 'Client' },
                        { label: 'Véhicule' },
                        { label: 'Laveur' },
                        { label: 'Statut' },
                        { label: 'Source' },
                        { label: '' },
                    ]}
                    isEmpty={appointments.data.length === 0}
                    emptyMessage="Aucun rendez-vous trouvé"
                    emptyIcon={CalendarDays}
                    footer={<Pagination links={appointments} />}
                >
                    {appointments.data.map(appt => (
                        <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 tabular-nums">
                                    {fmtDateTime(appt.scheduled_at)}
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                    <Clock size={11} />
                                    {appt.estimated_duration} min
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {appt.client ? (
                                    <div>
                                        <div className="font-medium text-gray-900">{appt.client.name}</div>
                                        <div className="text-xs text-gray-400">{appt.client.phone}</div>
                                    </div>
                                ) : (
                                    <span className="text-gray-400 italic text-xs">Non renseigné</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className="font-mono text-xs font-semibold text-gray-700">{appt.vehicle_plate || '—'}</div>
                                <div className="text-xs text-gray-400">{appt.vehicle_brand || ''}</div>
                            </td>
                            <td className="px-4 py-3">
                                {appt.assigned_to?.name
                                    ? <span className="text-gray-700">{appt.assigned_to.name}</span>
                                    : <span className="text-gray-400 italic">Non assigné</span>
                                }
                            </td>
                            <td className="px-4 py-3">
                                <ApptStatusBadge status={appt.status} />
                                {appt.ticket_id && (
                                    <div className="mt-1">
                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <Ticket size={11} /> Ticket #{appt.ticket?.ticket_number}
                                        </span>
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <span className="text-xs text-gray-500">{SOURCE_LABELS[appt.source] ?? appt.source}</span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                    <Link
                                        href={route('admin.appointments.show', appt.id)}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Voir le détail"
                                    >
                                        <Eye size={15} />
                                    </Link>
                                    {appt.status === 'pending' && (
                                        <button onClick={() => handleConfirm(appt.id)}
                                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Confirmer">
                                            <Check size={15} />
                                        </button>
                                    )}
                                    {(appt.status === 'confirmed' || appt.status === 'arrived') && !appt.ticket_id && (
                                        <>
                                            <button onClick={() => handleConvert(appt.id)}
                                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Convertir en ticket (direct)">
                                                <Ticket size={15} />
                                            </button>
                                            <a
                                                href={route('caissier.tickets.create') + '?prefill_appointment=' + appt.ulid}
                                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Créer ticket avec services">
                                                <Plus size={15} />
                                            </a>
                                        </>
                                    )}
                                    {['pending', 'confirmed'].includes(appt.status) && (
                                        <button onClick={() => { setEditing(appt); setShowForm(true); }}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Modifier">
                                            <Pencil size={15} />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(appt.id)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Supprimer">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </div>

            {showForm && (
                <AppointmentFormModal
                    appointment={editing}
                    washers={washers}
                    onClose={() => setShowForm(false)}
                />
            )}
        </AppLayout>
    );
}
