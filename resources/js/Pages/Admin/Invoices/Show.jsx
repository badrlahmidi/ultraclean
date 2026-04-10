import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/Badge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Plus, Trash2, Pencil, Download, Send, CreditCard, XCircle,
    Unlink, ToggleLeft, ToggleRight, FileText,
} from 'lucide-react';


// ── Helpers ────────────────────────────────────────────────────────────────

const INVOICE_STATUS_COLOR = {
    draft: 'gray', issued: 'blue', paid: 'green', partial: 'yellow', cancelled: 'red',
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
        if (initial.id) {
            put(route(routeName, routeParams), { onSuccess: onCancel });
        } else {
            post(route(routeName, routeParams), { onSuccess: onCancel });
        }
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
            {errors.description && (
                <p className="col-span-12 text-red-500 text-xs">{errors.description}</p>
            )}
        </form>
    );
}

// ── Modal Paiement ─────────────────────────────────────────────────────────

function PayModal({ invoice, onClose }) {
    const remaining = Math.max(0, invoice.total_cents - invoice.amount_paid_cents);
    const { data, setData, post, processing } = useForm({
        amount_cents: remaining,
        method: 'cash',
        partial: false,
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.invoices.pay', invoice.id), {
            onSuccess: onClose,
            preserveScroll: true,
        });
    }

    return (
        <Modal show onClose={onClose} title="Enregistrer un paiement">
            <form onSubmit={submit} className="space-y-4">
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Total TTC</span>
                        <span className="font-semibold">{fmt(invoice.total_cents)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-gray-500">Déjà réglé</span>
                        <span className="text-green-600 font-semibold">{fmt(invoice.amount_paid_cents)}</span>
                    </div>
                    <div className="flex justify-between mt-1 pt-2 border-t border-gray-200">
                        <span className="text-gray-700 font-medium">Reste à payer</span>
                        <span className="text-red-600 font-bold">{fmt(remaining)}</span>
                    </div>
                </div>                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Montant encaissé (MAD)
                    </label>
                    <input
                        type="number" min="0.01" step="0.01" max={remaining / 100} required
                        value={data.amount_cents / 100}
                        onChange={e => {
                            const v = Math.round(parseFloat(e.target.value || 0) * 100);
                            setData(d => ({
                                ...d,
                                amount_cents: v,
                                partial: v < remaining,
                            }));
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        {fmt(data.amount_cents)} — {data.amount_cents < remaining ? '⚠ Paiement partiel' : '✓ Solde intégral'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode de règlement</label>
                    <select
                        value={data.method}
                        onChange={e => setData('method', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="cash">Espèces</option>
                        <option value="card">Carte bancaire</option>
                        <option value="wire">Virement</option>
                        <option value="mixed">Mixte</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >Annuler</button>
                    <button type="submit" disabled={processing}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        Enregistrer
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Composant principal ────────────────────────────────────────────────────

export default function InvoiceShow({ invoice, services, statuses, colors: _colors }) {
    const [addingLine, setAddingLine] = useState(false);
    const [editingLine, setEditingLine] = useState(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'line'|'ticket'|'invoice', id? }

    const editable = !['paid', 'cancelled'].includes(invoice.status);
    const remaining = Math.max(0, invoice.total_cents - invoice.amount_paid_cents);
    const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && !['paid', 'cancelled'].includes(invoice.status);

    function transition(routeName, extra = {}) {
        router.post(route(routeName, invoice.id), extra, { preserveScroll: true });
    }

    function toggleTax() {
        const includeTax = invoice.tax_rate === 0;
        router.post(route('admin.invoices.tax', invoice.id), { include_tax: includeTax }, { preserveScroll: true });
    }

    function deleteLine(lineId) {
        setConfirmAction({ type: 'line', id: lineId });
    }

    function removeTicket(ticketId) {
        setConfirmAction({ type: 'ticket', id: ticketId });
    }

    function deleteInvoice() {
        setConfirmAction({ type: 'invoice' });
    }

    function doConfirmAction() {
        if (!confirmAction) return;
        if (confirmAction.type === 'line') {
            router.delete(route('admin.invoices.lines.destroy', [invoice.id, confirmAction.id]), {
                preserveScroll: true,
                onFinish: () => setConfirmAction(null),
            });
        } else if (confirmAction.type === 'ticket') {
            router.delete(route('admin.invoices.tickets.remove', [invoice.id, confirmAction.id]), {
                preserveScroll: true,
                onFinish: () => setConfirmAction(null),
            });
        } else {
            router.delete(route('admin.invoices.destroy', invoice.id), {
                onFinish: () => setConfirmAction(null),
            });
        }
    }

    const CONFIRM_CONFIG = {
        line: { title: 'Supprimer la ligne', message: 'Supprimer cette ligne de la facture ?', label: 'Supprimer', variant: 'danger' },
        ticket: { title: 'Détacher le ticket', message: 'Détacher ce ticket de la facture ?', label: 'Détacher', variant: 'warning' },
        invoice: { title: 'Supprimer la facture', message: `Supprimer la facture ${invoice.invoice_number} ? Cette action est irréversible.`, label: 'Supprimer', variant: 'danger' },
    }; return (
        <AppLayout>
            <Head title={`Facture ${invoice.invoice_number}`} />
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
                title={invoice.invoice_number}
                subtitle={`Client : ${invoice.client?.name}${invoice.due_date ? ` — Échéance : ${new Date(invoice.due_date).toLocaleDateString('fr-MA')}` : ''}`}
                breadcrumbs={[
                    { label: 'Admin', href: 'admin.dashboard' },
                    { label: 'Factures', href: 'admin.invoices.index' },
                    { label: invoice.invoice_number },
                ]}
            >
                <Badge color={INVOICE_STATUS_COLOR[invoice.status] ?? 'gray'} size="md">
                    {statuses[invoice.status]}
                </Badge>
                {isOverdue && <Badge color="red" size="md">⚠ En retard</Badge>}
                <a href={route('admin.invoices.pdf', invoice.id)} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                    <Download className="w-4 h-4" /> PDF
                </a>
                {invoice.status === 'draft' && (
                    <button onClick={() => transition('admin.invoices.issue')}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <Send className="w-4 h-4" /> Émettre
                    </button>
                )}
                {['issued', 'partial'].includes(invoice.status) && (
                    <button onClick={() => setShowPayModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        <CreditCard className="w-4 h-4" /> Encaisser
                    </button>
                )}
                {editable && invoice.status !== 'draft' && (
                    <button onClick={() => transition('admin.invoices.issue')}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        title="Annuler la facture">
                        <XCircle className="w-4 h-4" />
                    </button>
                )}
                {editable && (
                    <button onClick={toggleTax}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                        title={invoice.tax_rate > 0 ? 'Désactiver TVA' : 'Activer TVA (20%)'}>
                        {invoice.tax_rate > 0
                            ? <><ToggleRight className="w-4 h-4 text-green-600" /> TVA {invoice.tax_rate}%</>
                            : <><ToggleLeft className="w-4 h-4 text-gray-400" /> TVA 0%</>
                        }
                    </button>
                )}
                {editable && (
                    <button onClick={deleteInvoice}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer la facture">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </PageHeader>

            {/* Barre progression paiement */}
            {invoice.total_cents > 0 && invoice.status !== 'draft' && (
                <div className="mb-5">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Payé : {fmt(invoice.amount_paid_cents)}</span>
                        <span>Total : {fmt(invoice.total_cents)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-2 rounded-full transition-all ${invoice.status === 'paid' ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, Math.round((invoice.amount_paid_cents / invoice.total_cents) * 100))}%` }}
                        />
                    </div>
                    {remaining > 0 && (
                        <p className="text-xs text-red-500 mt-1">Reste à régler : <strong>{fmt(remaining)}</strong></p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                {/* Colonne principale */}
                <div className="col-span-2 space-y-5">

                    {/* Lignes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Lignes de facturation</h2>
                            {editable && (
                                <button onClick={() => setAddingLine(true)}
                                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    <Plus className="w-4 h-4" /> Ajouter une ligne
                                </button>
                            )}
                        </div>

                        <div className="p-4 space-y-2">
                            {addingLine && (
                                <LineForm
                                    services={services}
                                    routeName="admin.invoices.lines.store"
                                    routeParams={[invoice.id]}
                                    onCancel={() => setAddingLine(false)}
                                />
                            )}

                            {invoice.lines.length === 0 && !addingLine && (
                                <p className="text-center text-gray-400 py-8 text-sm">
                                    Aucune ligne — cliquez sur "Ajouter une ligne"
                                </p>
                            )}

                            {invoice.lines.map(line => (
                                <div key={line.id}>
                                    {editingLine === line.id ? (
                                        <LineForm
                                            services={services}
                                            routeName="admin.invoices.lines.update"
                                            routeParams={[invoice.id, line.id]}
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

                    {/* Tickets liés */}
                    {invoice.tickets?.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="font-semibold text-gray-900">Tickets associés</h2>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {invoice.tickets.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group">
                                        <div className="flex-1">
                                            <span className="font-mono text-sm font-semibold text-indigo-700">{t.ticket_number}</span>
                                            <span className="text-gray-400 text-xs ml-2">{new Date(t.created_at).toLocaleDateString('fr-MA')}</span>
                                            {t.vehicle_plate && (
                                                <span className="text-gray-500 text-xs ml-2">— {t.vehicle_plate}</span>
                                            )}
                                        </div>
                                        <div className="font-semibold text-sm">{fmt(t.total_price_cents)}</div>
                                        {editable && (
                                            <button
                                                onClick={() => removeTicket(t.id)}
                                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded transition"
                                                title="Détacher"
                                            >
                                                <Unlink className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Colonne latérale */}
                <div className="space-y-4">
                    {/* Totaux */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Sous-total HT</dt>
                                <dd className="font-medium">{fmt(invoice.subtotal_cents)}</dd>
                            </div>
                            {invoice.discount_cents > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <dt>Remise</dt>
                                    <dd>- {fmt(invoice.discount_cents)}</dd>
                                </div>
                            )}
                            {invoice.tax_rate > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">TVA ({invoice.tax_rate} %)</dt>
                                    <dd className="font-medium">{fmt(invoice.tax_cents)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between pt-3 border-t border-gray-200 font-bold text-base text-indigo-700">
                                <dt>Total TTC</dt>
                                <dd>{fmt(invoice.total_cents)}</dd>
                            </div>
                            {invoice.amount_paid_cents > 0 && (
                                <div className="flex justify-between text-green-600 font-semibold">
                                    <dt>Réglé</dt>
                                    <dd>{fmt(invoice.amount_paid_cents)}</dd>
                                </div>
                            )}
                            {remaining > 0 && (
                                <div className="flex justify-between text-red-600 font-bold text-base pt-2 border-t border-dashed border-red-200">
                                    <dt>Reste dû</dt>
                                    <dd>{fmt(remaining)}</dd>
                                </div>
                            )}
                        </dl>

                        {['issued', 'partial'].includes(invoice.status) && (
                            <button
                                onClick={() => setShowPayModal(true)}
                                className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                            >
                                <CreditCard className="w-4 h-4" /> Encaisser un paiement
                            </button>
                        )}
                    </div>

                    {/* Client */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-sm">
                        <h2 className="font-semibold text-gray-900 mb-3">Facturation</h2>
                        <p className="font-medium">{invoice.billing_name || invoice.client?.name}</p>
                        {invoice.billing_address && <p className="text-gray-500">{invoice.billing_address}</p>}
                        {invoice.billing_city && (
                            <p className="text-gray-500">
                                {invoice.billing_city}{invoice.billing_zip && ` — ${invoice.billing_zip}`}
                            </p>
                        )}
                        {invoice.billing_ice && <p className="text-gray-500">ICE : {invoice.billing_ice}</p>}
                        {invoice.client?.email && <p className="text-gray-500">{invoice.client.email}</p>}
                        {invoice.client?.phone && <p className="text-gray-500">{invoice.client.phone}</p>}
                    </div>

                    {/* Devis source */}
                    {invoice.quote && (
                        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-indigo-600" />
                                <span className="font-semibold text-indigo-900">Devis source</span>
                            </div>
                            <Link
                                href={route('admin.quotes.show', invoice.quote.id)}
                                className="font-mono text-indigo-700 hover:underline"
                            >
                                {invoice.quote.quote_number}
                            </Link>
                        </div>
                    )}

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-sm">
                            <p className="font-semibold text-amber-800 mb-1">Notes</p>
                            <p className="text-amber-700 whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal paiement */}
            {showPayModal && (
                <PayModal invoice={invoice} onClose={() => setShowPayModal(false)} />
            )}
        </AppLayout>
    );
}
