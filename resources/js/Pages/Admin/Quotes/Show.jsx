import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/Badge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Plus, Trash2, Pencil, Download, Send, CheckCircle, XCircle,
    ArrowRightCircle, FilePlus,
} from 'lucide-react';


// ── Helpers ────────────────────────────────────────────────────────────────

const QUOTE_STATUS_COLOR = {
    draft: 'gray', sent: 'blue', accepted: 'green', refused: 'red', expired: 'orange',
};

function fmt(cents) {
    return new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 2 }).format((cents ?? 0) / 100) + ' MAD';
}

// ── Formulaire ligne ───────────────────────────────────────────────────────

function LineForm({ services, routeName, routeParams, onCancel, initial = {} }) {
    const { data, setData, post, put, processing, errors } = useForm({
        service_id: initial.service_id ?? '',
        description: initial.description ?? '',
        quantity: initial.quantity ?? 1,
        unit_price_cents: initial.unit_price_cents ?? 0,
        discount_cents: initial.discount_cents ?? 0,
    });

    function handleServiceChange(id) {
        const svc = services.find(s => s.id == id);
        setData(d => ({
            ...d,
            service_id: id,
            description: svc ? svc.name : d.description,
            unit_price_cents: svc ? svc.base_price_cents : d.unit_price_cents,
        }));
    }

    function submit(e) {
        e.preventDefault();
        const action = initial.id
            ? () => put(route(routeName, routeParams), { onSuccess: onCancel })
            : () => post(route(routeName, routeParams), { onSuccess: onCancel });
        action();
    }

    return (
        <form onSubmit={submit} className="grid grid-cols-12 gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="col-span-3">
                <select
                    value={data.service_id}
                    onChange={e => handleServiceChange(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Service libre</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="col-span-3">
                <input
                    type="text" required placeholder="Description *"
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="col-span-1">
                <input
                    type="number" min="1" required placeholder="Qté"
                    value={data.quantity}
                    onChange={e => setData('quantity', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                />
            </div>            <div className="col-span-2">
                <input
                    type="number" min="0" step="0.01" required placeholder="P.U. (MAD)"
                    value={data.unit_price_cents / 100}
                    onChange={e => setData('unit_price_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="col-span-2">
                <input
                    type="number" min="0" step="0.01" placeholder="Remise (MAD)"
                    value={data.discount_cents / 100}
                    onChange={e => setData('discount_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="col-span-1 flex gap-1">
                <button type="submit" disabled={processing}
                    className="flex-1 bg-indigo-600 text-white rounded px-2 py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                >OK</button>
                <button type="button" onClick={onCancel}
                    className="flex-1 bg-gray-200 text-gray-700 rounded px-2 py-1.5 text-xs font-medium hover:bg-gray-300"
                >✕</button>
            </div>
            {errors.description && <p className="col-span-12 text-red-500 text-xs">{errors.description}</p>}
        </form>
    );
}

// ── Composant principal ────────────────────────────────────────────────────

export default function QuoteShow({ quote, services, statuses, colors: _colors }) {
    const [addingLine, setAddingLine] = useState(false);
    const [editingLine, setEditingLine] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'line'|'quote'|'convert', lineId? }
    const editable = ['draft', 'sent'].includes(quote.status);

    function transition(routeName) {
        router.post(route(routeName, quote.id), {}, { preserveScroll: true });
    }

    function deleteLine(lineId) {
        setConfirmAction({ type: 'line', lineId });
    }

    function deleteQuote() {
        setConfirmAction({ type: 'quote' });
    }

    function convertToInvoice() {
        setConfirmAction({ type: 'convert' });
    }

    function doConfirmAction() {
        if (!confirmAction) return;
        if (confirmAction.type === 'line') {
            router.delete(route('admin.quotes.lines.destroy', [quote.id, confirmAction.lineId]), {
                preserveScroll: true,
                onFinish: () => setConfirmAction(null),
            });
        } else if (confirmAction.type === 'quote') {
            router.delete(route('admin.quotes.destroy', quote.id), {
                onFinish: () => setConfirmAction(null),
            });
        } else {
            router.post(route('admin.quotes.convert', quote.id), {}, {
                onFinish: () => setConfirmAction(null),
            });
        }
    }

    const CONFIRM_CONFIG = {
        line: { title: 'Supprimer la ligne', message: 'Supprimer cette ligne du devis ?', label: 'Supprimer', variant: 'danger' },
        quote: { title: `Supprimer le devis`, message: `Supprimer le devis ${quote.quote_number} ? Cette action est irréversible.`, label: 'Supprimer', variant: 'danger' },
        convert: { title: 'Convertir en facture', message: 'Convertir ce devis en facture ? Cette action est irréversible.', label: 'Convertir', variant: 'info' },
    };

    return (
        <AppLayout>
            <Head title={`Devis ${quote.quote_number}`} />
            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction ? CONFIRM_CONFIG[confirmAction.type]?.title : ''}
                message={confirmAction ? CONFIRM_CONFIG[confirmAction.type]?.message : ''}
                confirmLabel={confirmAction ? CONFIRM_CONFIG[confirmAction.type]?.label : ''}
                variant={confirmAction ? CONFIRM_CONFIG[confirmAction.type]?.variant : 'danger'}
                onConfirm={doConfirmAction}
                onCancel={() => setConfirmAction(null)}
            />            {/* En-tête */}
            <PageHeader
                title={quote.quote_number}
                subtitle={`Client : ${quote.client?.name} — Créé le ${new Date(quote.created_at).toLocaleDateString('fr-MA')}${quote.valid_until ? ` — Valide jusqu'au ${new Date(quote.valid_until).toLocaleDateString('fr-MA')}` : ''}`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Devis', href: 'admin.quotes.index' },
                    { label: quote.quote_number },
                ]}
            >
                <Badge color={QUOTE_STATUS_COLOR[quote.status] ?? 'gray'} size="md">
                    {statuses[quote.status]}
                </Badge>
                <a href={route('admin.quotes.pdf', quote.id)} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <Download className="w-4 h-4" /> PDF
                </a>
                {quote.status === 'draft' && (
                    <button onClick={() => transition('admin.quotes.send')}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <Send className="w-4 h-4" /> Envoyer
                    </button>
                )}
                {quote.status === 'sent' && (
                    <>
                        <button onClick={() => transition('admin.quotes.accept')}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            <CheckCircle className="w-4 h-4" /> Accepter
                        </button>
                        <button onClick={() => transition('admin.quotes.refuse')}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                            <XCircle className="w-4 h-4" /> Refuser
                        </button>
                    </>
                )}
                {quote.status === 'accepted' && quote.invoices.length === 0 && (
                    <button onClick={convertToInvoice}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                        <ArrowRightCircle className="w-4 h-4" /> Créer facture
                    </button>
                )}                {editable && (
                    <button onClick={deleteQuote}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer le devis"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </PageHeader>

            {/* Lien vers facture si déjà converti */}
            {quote.invoices?.length > 0 && (
                <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                    <FilePlus className="w-4 h-4 shrink-0" />
                    Converti en facture :
                    {quote.invoices.map(inv => (
                        <Link key={inv.id} href={route('admin.invoices.show', inv.id)}
                            className="font-mono font-semibold underline hover:text-green-900"
                        >
                            {inv.invoice_number}
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                {/* Lignes — colonne principale */}
                <div className="col-span-2 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Lignes du devis</h2>
                            {editable && (
                                <button onClick={() => setAddingLine(true)}
                                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    <Plus className="w-4 h-4" /> Ajouter une ligne
                                </button>
                            )}
                        </div>

                        <div className="p-4 space-y-2">
                            {/* Formulaire ajout */}
                            {addingLine && (
                                <LineForm
                                    services={services}
                                    routeName="admin.quotes.lines.store"
                                    routeParams={[quote.id]}
                                    onCancel={() => setAddingLine(false)}
                                />
                            )}

                            {/* Lignes existantes */}
                            {quote.lines.length === 0 && !addingLine && (
                                <p className="text-center text-gray-400 py-8 text-sm">
                                    Aucune ligne — cliquez sur "Ajouter une ligne"
                                </p>
                            )}

                            {quote.lines.map(line => (
                                <div key={line.id}>
                                    {editingLine === line.id ? (
                                        <LineForm
                                            services={services}
                                            routeName="admin.quotes.lines.update"
                                            routeParams={[quote.id, line.id]}
                                            onCancel={() => setEditingLine(null)}
                                            initial={line}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900">{line.description}</div>
                                                {line.service && (
                                                    <div className="text-xs text-gray-400">{line.service.name}</div>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 w-16 text-center">Qté : {line.quantity}</div>
                                            <div className="text-xs text-gray-500 w-24 text-right">
                                                {fmt(line.unit_price_cents)} / u
                                            </div>
                                            {line.discount_cents > 0 && (
                                                <div className="text-xs text-red-500 w-20 text-right">
                                                    - {fmt(line.discount_cents)}
                                                </div>
                                            )}
                                            <div className="font-semibold text-sm text-gray-900 w-24 text-right">
                                                {fmt(line.line_total_cents)}
                                            </div>
                                            {editable && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => setEditingLine(line.id)}
                                                        className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                                    ><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteLine(line.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                    ><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Récapitulatif */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Sous-total HT</dt>
                                <dd className="font-medium">{fmt(quote.subtotal_cents)}</dd>
                            </div>
                            {quote.discount_cents > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <dt>Remise</dt>
                                    <dd>- {fmt(quote.discount_cents)}</dd>
                                </div>
                            )}
                            {quote.tax_rate > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">TVA ({quote.tax_rate} %)</dt>
                                    <dd className="font-medium">{fmt(quote.tax_cents)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between pt-3 border-t border-gray-200 font-bold text-base text-indigo-700">
                                <dt>Total TTC</dt>
                                <dd>{fmt(quote.total_cents)}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Infos client */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-sm">
                        <h2 className="font-semibold text-gray-900 mb-3">Client</h2>
                        <p className="font-medium">{quote.billing_name || quote.client?.name}</p>
                        {quote.billing_address && <p className="text-gray-500">{quote.billing_address}</p>}
                        {quote.billing_ice && <p className="text-gray-500">ICE : {quote.billing_ice}</p>}
                    </div>

                    {/* Notes */}
                    {quote.notes && (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm">
                            <p className="font-semibold text-amber-800 mb-1">Notes</p>
                            <p className="text-amber-700 whitespace-pre-wrap">{quote.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
