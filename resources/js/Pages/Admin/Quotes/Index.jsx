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
import { FileText, CheckCircle, Send, Plus, Eye, Search } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const QUOTE_STATUS_COLOR = {
    draft: 'gray', sent: 'blue', accepted: 'green', refused: 'red', expired: 'orange',
};

function fmt(cents) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format((cents ?? 0) / 100) + ' MAD';
}

// ── Composant principal ────────────────────────────────────────────────────

export default function QuotesIndex({ quotes, stats, filters, statuses, clients }) {
    const [showCreate, setShowCreate] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatus] = useState(filters.status ?? '');

    const { data, setData, post, processing, errors, reset } = useForm({
        client_id: '',
        notes: '',
        valid_until: '',
        tax_rate: '20',
        billing_name: '',
        billing_ice: '',
    });

    function applyFilters() {
        router.get(route('admin.quotes.index'), { search, status: statusFilter }, { preserveState: true });
    }

    function submit(e) {
        e.preventDefault();
        post(route('admin.quotes.store'), {
            onSuccess: () => { reset(); setShowCreate(false); },
        });
    }

    return (
        <AppLayout>
            <Head title="Devis" />            <PageHeader
                title="Devis"
                subtitle={`${quotes.total} devis au total`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Devis' },
                ]}
            >
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition touch-manipulation"
                >
                    <Plus className="w-4 h-4" /> Nouveau devis
                </button>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard variant="tinted" label="Total" value={stats.total} icon={FileText} color="slate" />
                <StatCard variant="tinted" label="Brouillons" value={stats.draft} icon={FileText} color="slate" />
                <StatCard variant="tinted" label="Envoyés" value={stats.sent} icon={Send} color="blue" />
                <StatCard variant="tinted" label="Acceptés — CA" value={fmt(stats.total_amount_cents)} icon={CheckCircle} color="green" />
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        placeholder="Rechercher client, numéro…"
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatus(e.target.value); router.get(route('admin.quotes.index'), { search, status: e.target.value }, { preserveState: true }); }}
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
                    { label: 'Validité' },
                    { label: 'Créé le' },
                    { label: '' },
                ]}
                isEmpty={quotes.data.length === 0}
                emptyMessage="Aucun devis trouvé"
                footer={<Pagination links={quotes.links} meta={quotes} />}
            >
                {quotes.data.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                            {q.quote_number}
                        </td>
                        <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{q.client?.name}</div>
                            {q.client?.is_company && (
                                <div className="text-xs text-gray-400">Entreprise</div>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            <Badge color={QUOTE_STATUS_COLOR[q.status] ?? 'gray'}>
                                {statuses[q.status]}
                            </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt(q.total_cents)}</td>
                        <td className="px-4 py-3 text-gray-500">
                            {q.valid_until
                                ? new Date(q.valid_until).toLocaleDateString('fr-MA')
                                : <span className="text-gray-300">—</span>
                            }
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                            {new Date(q.created_at).toLocaleDateString('fr-MA')}
                        </td>
                        <td className="px-4 py-3">
                            <Link
                                href={route('admin.quotes.show', q.id)}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                            >
                                <Eye className="w-3.5 h-3.5" /> Voir
                            </Link>
                        </td>
                    </tr>
                ))}            </DataTable>

            {/* Modal création */}
            <Modal show={showCreate} onClose={() => setShowCreate(false)} title="Nouveau devis">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valable jusqu'au</label>
                            <input
                                type="date"
                                value={data.valid_until}
                                onChange={e => setData('valid_until', e.target.value)}
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
                            submitLabel="Créer le devis"
                        />
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
