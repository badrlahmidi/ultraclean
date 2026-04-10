import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Search, Banknote, CreditCard, Eye, Pencil, Trash2, Printer, Calendar, X } from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import StatusBadge from '@/Components/StatusBadge';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import PaymentModal from './components/PaymentModal';
import { TICKET_STATUS_LABELS } from '@/utils/constants';

const STATUS_OPTIONS = [
    { value: '', label: 'Tous' },
    ...['pending', 'in_progress', 'completed', 'partial', 'paid', 'cancelled'].map(v => ({
        value: v,
        label: TICKET_STATUS_LABELS[v] ?? v,
    })),
];

export default function TicketsIndex({ tickets, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [payingTicket, setPayingTicket] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const applyFilters = (overrides = {}) => {
        const df = overrides.date_from !== undefined ? overrides.date_from : dateFrom;
        const dt = overrides.date_to !== undefined ? overrides.date_to : dateTo;
        router.get(route('caissier.tickets.index'), {
            search: overrides.search ?? search,
            status: overrides.status ?? status,
            today: overrides.today ?? (df || dt ? undefined : filters.today),
            date_from: df || undefined,
            date_to: dt || undefined,
        }, { preserveState: true, replace: true });
    };

    // Shortcut helpers
    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10);

    const setShortcut = (from, to) => {
        setDateFrom(from);
        setDateTo(to);
        applyFilters({ date_from: from, date_to: to, today: undefined });
    };

    const clearDates = () => {
        setDateFrom('');
        setDateTo('');
        applyFilters({ date_from: '', date_to: '', today: filters.today });
    };

    const shortcuts = [
        {
            label: "Aujourd'hui",
            action: () => setShortcut(fmt(today), fmt(today)),
            active: dateFrom === fmt(today) && dateTo === fmt(today),
        },
        {
            label: 'Hier',
            action: () => {
                const y = new Date(today); y.setDate(y.getDate() - 1);
                setShortcut(fmt(y), fmt(y));
            },
            active: (() => { const y = new Date(today); y.setDate(y.getDate() - 1); return dateFrom === fmt(y) && dateTo === fmt(y); })(),
        },
        {
            label: 'Cette semaine',
            action: () => {
                const mon = new Date(today);
                mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                setShortcut(fmt(mon), fmt(today));
            },
            active: (() => {
                const mon = new Date(today);
                mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                return dateFrom === fmt(mon) && dateTo === fmt(today);
            })(),
        },
        {
            label: 'Ce mois',
            action: () => {
                const first = new Date(today.getFullYear(), today.getMonth(), 1);
                setShortcut(fmt(first), fmt(today));
            },
            active: (() => {
                const first = new Date(today.getFullYear(), today.getMonth(), 1);
                return dateFrom === fmt(first) && dateTo === fmt(today);
            })(),
        },
    ];

    const hasDateFilter = dateFrom || dateTo;

    function handleDelete(t) {
        if (!confirm(`Supprimer le ticket ${t.ticket_number} ? Cette action est irréversible.`)) return;
        setDeletingId(t.id);
        router.delete(route('caissier.tickets.destroy', t.ulid), {
            onFinish: () => setDeletingId(null),
        });
    }

    return (
        <AppLayout title="Tickets">
            <Head title="Tickets" />

            {payingTicket && (
                <PaymentModal ticket={payingTicket} onClose={() => setPayingTicket(null)} />
            )}

            <PageHeader
                title={`Tickets${filters.today ? ' du jour' : ''}`}
                subtitle={`${tickets.total} ticket(s)${hasDateFilter ? ` · ${dateFrom}${dateTo && dateTo !== dateFrom ? ` → ${dateTo}` : ''}` : ''}`}
                breadcrumbs={[
                    { label: 'Caisse', href: 'caissier.dashboard' },
                    { label: 'Tickets' },
                ]}
            >
                <Link href={route('caissier.tickets.create')}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold touch-manipulation">
                    <Plus size={15} /> Nouveau
                </Link>
            </PageHeader>

            {/* Filtres */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-3 mb-4">
                {/* Ligne 1 : recherche + statuts */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            placeholder="N° ticket, plaque…"
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {STATUS_OPTIONS.map(o => (
                            <button key={o.value}
                                onClick={() => { setStatus(o.value); applyFilters({ status: o.value }); }}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation ${status === o.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ligne 2 : filtres de dates */}
                <div className="flex flex-wrap gap-2 items-center">
                    <Calendar size={14} className="text-gray-400 shrink-0" />

                    {/* Raccourcis */}
                    {shortcuts.map(s => (
                        <button key={s.label} onClick={s.action}
                            className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-medium transition-colors touch-manipulation ${s.active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {s.label}
                        </button>
                    ))}

                    <span className="text-gray-300 text-xs">|</span>

                    {/* Sélecteurs manuels */}
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }}
                            className="h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700"
                        />
                        <span className="text-gray-400 text-xs">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={e => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }}
                            className="h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-700"
                        />
                    </div>

                    {/* Effacer dates */}
                    {hasDateFilter && (
                        <button onClick={clearDates}
                            className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors">
                            <X size={12} /> Effacer
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                <th className="text-left px-4 py-3 whitespace-nowrap">N° Ticket</th>
                                <th className="text-left px-4 py-3">Client</th>
                                <th className="text-left px-4 py-3">Véhicule</th>
                                <th className="text-left px-4 py-3">Services</th>
                                <th className="text-center px-3 py-3">Statut</th>
                                <th className="text-right px-4 py-3 whitespace-nowrap">Montant</th>
                                <th className="text-center px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tickets.data.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucun ticket trouvé</td></tr>
                            ) : tickets.data.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">

                                    {/* N° Ticket + date création */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <Link href={route('caissier.tickets.show', t.ulid)}
                                            className="font-mono font-semibold text-blue-600 hover:text-blue-800">
                                            {t.ticket_number}
                                        </Link>
                                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(t.created_at)}</p>
                                    </td>

                                    {/* Client */}
                                    <td className="px-4 py-3">
                                        {t.client ? (
                                            <>
                                                <p className="font-medium text-gray-800 leading-tight">{t.client.name}</p>
                                                {t.client.phone && <p className="text-xs text-gray-400 mt-0.5">{t.client.phone}</p>}
                                            </>
                                        ) : <span className="text-xs text-gray-300">—</span>}
                                    </td>

                                    {/* Véhicule : logo + marque/modèle + plaque */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {t.brand_logo_url ? (
                                                <img
                                                    src={t.brand_logo_url}
                                                    alt={t.vehicle_brand ?? ''}
                                                    className="w-8 h-8 object-contain rounded-lg bg-white border border-gray-100 p-0.5 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-gray-500 uppercase">
                                                    {(t.vehicle_brand ?? t.vehicle_type?.name ?? '?').charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-800 leading-tight truncate max-w-[150px]">
                                                    {[t.vehicle_brand, t.vehicle_type?.name].filter(Boolean).join(' — ') || '—'}
                                                </p>
                                                {t.vehicle_plate && (
                                                    <span className="inline-block text-xs font-mono font-semibold text-gray-700 bg-gray-100 rounded px-1.5 py-0.5 mt-0.5 tracking-wider">
                                                        {t.vehicle_plate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Services */}
                                    <td className="px-4 py-3 max-w-[180px]">
                                        <p className="text-xs text-gray-500 truncate">
                                            {t.services?.length > 0 ? t.services.map(s => s.service_name).join(', ') : '—'}
                                        </p>
                                    </td>

                                    {/* Statut */}
                                    <td className="px-3 py-3 text-center"><StatusBadge status={t.status} /></td>

                                    {/* Montant */}
                                    <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                                        {formatMAD(t.total_cents)}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-3">
                                        <div className="flex items-center justify-center gap-1">
                                            {t.status === 'completed' && (
                                                <button onClick={() => setPayingTicket(t)} title="Encaisser"
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap">
                                                    <Banknote size={12} /> Encaisser
                                                </button>
                                            )}
                                            {t.status === 'partial' && (
                                                <button onClick={() => setPayingTicket(t)} title="Encaisser le solde"
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors whitespace-nowrap">
                                                    <Banknote size={12} /> Solde {formatMAD(t.balance_due_cents ?? 0)}
                                                </button>
                                            )}
                                            {['pending', 'in_progress'].includes(t.status) && (
                                                <button onClick={() => setPayingTicket(t)} title="Pré-encaisser"
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors whitespace-nowrap">
                                                    <CreditCard size={12} /> Prépayer
                                                </button>
                                            )}
                                            <Link href={route('caissier.tickets.show', t.ulid)} title="Voir"
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                <Eye size={15} />
                                            </Link>
                                            {!['paid', 'cancelled'].includes(t.status) && (
                                                <Link href={route('caissier.tickets.edit', t.ulid)} title="Modifier"
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                                    <Pencil size={15} />
                                                </Link>
                                            )}
                                            <Link href={route('caissier.tickets.show', t.ulid)} title="Imprimer"
                                                onClick={e => { e.preventDefault(); router.visit(route('caissier.tickets.show', t.ulid), { onSuccess: () => setTimeout(() => window.print(), 300) }); }}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                                                <Printer size={15} />
                                            </Link>
                                            {t.status !== 'paid' && (
                                                <button onClick={() => handleDelete(t)} disabled={deletingId === t.id} title="Supprimer"
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {tickets.last_page > 1 && (
                    <div className="border-t border-gray-100 px-4 py-3">
                        <Pagination links={tickets} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
