import AppLayout from '@/Layouts/AppLayout';
import StatusBadge from '@/Components/StatusBadge';
import { formatMAD, formatDateTime } from '@/utils/format';
import { Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowLeft, Printer, CreditCard, Banknote, Smartphone,
    CheckCircle2, XCircle, PlayCircle, AlertTriangle, Receipt
} from 'lucide-react';
import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';

/* ─── Boutons d'action statut ─── */
const STATUS_ACTIONS = {
    pending: [{ to: 'in_progress', label: 'Démarrer', icon: PlayCircle, color: 'blue' }],
    in_progress: [{ to: 'completed', label: 'Terminé', icon: CheckCircle2, color: 'green' }],
    completed: [], // action spéciale : payer
    paid: [],
    cancelled: [],
};

const CANCEL_ALLOWED = ['pending', 'in_progress', 'completed'];

const BTN_COLORS = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
};

/* ─── Modal paiement ─── */
function PaymentModal({ ticket, onClose }) {
    const { data, setData, post, processing, errors } = useForm({
        method: 'cash',
        amount_cash_cents: ticket.total_cents,
        amount_card_cents: 0,
        amount_mobile_cents: 0,
        note: '',
    });

    const totalPaid =
        (data.method === 'cash' ? data.amount_cash_cents : 0) +
        (data.method === 'card' ? data.amount_card_cents : 0) +
        (data.method === 'mobile' ? data.amount_mobile_cents : 0) +
        (data.method === 'mixed' ? (data.amount_cash_cents + data.amount_card_cents + data.amount_mobile_cents) : 0);

    const change = Math.max(0, totalPaid - ticket.total_cents);
    const insufficient = totalPaid < ticket.total_cents && data.method !== 'mixed';

    function handleMethodChange(method) {
        setData(d => ({
            ...d,
            method,
            amount_cash_cents: method === 'cash' ? ticket.total_cents : 0,
            amount_card_cents: method === 'card' ? ticket.total_cents : 0,
            amount_mobile_cents: method === 'mobile' ? ticket.total_cents : 0,
        }));
    }

    function submit(e) {
        e.preventDefault();
        post(route('caissier.tickets.pay', ticket.id), { onSuccess: onClose });
    }

    const methods = [
        { id: 'cash', label: 'Espèces', icon: Banknote },
        { id: 'card', label: 'Carte', icon: CreditCard },
        { id: 'mobile', label: 'Mobile', icon: Smartphone },
        { id: 'mixed', label: 'Mixte', icon: Receipt },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* En-tête */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Encaisser le ticket</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XCircle size={22} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6 space-y-5">
                    {/* Montant dû */}
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-sm text-gray-500 mb-1">Montant à encaisser</p>
                        <p className="text-3xl font-bold text-slate-800">{formatMAD(ticket.total_cents)}</p>
                        <p className="text-xs text-gray-400 mt-1">{ticket.ticket_number}</p>
                    </div>

                    {/* Choix mode paiement */}
                    <div className="grid grid-cols-4 gap-2">
                        {methods.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => handleMethodChange(m.id)}
                                className={clsx(
                                    'flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium border-2 transition-all',
                                    data.method === m.id
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                )}
                            >
                                <m.icon size={20} />
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Saisie montants */}
                    {(data.method === 'cash' || data.method === 'mixed') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Espèces reçues (centimes)
                            </label>
                            <input
                                type="number" min={0} step={100}
                                value={data.amount_cash_cents}
                                onChange={e => setData('amount_cash_cents', parseInt(e.target.value) || 0)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <p className="text-xs text-gray-400 mt-0.5">= {formatMAD(data.amount_cash_cents)}</p>
                        </div>
                    )}
                    {(data.method === 'card' || data.method === 'mixed') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Carte (centimes)
                            </label>
                            <input
                                type="number" min={0} step={100}
                                value={data.amount_card_cents}
                                onChange={e => setData('amount_card_cents', parseInt(e.target.value) || 0)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    )}
                    {(data.method === 'mobile' || data.method === 'mixed') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mobile (centimes)
                            </label>
                            <input
                                type="number" min={0} step={100}
                                value={data.amount_mobile_cents}
                                onChange={e => setData('amount_mobile_cents', parseInt(e.target.value) || 0)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    )}

                    {/* Rendu monnaie */}
                    {change > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                            <p className="text-sm text-green-700 font-medium">
                                Rendu monnaie : <span className="text-xl font-bold">{formatMAD(change)}</span>
                            </p>
                        </div>
                    )}

                    {errors.amount && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertTriangle size={14} /> {errors.amount}
                        </p>
                    )}

                    {/* Note */}
                    <textarea
                        placeholder="Note optionnelle..."
                        value={data.note}
                        onChange={e => setData('note', e.target.value)}
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />

                    <button
                        type="submit"
                        disabled={processing || insufficient}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        {processing ? 'Enregistrement…' : '✓ Confirmer le paiement'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ─── Modal annulation ─── */
function CancelModal({ ticket, onClose }) {
    const { data, setData, patch, processing } = useForm({ status: 'cancelled', cancelled_reason: '' });

    function submit(e) {
        e.preventDefault();
        patch(route('caissier.tickets.status', ticket.id), { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle size={20} /> Annuler le ticket ?
                </h2>
                <form onSubmit={submit} className="space-y-4">
                    <textarea
                        placeholder="Raison (optionnelle)…"
                        value={data.cancelled_reason}
                        onChange={e => setData('cancelled_reason', e.target.value)}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                            Retour
                        </button>
                        <button type="submit" disabled={processing} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium">
                            Confirmer annulation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Composant reçu imprimable ─── */
const METHOD_LABELS_PRINT = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile', mixed: 'Mixte' };

function PrintReceipt({ ticket }) {
    const qrValue = `${window.location.origin}/ticket/${ticket.ulid ?? ticket.ticket_number}`;
    const subtotal = ticket.services?.reduce((s, l) => s + l.line_total_cents, 0) ?? ticket.subtotal_cents ?? 0;

    return (
        <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '72mm', margin: '0 auto', padding: '8px 4px', color: '#000', background: '#fff' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>UltraClean</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Centre de lavage automobile</div>
                <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>TICKET N° {ticket.ticket_number}</div>
                <div style={{ fontSize: '10px', color: '#777' }}>{formatDateTime(ticket.created_at)}</div>
            </div>

            {/* Véhicule & Client */}
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ marginBottom: '6px' }}>
                {ticket.vehicle_plate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Plaque</span>
                        <strong>{ticket.vehicle_plate}</strong>
                    </div>
                )}
                {ticket.vehicle_brand && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Véhicule</span>
                        <span>{ticket.vehicle_brand}</span>
                    </div>
                )}
                {ticket.vehicle_type?.name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Catégorie</span>
                        <span>{ticket.vehicle_type.name}</span>
                    </div>
                )}
                {ticket.client?.name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Client</span>
                        <span>{ticket.client.name}</span>
                    </div>
                )}
                {ticket.washer?.name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Laveur</span>
                        <span>{ticket.washer.name}</span>
                    </div>
                )}
            </div>

            {/* Services */}
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', fontWeight: 'normal', color: '#555', paddingBottom: '3px' }}>Service</th>
                        <th style={{ textAlign: 'center', fontWeight: 'normal', color: '#555', paddingBottom: '3px' }}>Qté</th>
                        <th style={{ textAlign: 'right', fontWeight: 'normal', color: '#555', paddingBottom: '3px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {ticket.services?.map((line, i) => (
                        <tr key={i}>
                            <td style={{ paddingBottom: '2px' }}>{line.service_name}</td>
                            <td style={{ textAlign: 'center', paddingBottom: '2px' }}>{line.quantity}</td>
                            <td style={{ textAlign: 'right', paddingBottom: '2px' }}>{formatMAD(line.line_total_cents)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totaux */}
            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            {ticket.discount_cents > 0 && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: '#555' }}>Sous-total</span>
                        <span>{formatMAD(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: '#555' }}>Remise</span>
                        <span>−{formatMAD(ticket.discount_cents)}</span>
                    </div>
                </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '3px' }}>
                <span>TOTAL</span>
                <span>{formatMAD(ticket.total_cents)}</span>
            </div>

            {/* Paiement */}
            {ticket.payment && (
                <>
                    <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
                    <div style={{ fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#555' }}>Mode</span>
                            <span>{METHOD_LABELS_PRINT[ticket.payment.method] ?? ticket.payment.method}</span>
                        </div>
                        {ticket.payment.amount_cash_cents > 0 && ticket.payment.method !== 'card' && ticket.payment.method !== 'mobile' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#555' }}>Reçu</span>
                                <span>{formatMAD(ticket.payment.amount_cash_cents)}</span>
                            </div>
                        )}
                        {(ticket.payment.change_given_cents ?? 0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span>Rendu monnaie</span>
                                <span>{formatMAD(ticket.payment.change_given_cents)}</span>
                            </div>
                        )}
                        {ticket.paid_at && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#555' }}>Payé le</span>
                                <span>{formatDateTime(ticket.paid_at)}</span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* QR Code */}
            <div style={{ borderTop: '1px dashed #999', margin: '10px 0 6px' }} />
            <div style={{ textAlign: 'center' }}>
                <QRCodeSVG value={qrValue} size={80} level="M" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '9px', color: '#777', marginTop: '4px' }}>Scannez pour suivre votre véhicule</div>
                <div style={{ fontSize: '9px', color: '#aaa', marginTop: '1px', wordBreak: 'break-all' }}>{ticket.ticket_number}</div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px dashed #999', margin: '8px 0 4px' }} />
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#777' }}>
                <div>Merci de votre confiance !</div>
                <div style={{ marginTop: '2px', color: '#aaa' }}>UltraClean — À bientôt 🚗</div>
            </div>
        </div>
    );
}

