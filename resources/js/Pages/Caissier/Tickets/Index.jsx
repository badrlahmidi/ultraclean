import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import StatusBadge from '@/Components/StatusBadge';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';

const STATUS_OPTIONS = [
    { value: '', label: 'Tous' },
    { value: 'pending', label: 'En attente' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminés' },
    { value: 'paid', label: 'Payés' },
    { value: 'cancelled', label: 'Annulés' },
];

export default function TicketsIndex({ tickets, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    const applyFilters = (overrides = {}) => {
        router.get(route('caissier.tickets.index'), {
            search: overrides.search ?? search,
            status: overrides.status ?? status,
            today: filters.today,
        }, { preserveState: true, replace: true });
    }; return (
        <AppLayout title="Tickets">
            <Head title="Tickets" />

            <PageHeader
                title={`Tickets${filters.today ? ' du jour' : ''}`}
                subtitle={`${tickets.total} ticket(s)`}
                breadcrumbs={[
                    { label: 'Caisse', href: 'caissier.dashboard' },
                    { label: 'Tickets' },
                ]}
            >
                <Link
                    href={route('caissier.tickets.create')}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold touch-manipulation"
                >
                    <Plus size={15} /> Nouveau
                </Link>
            </PageHeader>

            {/* Filtres */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center mb-4">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        placeholder="N° ticket, plaque…"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                <div className="flex gap-1 flex-wrap">
                    {STATUS_OPTIONS.map(o => (
                        <button
                            key={o.value}
                            onClick={() => { setStatus(o.value); applyFilters({ status: o.value }); }}
                            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation ${status === o.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={[
                    { label: 'N° Ticket' },
                    { label: 'Véhicule' },
                    { label: 'Services' },
                    { label: 'Statut', align: 'center' },
                    { label: 'Montant', align: 'right' },
                    { label: 'Créé', align: 'right' },
                ]}
                isEmpty={tickets.data.length === 0}
                emptyMessage="Aucun ticket trouvé"
                footer={<Pagination links={tickets} />}
            >
                {tickets.data.map(t => (
                    <tr
                        key={t.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.visit(route('caissier.tickets.show', t.id))}
                    >
                        <td className="px-4 py-3 font-mono font-medium text-blue-600">{t.ticket_number}</td>
                        <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{t.vehicle_type?.name}</p>
                            {t.vehicle_plate && <p className="text-xs text-gray-400">{t.vehicle_plate}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                            {t.services?.map(s => s.service_name).join(', ')}
                        </td>
                        <td className="px-3 py-3 text-center">
                            <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                            {formatMAD(t.total_cents)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {formatDateTime(t.created_at)}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AppLayout>
    );
}
