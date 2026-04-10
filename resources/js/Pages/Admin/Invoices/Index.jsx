import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import FormActions from '@/Components/FormActions';
import StatCard from '@/Components/StatCard';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Receipt, TrendingUp, Clock, CheckCircle, Plus, Eye, Search } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const INVOICE_STATUS_COLOR = {
    draft: 'gray', issued: 'blue', paid: 'green', partial: 'yellow', cancelled: 'red',
};

function fmt(cents) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format((cents ?? 0) / 100) + ' MAD';
}

// ── Composant principal ────────────────────────────────────────────────────

export default function InvoicesIndex({ invoices, stats, filters, statuses, clients }) {
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatus] = useState(filters.status ?? '');

    const { data, setData, post, processing, errors, reset } = useForm({
        client_id: '',
        notes: '',
        due_date: '',
        tax_rate: '20',
        billing_name: '',
        billing_ice: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.invoices.store'), {
            onSuccess: () => { reset(); setShowCreate(false); },
        });
    }

    return (
        <AppLayout>
            <Head title="Factures" />            <PageHeader
                title="Factures"
                subtitle={`${invoices.total} facture(s) au total`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Factures' },
                ]}
            >
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition touch-manipulation"
                >
                    <Plus className="w-4 h-4" /> Nouvelle facture
                </button>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard variant="tinted" label="Émises" value={stats.issued} icon={Clock} color="blue" />
                <StatCard variant="tinted" label="Payées" value={stats.paid} icon={CheckCircle} color="green" />
                <StatCard variant="tinted" label="Partielles" value={stats.partial} icon={TrendingUp} color="yellow" />
                <StatCard variant="tinted" label="Encaissé" value={fmt(stats.total_paid_cents)} icon={Receipt} color="indigo" />
            </div>

            {stats.total_remaining_cents > 0 && (
                <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
                    💰 Créances en attente : <strong>{fmt(stats.total_remaining_cents)}</strong>
                </div>
            )}

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && router.get(route('admin.invoices.index'), { search, status: statusFilter }, { preserveState: true })}
                        placeholder="Rechercher client, numéro…"
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => {
                        setStatus(e.target.value);
                        router.get(route('admin.invoices.index'), { search, status: e.target.value }, { preserveState: true });
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Tous les statuts</option>
                    {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </div>            {/* Table */}
            <DataTable
                columns={[
                    { label: 'Numéro' },
                    { label: 'Client' },
                    { label: 'Statut' },
                    { label: 'Total TTC', align: 'right' },
                    { label: 'Payé', align: 'right' },
                    { label: 'Échéance' },
                    { label: 'Devis' },
                    { label: '' },
                ]}
                isEmpty={invoices.data.length === 0}
                emptyMessage="Aucune facture trouvée"
                footer={<Pagination links={invoices.links} meta={invoices} />}
            >
                {invoices.data.map(inv => {
                    const remaining = Math.max(0, (inv.total_cents ?? 0) - (inv.amount_paid_cents ?? 0));
                    const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && !['paid', 'cancelled'].includes(inv.status);
                    return (
                        <tr key={inv.id} className={`hover:bg-gray-50 transition ${isOverdue ? 'bg-red-50' : ''}`}>
                            <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                                {inv.invoice_number}
                            </td>
                            <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{inv.client?.name}</div>
                                {inv.client?.is_company && (
                                    <div className="text-xs text-gray-400">Entreprise</div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <Badge color={INVOICE_STATUS_COLOR[inv.status] ?? 'gray'}>
                                    {statuses[inv.status]}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{fmt(inv.total_cents)}</td>
                            <td className="px-4 py-3 text-right">
                                <span className={inv.amount_paid_cents > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                    {fmt(inv.amount_paid_cents)}
                                </span>
                                {remaining > 0 && (
                                    <div className="text-xs text-red-500">Reste : {fmt(remaining)}</div>
                                )}
                            </td>
                            <td className={`px-4 py-3 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                {inv.due_date
                                    ? new Date(inv.due_date).toLocaleDateString('fr-MA')
                                    : <span className="text-gray-300">—</span>}
                                {isOverdue && <span className="text-xs block">En retard</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                                {inv.quote?.quote_number ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={route('admin.invoices.show', inv.id)}
                                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                >
                                    <Eye className="w-3.5 h-3.5" /> Voir
                                </Link>
                            </td>
                        </tr>
                    );
                })}            </DataTable>

            {/* Modal création */}
            <Modal show={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle facture">
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                        <select
                            value={data.client_id}
                            onChange={e => {
                                const cl = clients.find(c => c.id == e.target.value);
                                setData(d => ({
                                    ...d,
                                    client_id: e.target.value,
                                    billing_name: cl?.name ?? '',
                                    billing_ice: cl?.ice ?? '',
                                }));
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            required
                        >
                            <option value="">Sélectionner un client…</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}{c.is_company ? ' (Ent.)' : ''}</option>
                            ))}
                        </select>
                        {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">TVA (%)</label>
                            <input
                                type="number" min="0" max="100" step="0.01"
                                value={data.tax_rate}
                                onChange={e => setData('tax_rate', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                            <input
                                type="date"
                                value={data.due_date}
                                onChange={e => setData('due_date', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom facturation</label>
                        <input
                            type="text"
                            value={data.billing_name}
                            onChange={e => setData('billing_name', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>                    <div className="flex justify-end gap-3 pt-2">
                        <FormActions
                            onCancel={() => setShowCreate(false)}
                            processing={processing}
                            align="end"
                            variant="indigo"
                            submitLabel="Créer la facture"
                        />
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