/* ─── Page principale ─── */
export default function Show({ ticket, transitions }) {
    const [showPayment, setShowPayment] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

    const { patch, processing } = useForm({});
    const actions = STATUS_ACTIONS[ticket.status] ?? [];
    const canCancel = CANCEL_ALLOWED.includes(ticket.status);

    function doTransition(toStatus) {
        router.patch(route('caissier.tickets.status', ticket.id), { status: toStatus });
    }

    return (<AppLayout title={`Ticket ${ticket.ticket_number}`}>
        {showPayment && <PaymentModal ticket={ticket} onClose={() => setShowPayment(false)} />}
        {showCancel && <CancelModal ticket={ticket} onClose={() => setShowCancel(false)} />}        {/* ── Reçu d'impression (caché à l'écran, visible à l'impression) ── */}
        <div id="print-receipt" className="hidden print:block">
            <PrintReceipt ticket={ticket} />
        </div>        <div className="max-w-4xl mx-auto space-y-6 no-print">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3">
                <Link href={route('caissier.tickets.index')} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    <ArrowLeft size={16} /> Tickets
                </Link>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ticket.ticket_number}</span>
            </div>

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ticket.ticket_number}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Créé le {formatDateTime(ticket.created_at)}
                            {ticket.creator && ` · par ${ticket.creator.name}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <StatusBadge status={ticket.status} size="lg" />

                        {/* Actions de statut */}
                        {actions.map(a => (
                            <button
                                key={a.to}
                                onClick={() => doTransition(a.to)}
                                disabled={processing}
                                className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all', BTN_COLORS[a.color])}
                            >
                                <a.icon size={16} /> {a.label}
                            </button>
                        ))}

                        {/* Bouton Payer */}
                        {ticket.status === 'completed' && (
                            <button
                                onClick={() => setShowPayment(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                            >
                                <Banknote size={16} /> Encaisser
                            </button>
                        )}                        {canCancel && (
                            <button
                                onClick={() => setShowCancel(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-medium dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400"
                            >
                                <XCircle size={16} /> Annuler
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 no-print">
                            <Printer size={16} /> {ticket.status === 'paid' ? 'Reçu' : 'Imprimer'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">                {/* Colonne gauche : infos véhicule + client */}
                <div className="space-y-5">
                    {/* Véhicule */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-5">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Véhicule</h3>
                        {ticket.vehicle_brand && (
                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{ticket.vehicle_brand}</p>
                        )}
                        {ticket.vehicle_plate && (
                            <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-0.5">{ticket.vehicle_plate}</p>
                        )}
                        {!ticket.vehicle_brand && !ticket.vehicle_plate && (
                            <p className="text-gray-400">—</p>
                        )}
                    </div>

                    {/* Client */}
                    {ticket.client && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-5">
                            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Client</h3>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{ticket.client.name}</p>
                            {ticket.client.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.client.phone}</p>}
                        </div>
                    )}

                    {/* Timings */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-5 space-y-2">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Chronologie</h3>
                        {[
                            { label: 'Créé', value: ticket.created_at },
                            { label: 'Démarré', value: ticket.started_at },
                            { label: 'Terminé', value: ticket.completed_at },
                            { label: 'Payé', value: ticket.paid_at },
                        ].map(t => t.value && (
                            <div key={t.label} className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t.label}</span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{formatDateTime(t.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>                {/* Colonne droite : services + paiement */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Services */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-5">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Services</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b dark:border-gray-700 text-xs text-gray-400">
                                    <th className="text-left pb-2 font-medium">Service</th>
                                    <th className="text-center pb-2 font-medium">Qté</th>
                                    <th className="text-right pb-2 font-medium">P.U.</th>
                                    <th className="text-right pb-2 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                {ticket.services?.map(line => (
                                    <tr key={line.id} className="py-2">
                                        <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{line.service_name}</td>
                                        <td className="py-2 text-center text-gray-600 dark:text-gray-400">{line.quantity}</td>
                                        <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatMAD(line.unit_price_cents)}</td>
                                        <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{formatMAD(line.line_total_cents)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-200 dark:border-gray-600">
                                {ticket.discount_cents > 0 && (
                                    <tr>
                                        <td colSpan={3} className="pt-3 text-sm text-gray-500 dark:text-gray-400">Remise</td>
                                        <td className="pt-3 text-right text-red-600 dark:text-red-400 font-medium">−{formatMAD(ticket.discount_cents)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td colSpan={3} className="pt-2 font-bold text-gray-900 dark:text-gray-100">Total</td>
                                    <td className="pt-2 text-right text-xl font-bold text-slate-800 dark:text-gray-100">{formatMAD(ticket.total_cents)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Paiement (si payé) */}
                    {ticket.payment && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
                            <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">Paiement</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">Mode</p>
                                    <p className="font-semibold capitalize text-gray-800 dark:text-gray-200">{ticket.payment.method}</p>
                                </div>
                                {ticket.payment.amount_cash_cents > 0 && (
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Espèces</p>
                                        <p className="font-semibold dark:text-gray-200">{formatMAD(ticket.payment.amount_cash_cents)}</p>
                                    </div>
                                )}
                                {ticket.payment.amount_card_cents > 0 && (
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Carte</p>
                                        <p className="font-semibold dark:text-gray-200">{formatMAD(ticket.payment.amount_card_cents)}</p>
                                    </div>
                                )}
                                {ticket.payment.amount_mobile_cents > 0 && (
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Mobile</p>
                                        <p className="font-semibold dark:text-gray-200">{formatMAD(ticket.payment.amount_mobile_cents)}</p>
                                    </div>
                                )}
                                {(ticket.payment.change_given_cents ?? 0) > 0 && (
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Rendu monnaie</p>
                                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">{formatMAD(ticket.payment.change_given_cents)}</p>
                                    </div>
                                )}
                                {ticket.payment.processed_by && (
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400">Encaissé par</p>
                                        <p className="font-semibold dark:text-gray-200">{ticket.payment.processed_by?.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Annulation */}
                    {ticket.status === 'cancelled' && ticket.cancelled_reason && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                            <h3 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Raison d'annulation</h3>
                            <p className="text-sm text-red-800 dark:text-red-300">{ticket.cancelled_reason}</p>
                        </div>
                    )}

                    {/* Notes */}
                    {ticket.notes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5">
                            <h3 className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-2">Notes</h3>
                            <p className="text-sm text-yellow-900 dark:text-yellow-200">{ticket.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </AppLayout>
    );
}
