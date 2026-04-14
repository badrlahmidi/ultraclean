import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    ChevronLeft, Star, CalendarDays, Ticket, CreditCard, Gift,
    Car, Plus, Pencil, Trash2, FileDown, CheckCircle, X, AlertTriangle,
    Phone, Mail, Building2, Info,
} from 'lucide-react';
import { formatMAD, formatDate, formatDateTime } from '@/utils/format';
import { TICKET_STATUS, APPT_STATUS } from '@/utils/constants';
import clsx from 'clsx';

/* ── Config ─────────────────────────────────────────────────────────────── */
const TIER_CONFIG = {
    standard: { label: 'Standard', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', bar: 'bg-gray-300', ring: 'ring-gray-200' },
    silver: { label: 'Silver', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', bar: 'bg-slate-400', ring: 'ring-slate-200' },
    gold: { label: 'Gold', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', bar: 'bg-amber-400', ring: 'ring-amber-200' },
    platinum: { label: 'Platinum', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', bar: 'bg-violet-500', ring: 'ring-violet-200' },
};

/* ── Small helpers ──────────────────────────────────────────────────────── */
function Badge({ children, className }) {
    return <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', className)}>{children}</span>;
}

function Card({ title, icon: Icon, iconColor = 'text-blue-500', count, action, children }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Icon size={15} className={iconColor} />
                    <span className="text-sm font-semibold text-gray-700">{title}</span>
                    {count != null && <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{count}</span>}
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

/* ── Modal shell ────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={15} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';
const lbl = 'block text-xs font-semibold text-gray-500 mb-1';

/* ── Edit client modal ──────────────────────────────────────────────────── */
function EditModal({ open, onClose, client }) {
    const { data, setData, put, processing, errors } = useForm({
        name: client.name ?? '', phone: client.phone ?? '', email: client.email ?? '',
        vehicle_plate: client.vehicle_plate ?? '', is_company: client.is_company ?? false,
        ice: client.ice ?? '', notes: client.notes ?? '', is_active: client.is_active ?? true,
    });
    return (
        <Modal open={open} onClose={onClose} title="Modifier le client">
            <form onSubmit={e => { e.preventDefault(); put(route('admin.clients.update', client.id), { onSuccess: onClose }); }} className="space-y-4">
                <div>
                    <label className={lbl}>Nom complet *</label>
                    <input className={clsx(inp, errors.name && 'border-red-400')} value={data.name} onChange={e => setData('name', e.target.value)} />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={lbl}>Téléphone</label>
                        <input className={clsx(inp, errors.phone && 'border-red-400')} value={data.phone} onChange={e => setData('phone', e.target.value)} />
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className={lbl}>Email</label>
                        <input type="email" className={clsx(inp, errors.email && 'border-red-400')} value={data.email} onChange={e => setData('email', e.target.value)} />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                </div>
                <div>
                    <label className={lbl}>Immatriculation principale</label>
                    <input className={inp} value={data.vehicle_plate} onChange={e => setData('vehicle_plate', e.target.value.toUpperCase())} placeholder="A-12345-B" />
                </div>
                <div className="flex gap-5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={data.is_company} onChange={e => setData('is_company', e.target.checked)} className="rounded border-gray-300" /> Entreprise</label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded border-gray-300" /> Client actif</label>
                </div>
                {data.is_company && (
                    <div><label className={lbl}>ICE</label><input className={inp} value={data.ice} onChange={e => setData('ice', e.target.value)} /></div>
                )}
                <div><label className={lbl}>Notes</label><textarea className={inp} rows={3} value={data.notes} onChange={e => setData('notes', e.target.value)} /></div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Annuler</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                        {processing ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ── Vehicle modal ──────────────────────────────────────────────────────── */
function VehicleModal({ open, onClose, clientId, vehicle = null, vehicleTypes }) {
    const isEdit = !!vehicle;
    const { data, setData, post, put, processing } = useForm({
        plate: vehicle?.plate ?? '', brand: vehicle?.brand ?? '', model: vehicle?.model ?? '',
        color: vehicle?.color ?? '', year: vehicle?.year ?? '',
        vehicle_type_id: vehicle?.vehicle_type_id ?? '', is_primary: vehicle?.is_primary ?? false,
        notes: vehicle?.notes ?? '',
    });
    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'}>
            <form onSubmit={e => {
                e.preventDefault();
                const opts = { onSuccess: onClose };
                if (isEdit) put(route('admin.clients.vehicles.update', { client: clientId, vehicle: vehicle.id }), opts);
                else post(route('admin.clients.vehicles.store', clientId), opts);
            }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Immatriculation</label><input className={inp} value={data.plate} onChange={e => setData('plate', e.target.value.toUpperCase())} placeholder="A-12345-B" /></div>
                    <div><label className={lbl}>Année</label><input type="number" className={inp} value={data.year} onChange={e => setData('year', e.target.value)} placeholder="2021" min={1980} max={2030} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Marque</label><input className={inp} value={data.brand} onChange={e => setData('brand', e.target.value)} placeholder="Toyota" /></div>
                    <div><label className={lbl}>Modèle</label><input className={inp} value={data.model} onChange={e => setData('model', e.target.value)} placeholder="Yaris" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Couleur</label><input className={inp} value={data.color} onChange={e => setData('color', e.target.value)} placeholder="Blanc" /></div>
                    <div>
                        <label className={lbl}>Catégorie prix</label>
                        <select className={inp} value={data.vehicle_type_id} onChange={e => setData('vehicle_type_id', e.target.value)}>
                            <option value="">— Aucune —</option>
                            {vehicleTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                <div><label className={lbl}>Notes</label><textarea className={inp} rows={2} value={data.notes} onChange={e => setData('notes', e.target.value)} /></div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={data.is_primary} onChange={e => setData('is_primary', e.target.checked)} className="rounded border-gray-300" />
                    Véhicule principal
                </label>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Annuler</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                        {processing ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Ajouter')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ── Confirm modal ──────────────────────────────────────────────────────── */
function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', processing }) {
    return (
        <Modal open={open} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                    <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{message}</p>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Annuler</button>
                    <button onClick={onConfirm} disabled={processing} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">
                        <Trash2 size={14} />{processing ? 'En cours…' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

const TABS = [
    { id: 'history', label: 'Historique', icon: Ticket },
    { id: 'vehicles', label: 'Véhicules', icon: Car },
    { id: 'loyalty', label: 'Fidélité', icon: Gift },
    { id: 'appointments', label: 'Rendez-vous', icon: CalendarDays },
];

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function AdminClientShow({ client, recentTickets, transactions, appointments, vehicles, vehicleTypes, tiers, checkinUrl, flash }) {
    const tier = client.loyalty_tier ?? 'standard';
    const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.standard;

    const [tab, setTab] = useState('history');
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [vehicleAdd, setVehicleAdd] = useState(false);
    const [vehicleEdit, setVehicleEdit] = useState(null);
    const [vehicleDel, setVehicleDel] = useState(null);
    const [delBusy, setDelBusy] = useState(false);

    function deleteClient() {
        setDelBusy(true);
        router.delete(route('admin.clients.destroy', client.id), { onFinish: () => setDelBusy(false) });
    }
    function deleteVehicle() {
        setDelBusy(true);
        router.delete(route('admin.clients.vehicles.destroy', { client: client.id, vehicle: vehicleDel.id }), {
            onSuccess: () => setVehicleDel(null), onFinish: () => setDelBusy(false),
        });
    }

    const totalRevenue = recentTickets.reduce((s, t) => s + (t.total_cents ?? 0), 0);
    const counts = { history: recentTickets.length, vehicles: vehicles.length, loyalty: transactions.length, appointments: appointments.length };

    return (
        <AppLayout title={`Client — ${client.name}`}>
            <Head title={`Client : ${client.name}`} />
            <div className="space-y-5">

                {/* Back + flash */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <Link href={route('admin.clients.index')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                        <ChevronLeft size={16} /> Retour aux clients
                    </Link>
                    {flash?.success && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm">
                            <CheckCircle size={14} /> {flash.success}
                        </div>
                    )}
                </div>

                {/* ── Hero ── */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className={clsx('h-1 w-full', tierCfg.bar)} />
                    <div className="p-6">
                        <div className="flex items-start gap-5 flex-wrap">

                            {/* Avatar */}
                            <div className={clsx('w-16 h-16 rounded-2xl font-bold text-2xl flex items-center justify-center flex-shrink-0 ring-2', tierCfg.ring,
                                tier === 'gold' ? 'bg-amber-100 text-amber-700' : tier === 'platinum' ? 'bg-violet-100 text-violet-700' : tier === 'silver' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700')}>
                                {client.name?.charAt(0)?.toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
                                    <Badge className={tierCfg.color}><span className={clsx('w-1.5 h-1.5 rounded-full', tierCfg.dot)} />{tierCfg.label}</Badge>
                                    {!client.is_active && <Badge className="bg-red-100 text-red-600">Inactif</Badge>}
                                    {client.is_company && <Badge className="bg-purple-100 text-purple-700"><Building2 size={10} /> Entreprise</Badge>}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                                    {client.phone && <span className="flex items-center gap-1"><Phone size={13} className="text-gray-400" />{client.phone}</span>}
                                    {client.email && <span className="flex items-center gap-1"><Mail size={13} className="text-gray-400" />{client.email}</span>}
                                    {client.vehicle_plate && <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700"><Car size={11} />{client.vehicle_plate}</span>}
                                    {client.is_company && client.ice && <span className="flex items-center gap-1"><Info size={13} className="text-gray-400" />ICE: {client.ice}</span>}
                                </div>
                                {client.notes && <p className="mt-2 text-sm text-gray-400 italic">{client.notes}</p>}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                                {checkinUrl && (
                                    <a href={checkinUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">QR Check-in</a>
                                )}
                                <a href={route('admin.clients.export-pdf', client.id)} target="_blank"
                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                                    <FileDown size={13} /> PDF
                                </a>
                                <button onClick={() => setEditOpen(true)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors">
                                    <Pencil size={13} /> Modifier
                                </button>
                                <button onClick={() => setDeleteOpen(true)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors">
                                    <Trash2 size={13} /> Archiver
                                </button>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100">
                            {[
                                { v: client.total_visits ?? 0, l: 'Visites', i: Ticket, f: v => v },
                                { v: client.total_spent_cents ?? 0, l: 'CA total', i: CreditCard, f: formatMAD },
                                { v: client.loyalty_points ?? 0, l: 'Points fidélité', i: Star, f: v => v },
                                { v: client.last_visit_date, l: 'Dernière visite', i: CalendarDays, f: v => v ? formatDate(v, 'medium') : '—' },
                            ].map(({ v, l, i: Icon, f }) => (
                                <div key={l} className="text-center">
                                    <p className="text-xl font-bold text-gray-800">{f(v)}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1"><Icon size={11} />{l}</p>
                                </div>
                            ))}
                        </div>

                        {/* Tier progress */}
                        {client.visits_to_next_tier != null && client.visits_to_next_tier > 0 && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                    <span className="font-medium">Progression vers tier suivant</span>
                                    <span>{client.visits_to_next_tier} visite(s) restante(s)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className={clsx('h-2 rounded-full', tierCfg.bar)}
                                        style={{ width: `${Math.min(95, Math.max(5, 100 - Math.min(100, client.visits_to_next_tier * 5)))}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex gap-0.5 -mb-px overflow-x-auto">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={clsx('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                                    tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                                <t.icon size={14} />
                                {t.label}
                                {counts[t.id] > 0 && (
                                    <span className={clsx('text-xs rounded-full px-1.5 py-0.5 font-semibold',
                                        tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                                        {counts[t.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* ── Historique ── */}
                {tab === 'history' && (
                    <Card title="Historique des tickets" icon={Ticket} iconColor="text-blue-500" count={recentTickets.length}>
                        {recentTickets.length === 0 ? (
                            <div className="text-center py-12 text-gray-400"><Ticket size={36} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Aucun ticket</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left">
                                            {['N°', 'Date', 'Plaque', 'Services', 'Statut', 'Montant'].map((h, i) => (
                                                <th key={h} className={clsx('text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 pr-4', i === 5 && 'text-right')}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {recentTickets.map(t => (
                                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 pr-4"><span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">#{t.ticket_number}</span></td>
                                                <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(t.created_at, 'short')}</td>
                                                <td className="py-3 pr-4 font-mono text-xs text-gray-600">{t.vehicle_plate ?? '—'}</td>
                                                <td className="py-3 pr-4 text-xs text-gray-500 max-w-[160px] truncate">{t.services?.map(s => s.service_name).join(', ') || '—'}</td>
                                                <td className="py-3 pr-4"><Badge className={TICKET_STATUS[t.status]?.cls ?? 'bg-gray-100 text-gray-600'}>{TICKET_STATUS[t.status]?.label ?? t.status}</Badge></td>
                                                <td className="py-3 text-right font-semibold text-gray-800">{formatMAD(t.total_cents)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200">
                                            <td colSpan={5} className="pt-3 text-xs font-semibold text-gray-500">Total ({recentTickets.length} tickets)</td>
                                            <td className="pt-3 text-right font-bold text-gray-800">{formatMAD(totalRevenue)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── Véhicules ── */}
                {tab === 'vehicles' && (
                    <Card title="Véhicules enregistrés" icon={Car} iconColor="text-emerald-500" count={vehicles.length}
                        action={
                            <button onClick={() => setVehicleAdd(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5">
                                <Plus size={13} /> Ajouter
                            </button>
                        }>
                        {vehicles.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Car size={36} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Aucun véhicule enregistré</p>
                                <button onClick={() => setVehicleAdd(true)} className="mt-3 text-xs text-emerald-600 font-medium hover:underline">+ Ajouter un véhicule</button>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {vehicles.map(v => (
                                    <div key={v.id} className={clsx('border rounded-xl p-4 relative transition-all',
                                        v.is_primary ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm')}>
                                        {v.is_primary && (
                                            <span className="absolute top-3 right-3 text-[10px] font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">Principal</span>
                                        )}
                                        <div className="flex items-start gap-3">
                                            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                                v.is_primary ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500')}>
                                                <Car size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0 pr-10">
                                                <p className="font-bold text-gray-800 font-mono">{v.plate || '— Pas de plaque —'}</p>
                                                <p className="text-sm text-gray-600 mt-0.5">{[v.brand, v.model].filter(Boolean).join(' ') || 'Marque inconnue'}</p>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {v.color && <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">{v.color}</span>}
                                                    {v.year && <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">{v.year}</span>}
                                                    {v.vehicle_type?.label && <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{v.vehicle_type.label}</span>}
                                                </div>
                                                {v.notes && <p className="text-xs text-gray-400 italic mt-1.5 truncate">{v.notes}</p>}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                                            <button onClick={() => setVehicleEdit(v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                                                <Pencil size={12} /> Modifier
                                            </button>
                                            <button onClick={() => setVehicleDel(v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                                <Trash2 size={12} /> Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* ── Fidélité ── */}
                {tab === 'loyalty' && (
                    <div className="grid lg:grid-cols-3 gap-5">
                        <div>
                            <Card title="Résumé fidélité" icon={Star} iconColor="text-amber-500">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                                        <span className="text-sm text-gray-600">Points disponibles</span>
                                        <span className="text-xl font-bold text-amber-700">{client.loyalty_points ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-gray-600">Valeur en MAD</span>
                                        <span className="text-sm font-bold text-gray-700">{formatMAD(client.points_value_cents ?? 0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <span className="text-sm text-gray-600">Tier actuel</span>
                                        <Badge className={tierCfg.color}><span className={clsx('w-1.5 h-1.5 rounded-full', tierCfg.dot)} />{tierCfg.label}</Badge>
                                    </div>
                                    <Link href={route('admin.loyalty.show', client.id)} className="block w-full text-center text-xs font-semibold text-blue-600 border border-blue-200 rounded-xl py-2 hover:bg-blue-50 transition-colors">
                                        Gérer les points →
                                    </Link>
                                </div>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card title="Transactions fidélité" icon={Gift} iconColor="text-amber-500" count={transactions.length}>
                                {transactions.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400"><Gift size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Aucune transaction</p></div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {transactions.map(tx => (
                                            <div key={tx.id} className="flex items-center gap-3 py-2.5">
                                                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                                                    tx.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                                                    {tx.points > 0 ? '+' : '−'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700 truncate">
                                                        {tx.description ?? tx.type}
                                                        {tx.ticket?.ticket_number && <span className="ml-1.5 text-xs text-gray-400 font-mono">#{tx.ticket.ticket_number}</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{formatDate(tx.created_at, 'short')}</p>
                                                </div>
                                                <span className={clsx('text-sm font-bold', tx.points > 0 ? 'text-green-600' : 'text-red-500')}>
                                                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ── Rendez-vous ── */}
                {tab === 'appointments' && (
                    <Card title="Rendez-vous" icon={CalendarDays} iconColor="text-purple-500" count={appointments.length}>
                        {appointments.length === 0 ? (
                            <div className="text-center py-12 text-gray-400"><CalendarDays size={36} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Aucun rendez-vous</p></div>
                        ) : (
                            <div className="space-y-2">
                                {appointments.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-700">{formatDateTime(a.scheduled_at)}</p>
                                            {a.notes && <p className="text-xs text-gray-400 truncate">{a.notes}</p>}
                                        </div>
                                        <Badge className={APPT_STATUS[a.status]?.cls ?? 'bg-gray-100 text-gray-500'}>{APPT_STATUS[a.status]?.label ?? a.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* Modals */}
            <EditModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />

            <ConfirmModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={deleteClient} processing={delBusy}
                title="Archiver le client" confirmLabel="Archiver"
                message={`Êtes-vous sûr de vouloir archiver "${client.name}" ? Ses données seront conservées.`} />

            <VehicleModal open={vehicleAdd} onClose={() => setVehicleAdd(false)} clientId={client.id} vehicleTypes={vehicleTypes} />

            {vehicleEdit && (
                <VehicleModal open={!!vehicleEdit} onClose={() => setVehicleEdit(null)} clientId={client.id} vehicle={vehicleEdit} vehicleTypes={vehicleTypes} />
            )}

            <ConfirmModal open={!!vehicleDel} onClose={() => setVehicleDel(null)} onConfirm={deleteVehicle} processing={delBusy}
                title="Supprimer le véhicule"
                message={`Supprimer définitivement "${vehicleDel?.plate || vehicleDel?.brand || 'ce véhicule'}" ?`} />
        </AppLayout>
    );
}
