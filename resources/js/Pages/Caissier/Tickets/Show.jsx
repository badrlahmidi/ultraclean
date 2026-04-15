import AppLayout from '@/Layouts/AppLayout';
import StatusBadge from '@/Components/StatusBadge';
import { formatMAD, formatDateTime } from '@/utils/format';
import { Link, useForm, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import {
    ArrowLeft, Printer, CreditCard, Banknote, Smartphone,
    CheckCircle2, XCircle, PlayCircle, AlertTriangle, Receipt,
    ArrowRightLeft, Wallet, Clock3, Pencil, UserX
} from 'lucide-react';
import clsx from 'clsx';
import { QRCodeSVG } from 'qrcode.react';

/* --- Boutons d'action statut --- */
const STATUS_ACTIONS = {
    pending: [{ to: 'in_progress', label: 'Démarrer', icon: PlayCircle, color: 'blue' }],
    in_progress: [{ to: 'completed', label: 'Terminé', icon: CheckCircle2, color: 'green' }],
    completed: [],
    partial: [],
    paid: [],
    cancelled: [],
};

const CANCEL_ALLOWED = ['pending', 'in_progress', 'completed', 'partial'];

const BTN_COLORS = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
};

/* --- Modal paiement --- */
function PaymentModal({ ticket, onClose }) {
    const amountDueCents = (ticket.status === 'partial' && ticket.balance_due_cents > 0)
        ? ticket.balance_due_cents
        : ticket.total_cents;
    const totalMAD = amountDueCents / 100;
    const isBalanceCollection = ticket.status === 'partial';
    const { data, setData, processing, errors } = useForm({
        method: ticket.payment_mode ?? 'cash',
        note: '',
    });

    const [cashMAD, setCashMAD] = useState(totalMAD);
    const [cardMAD, setCardMAD] = useState(0);
    const [mobileMAD, setMobileMAD] = useState(0);
    const [wireMAD, setWireMAD] = useState(0);

    const methods = [
        { id: 'cash', label: 'Espèces', icon: Banknote },
        { id: 'card', label: 'Carte', icon: CreditCard },
        { id: 'wire', label: 'Virement', icon: ArrowRightLeft },
        { id: 'mobile', label: 'Mobile', icon: Smartphone },
        { id: 'advance', label: 'Avance', icon: Wallet },
        { id: 'mixed', label: 'Mixte', icon: Receipt },
        { id: 'credit', label: 'Crédit', icon: Clock3 },
    ].filter(m => !isBalanceCollection || !['advance', 'credit'].includes(m.id));

    function handleMethodChange(method) {
        setCashMAD(method === 'cash' || method === 'advance' || method === 'mixed' ? totalMAD : 0);
        setCardMAD(method === 'card' ? totalMAD : 0);
        setMobileMAD(method === 'mobile' ? totalMAD : 0);
        setWireMAD(method === 'wire' ? totalMAD : 0);
        setData(d => ({ ...d, method }));
    }

    const isCredit = data.method === 'credit';
    const isAdvance = data.method === 'advance';
    const isMixed = data.method === 'mixed';

    const totalPaidMAD = isCredit ? 0
        : isMixed ? (cashMAD + cardMAD + mobileMAD + wireMAD)
            : data.method === 'cash' ? cashMAD
                : data.method === 'card' ? cardMAD
                    : data.method === 'mobile' ? mobileMAD
                        : data.method === 'wire' ? wireMAD
                            : data.method === 'advance' ? cashMAD
                                : 0;

    const changeMAD = Math.max(0, totalPaidMAD - totalMAD);
    const canSubmit = isCredit || isAdvance
        ? (isCredit || totalPaidMAD > 0)
        : totalPaidMAD >= totalMAD;

    const quickAmounts = [totalMAD, Math.ceil(totalMAD / 50) * 50, Math.ceil(totalMAD / 100) * 100, Math.ceil(totalMAD / 200) * 200];
    const uniqueQuick = [...new Set(quickAmounts)].slice(0, 4);

    function submit(e) {
        e.preventDefault();
        const payload = {
            method: data.method,
            amount_cash_cents: Math.round((cashMAD || 0) * 100),
            amount_card_cents: Math.round((cardMAD || 0) * 100),
            amount_mobile_cents: Math.round((mobileMAD || 0) * 100),
            amount_wire_cents: Math.round((wireMAD || 0) * 100),
            note: data.note,
        };
        router.post(route('caissier.tickets.pay', ticket.ulid), payload, { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {isBalanceCollection ? 'Encaisser le solde' : 'Encaisser'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">{ticket.ticket_number}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                        <XCircle size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">
                    <div className="bg-slate-800 rounded-2xl p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                            {isBalanceCollection ? 'Solde restant dû' : 'Montant à encaisser'}
                        </p>
                        <p className="text-4xl font-black text-white tabular-nums">{formatMAD(amountDueCents)}</p>
                        {isBalanceCollection && (
                            <p className="text-xs text-slate-400 mt-1">Total ticket : {formatMAD(ticket.total_cents)}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {methods.map(m => (
                            <button key={m.id} type="button" onClick={() => handleMethodChange(m.id)}
                                className={clsx(
                                    'flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold border-2 transition-all',
                                    data.method === m.id
                                        ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                )}>
                                <m.icon size={18} />
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {isCredit && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                            <strong>Crédit (paiement différé)</strong> — Le ticket sera marqué comme payé mais le montant reste dû. Aucun encaissement maintenant.
                        </div>
                    )}

                    {!isCredit && (data.method === 'cash' || data.method === 'advance' || isMixed) && (
                        <AmountField
                            label={isAdvance ? "Montant de l'avance (MAD)" : "Espèces reçues (MAD)"}
                            value={cashMAD}
                            onChange={setCashMAD}
                            quickAmounts={data.method === 'cash' ? uniqueQuick : undefined}
                            totalMAD={totalMAD}
                        />
                    )}
                    {(data.method === 'card' || isMixed) && (
                        <AmountField label="Carte bancaire (MAD)" value={cardMAD} onChange={setCardMAD} totalMAD={totalMAD} />
                    )}
                    {(data.method === 'wire' || isMixed) && (
                        <AmountField label="Virement (MAD)" value={wireMAD} onChange={setWireMAD} totalMAD={totalMAD} />
                    )}
                    {(data.method === 'mobile' || isMixed) && (
                        <AmountField label="Paiement mobile (MAD)" value={mobileMAD} onChange={setMobileMAD} totalMAD={totalMAD} />
                    )}

                    {isAdvance && cashMAD > 0 && cashMAD < totalMAD && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <span className="text-amber-800">
                                Reste dû : <strong>{formatMAD((totalMAD - cashMAD) * 100)}</strong>
                            </span>
                        </div>
                    )}

                    {changeMAD > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                            <p className="text-xs text-emerald-600 font-medium mb-0.5">Rendu monnaie</p>
                            <p className="text-2xl font-bold text-emerald-700">{formatMAD(changeMAD * 100)}</p>
                        </div>
                    )}

                    {errors.amount && (
                        <p className="text-sm text-red-600 flex items-center gap-1.5">
                            <AlertTriangle size={14} /> {errors.amount}
                        </p>
                    )}

                    <textarea placeholder="Note optionnelle…" value={data.note}
                        onChange={e => setData('note', e.target.value)} rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                               focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50"
                    />

                    <button type="submit" disabled={processing || !canSubmit}
                        className={clsx(
                            'w-full py-4 rounded-2xl text-sm font-bold transition-all',
                            canSubmit && !processing
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98]'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        )}>
                        {processing ? 'Enregistrement…'
                            : isCredit ? '✓ Enregistrer en crédit'
                                : isAdvance ? "✓ Enregistrer l'avance"
                                    : `✓ Confirmer · ${formatMAD(Math.min(totalPaidMAD, totalMAD) * 100)}`}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* --- Amount input field with optional quick-fill buttons --- */
function AmountField({ label, value, onChange, quickAmounts }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
            {quickAmounts && (
                <div className="flex gap-1.5 mb-2">
                    {quickAmounts.map(a => (
                        <button key={a} type="button" onClick={() => onChange(a)}
                            className={clsx(
                                'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                value === a
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'
                            )}>
                            {a} MAD
                        </button>
                    ))}
                </div>
            )}
            <div className="relative">
                <input
                    type="number" min={0} step={0.5}
                    value={value || ''}
                    onChange={e => onChange(parseFloat(e.target.value) || 0)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold
                           text-right focus:outline-none focus:border-blue-500 bg-white tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">MAD</span>
            </div>
        </div>
    );
}

/* --- Modal annulation --- */
function CancelModal({ ticket, onClose }) {
    const { data, setData, patch, processing } = useForm({ status: 'cancelled', cancelled_reason: '' });

    function submit(e) {
        e.preventDefault();
        patch(route('caissier.tickets.status', ticket.ulid), { onSuccess: onClose });
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

/* --- Composant reçu imprimable --- */
const METHOD_LABELS_PRINT = {
    cash: 'Espèces',
    card: 'Carte',
    wire: 'Virement',
    mobile: 'Mobile',
    mixed: 'Mixte',
    advance: 'Avance',
    credit: 'Crédit (différé)',
};

function PrintReceiptMinimal({ ticket, settings = {} }) {
    const qrValue = `${window.location.origin}/ticket/${ticket.ulid ?? ticket.ticket_number}`;
    const subtotal = ticket.services?.reduce((s, l) => s + l.line_total_cents, 0) ?? ticket.subtotal_cents ?? 0;
    const centerName = settings.center_name || 'UltraClean';
    const centerAddr = settings.center_address || '';
    const centerCity = settings.center_city || '';
    const centerPhone = settings.center_phone || '';
    const centerLogo = settings.center_logo || null;
    const footer = settings.receipt_footer || 'Merci de votre confiance !'; const showLogo = settings.receipt_show_logo !== false;
    const showQr = settings.receipt_show_qr === true || settings.receipt_show_qr === 1;
    const paperWidth = settings.receipt_paper_width === '58mm' ? '54mm' : '72mm';

    return (
        <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '4px 2px', color: '#000', background: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                {showLogo && centerLogo && (
                    <img src={centerLogo} alt="Logo" style={{ height: '48px', objectFit: 'contain', margin: '0 auto 6px' }} />
                )}
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>{centerName}</div>
                {(centerAddr || centerCity) && (
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                        {centerAddr}{centerAddr && centerCity ? ' – ' : ''}{centerCity}
                    </div>
                )}
                {centerPhone && (
                    <div style={{ fontSize: '10px', color: '#555' }}>{centerPhone}</div>
                )}
                <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>TICKET N° {ticket.ticket_number}</div>
                <div style={{ fontSize: '10px', color: '#777' }}>Déposé le {formatDateTime(ticket.created_at)}</div>
                {ticket.due_at && (
                    <div style={{ fontSize: '10px', color: '#555' }}>Livraison estimée : {formatDateTime(ticket.due_at)}</div>
                )}
            </div>

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
                )}                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555' }}>Opérateur</span>
                    <span>{ticket.assignedTo?.name ?? '—'}</span>
                </div>
            </div>

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

            {ticket.payment ? (
                <>
                    <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
                    <div style={{ fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#555' }}>Mode</span>
                            <span>{METHOD_LABELS_PRINT[ticket.payment.method] ?? ticket.payment.method}</span>
                        </div>
                        {ticket.payment.amount_cash_cents > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#555' }}>Espèces</span>
                                <span>{formatMAD(ticket.payment.amount_cash_cents)}</span>
                            </div>
                        )}
                        {ticket.payment.amount_card_cents > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#555' }}>Carte</span>
                                <span>{formatMAD(ticket.payment.amount_card_cents)}</span>
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
            ) : (
                <>
                    <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#c00', fontWeight: 'bold' }}>
                        EN ATTENTE DE PAIEMENT
                    </div>
                    {ticket.payment_mode && (
                        <div style={{ textAlign: 'center', fontSize: '10px', color: '#777' }}>
                            Mode prévu : {METHOD_LABELS_PRINT[ticket.payment_mode] ?? ticket.payment_mode}
                        </div>
                    )}
                </>
            )}

            {showQr && (
                <div style={{ borderTop: '1px dashed #999', margin: '10px 0 6px' }} />
            )}
            {showQr && (
                <div style={{ textAlign: 'center' }}>
                    <QRCodeSVG value={qrValue} size={80} level="M" style={{ margin: '0 auto' }} />
                    <div style={{ fontSize: '9px', color: '#777', marginTop: '4px' }}>Scannez pour suivre votre véhicule</div>
                    <div style={{ fontSize: '9px', color: '#aaa', marginTop: '1px', wordBreak: 'break-all' }}>{ticket.ticket_number}</div>
                </div>
            )}

            <div style={{ borderTop: '1px dashed #999', margin: '8px 0 4px' }} />
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#777' }}>
                <div>{footer}</div>
                <div style={{ marginTop: '2px', color: '#aaa' }}>{centerName} – À bientôt 🚗</div>
            </div>
        </div>
    );
}

/* --- SectionHeader helper (used in detailed template) --- */
function SectionHeader({ label, width }) {
    const W = width === '54mm' ? 24 : 30;
    const side = Math.max(1, Math.floor((W - label.length - 2) / 2));
    const dashes = '-'.repeat(side);
    return (
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', margin: '6px 0 3px', letterSpacing: '0.3px', color: '#333' }}>
            {`${dashes} ${label} ${dashes}`}
        </div>
    );
}

/* --- Reçu détaillé --- */
function PrintReceiptDetailed({ ticket, settings = {} }) {
    const qrValue = `${window.location.origin}/ticket/${ticket.ulid ?? ticket.ticket_number}`;
    const subtotal = ticket.services?.reduce((s, l) => s + l.line_total_cents, 0) ?? ticket.subtotal_cents ?? 0;

    const centerName = settings.center_name || 'UltraClean';
    const centerSubtitle = settings.center_subtitle ?? '';
    const centerAddr = settings.center_address || '';
    const centerCity = settings.center_city || '';
    const centerPhone = settings.center_phone || '';
    const centerLogo = settings.center_logo || null;
    const footer = settings.receipt_footer || 'Merci de votre confiance !';

    const showLogo = settings.receipt_show_logo !== false;
    const showQr = settings.receipt_show_qr === true || settings.receipt_show_qr === 1;
    const showClientPhone = settings.receipt_show_client_phone !== false;
    const showOperator = settings.receipt_show_operator !== false;
    const showPaymentDetail = settings.receipt_show_payment_detail !== false;
    const showDates = settings.receipt_show_dates !== false; const paperWidth = settings.receipt_paper_width === '58mm' ? '54mm' : '72mm';
    const W = paperWidth; // kept for SectionHeader dash calculation

    const hasPayment = !!ticket.payment;
    const isPartialWithBalance = ticket.status === 'partial' && (ticket.balance_due_cents ?? 0) > 0;
    const showReçuDu = showPaymentDetail && (hasPayment || isPartialWithBalance);

    const paidAmountCents = hasPayment
        ? (ticket.payment.amount_cash_cents ?? 0)
        + (ticket.payment.amount_card_cents ?? 0)
        + (ticket.payment.amount_mobile_cents ?? 0)
        + (ticket.payment.amount_wire_cents ?? 0)
        : 0;
    const dueCents = Math.max(0, ticket.total_cents - paidAmountCents);
    const paymentLabel = hasPayment
        ? (METHOD_LABELS_PRINT[ticket.payment.method] ?? ticket.payment.method)
        : 'En attente';

    const row = (label, value, bold = false) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#555' }}>{label}</span>
            <span style={{ fontWeight: bold ? 'bold' : 'normal' }}>{value}</span>
        </div>
    ); return (
        <div style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '4px 2px', color: '#000', background: '#fff' }}>

            {/* ── ENTÊTE ── */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                {showLogo && centerLogo && (
                    <img src={centerLogo} alt="Logo" style={{ height: '52px', objectFit: 'contain', margin: '0 auto 6px' }} />
                )}
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>{centerName}</div>
                {centerSubtitle && (
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '1px', fontStyle: 'italic' }}>{centerSubtitle}</div>
                )}
                {(centerAddr || centerCity) && (
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                        {centerAddr}{centerAddr && centerCity ? ' – ' : ''}{centerCity}
                    </div>
                )}
                {centerPhone && (
                    <div style={{ fontSize: '10px', color: '#555' }}>{centerPhone}</div>
                )}
            </div>

            {/* ── N° TICKET ── */}
            <div style={{ borderTop: '2px solid #000', borderBottom: '1px dashed #999', margin: '0 0 8px', padding: '5px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>TICKET N° {ticket.ticket_number}</div>
                {showDates && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Déposé le {formatDateTime(ticket.created_at)}</div>
                )}
                {showDates && ticket.due_at && (
                    <div style={{ fontSize: '10px', color: '#555' }}>Livraison : {formatDateTime(ticket.due_at)}</div>
                )}
            </div>

            {/* ── CLIENT ── */}
            {ticket.client?.name && (
                <>
                    <SectionHeader label="CLIENT" width={paperWidth} />
                    <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 'bold' }}>{ticket.client.name}</span>
                            {showClientPhone && ticket.client.phone && (
                                <span style={{ color: '#555' }}>{ticket.client.phone}</span>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ── VÉHICULE ── */}
            {(ticket.vehicle_plate || ticket.vehicle_brand) && (
                <>
                    <SectionHeader label="VÉHICULE" width={paperWidth} />
                    <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            {ticket.vehicle_brand && (
                                <span>{ticket.vehicle_brand}{ticket.vehicle_model ? ` ${ticket.vehicle_model}` : ''}</span>
                            )}
                            {ticket.vehicle_plate && (
                                <span style={{ fontWeight: 'bold', letterSpacing: '1px', border: '1px solid #333', padding: '0 3px' }}>
                                    {ticket.vehicle_plate}
                                </span>
                            )}
                        </div>
                        {ticket.vehicle_type?.name && (
                            <div style={{ color: '#555', fontSize: '10px' }}>{ticket.vehicle_type.name}</div>
                        )}
                    </div>
                </>
            )}

            {/* ── SERVICES ── */}
            <SectionHeader label="SERVICES" width={paperWidth} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '4px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px dashed #aaa' }}>
                        <th style={{ textAlign: 'left', fontWeight: 'normal', color: '#555', paddingBottom: '2px' }}>Désignation</th>
                        <th style={{ textAlign: 'center', fontWeight: 'normal', color: '#555', paddingBottom: '2px', width: '20px' }}>Q</th>
                        <th style={{ textAlign: 'right', fontWeight: 'normal', color: '#555', paddingBottom: '2px' }}>Montant</th>
                    </tr>
                </thead>
                <tbody>
                    {ticket.services?.map((line, i) => (
                        <tr key={i}>
                            <td style={{ paddingBottom: '2px', paddingTop: '2px' }}>{line.service_name}</td>
                            <td style={{ textAlign: 'center', paddingBottom: '2px' }}>{line.quantity}</td>
                            <td style={{ textAlign: 'right', paddingBottom: '2px' }}>{formatMAD(line.line_total_cents)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ── TOTAL ── */}
            <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '4px 0', margin: '0 0 4px' }}>
                {ticket.discount_cents > 0 && (
                    <>
                        {row('Sous-total', formatMAD(subtotal))}
                        {row('Remise', `−${formatMAD(ticket.discount_cents)}`)}
                    </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: ticket.discount_cents > 0 ? '3px' : '0' }}>
                    <span>TOTAL</span>
                    <span>{formatMAD(ticket.total_cents)}</span>
                </div>
            </div>

            {/* ── PAIEMENT ── */}
            {showReçuDu ? (
                <>
                    <SectionHeader label="PAIEMENT" width={paperWidth} />
                    <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                        {row('Mode', paymentLabel)}
                        {hasPayment && ticket.payment.amount_cash_cents > 0 && row('Espèces', formatMAD(ticket.payment.amount_cash_cents))}
                        {hasPayment && ticket.payment.amount_card_cents > 0 && row('Carte', formatMAD(ticket.payment.amount_card_cents))}
                        {hasPayment && (ticket.payment.amount_mobile_cents ?? 0) > 0 && row('Mobile', formatMAD(ticket.payment.amount_mobile_cents))}
                        {hasPayment && (ticket.payment.amount_wire_cents ?? 0) > 0 && row('Virement', formatMAD(ticket.payment.amount_wire_cents))}
                        {hasPayment && (ticket.payment.change_given_cents ?? 0) > 0 && row('Rendu monnaie', formatMAD(ticket.payment.change_given_cents), true)}
                        <div style={{ borderTop: '1px dashed #ccc', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>Reçu</span>
                            <span>{formatMAD(paidAmountCents)}</span>
                        </div>
                        {isPartialWithBalance && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#c00' }}>
                                <span>Reste dû</span>
                                <span>{formatMAD(dueCents)}</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#c00', fontWeight: 'bold', margin: '6px 0' }}>
                    EN ATTENTE DE PAIEMENT
                    {ticket.payment_mode && (
                        <div style={{ fontWeight: 'normal', color: '#777', fontSize: '10px', marginTop: '2px' }}>
                            Mode prévu : {METHOD_LABELS_PRINT[ticket.payment_mode] ?? ticket.payment_mode}
                        </div>
                    )}
                </div>
            )}            {/* ── OPÉRATEUR ── */}
            {showOperator && (
                <>
                    <SectionHeader label="INFOS" width={paperWidth} />
                    <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>Opérateur</span>
                            <span style={{ fontWeight: 'bold', color: ticket.assignedTo?.name ? '#000' : '#aaa' }}>
                                {ticket.assignedTo?.name ?? '—'}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* ── QR CODE ── */}
            {showQr && (
                <>
                    <div style={{ borderTop: '1px dashed #999', margin: '8px 0 6px' }} />
                    <div style={{ textAlign: 'center' }}>
                        <QRCodeSVG value={qrValue} size={100} level="M" style={{ margin: '0 auto' }} />
                        <div style={{ fontSize: '9px', color: '#777', marginTop: '4px' }}>Scannez pour suivre votre véhicule</div>
                        <div style={{ fontSize: '9px', color: '#aaa', marginTop: '1px', wordBreak: 'break-all' }}>{ticket.ticket_number}</div>
                    </div>
                </>
            )}

            {/* ── PIED DE PAGE ── */}
            <div style={{ borderTop: '2px solid #000', margin: '8px 0 4px' }} />
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#555' }}>
                <div style={{ fontStyle: 'italic' }}>{footer}</div>
                <div style={{ marginTop: '3px', color: '#aaa', fontSize: '9px' }}>{centerName} – À bientôt 🚗</div>
            </div>
        </div>
    );
}

/* --- Dispatcher reçu (minimal / détaillé) --- */
function PrintReceipt({ ticket, settings = {} }) {
    const template = settings.receipt_template ?? 'minimal';
    const paperWidthMM = settings.receipt_paper_width === '58mm' ? '58mm' : '80mm';

    // Inject a dynamic @page rule so the thermal printer uses the exact paper width
    // and minimal margins (2mm sides) so no content is clipped.
    const pageStyle = `@media print { @page { size: ${paperWidthMM} auto; margin: 2mm 3mm; } }`;

    return (
        <>
            <style>{pageStyle}</style>
            {template === 'detailed'
                ? <PrintReceiptDetailed ticket={ticket} settings={settings} />
                : <PrintReceiptMinimal ticket={ticket} settings={settings} />
            }
        </>
    );
}

/* --- Page principale --- */
export default function Show({ ticket, settings = {} }) {
    const [showPayment, setShowPayment] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

    const { flash, autoPrintReceipt } = usePage().props;

    useEffect(() => {
        if (autoPrintReceipt && ticket.status === 'paid' && flash?.success) {
            const t = setTimeout(() => window.print(), 400);
            return () => clearTimeout(t);
        }
    }, [ticket.status, flash?.success, autoPrintReceipt]);

    const { processing } = useForm({});
    const actions = STATUS_ACTIONS[ticket.status] ?? [];
    const canCancel = CANCEL_ALLOWED.includes(ticket.status);

    function doTransition(toStatus) {
        router.patch(route('caissier.tickets.status', ticket.ulid), { status: toStatus });
    }

    const isPaid = ticket.status === 'paid';
    const isCompleted = ticket.status === 'completed';
    const isCancelled = ticket.status === 'cancelled';
    const isPartial = ticket.status === 'partial';

    return (
        <AppLayout>
            {showPayment && <PaymentModal ticket={ticket} onClose={() => setShowPayment(false)} />}
            {showCancel && <CancelModal ticket={ticket} onClose={() => setShowCancel(false)} />}

            <div className="hidden print:block">
                <PrintReceipt ticket={ticket} settings={settings} />
            </div>

            <div className="max-w-5xl mx-auto space-y-5 no-print">

                <div className="flex items-center gap-2 text-sm">
                    <Link href={route('caissier.tickets.index')}
                        className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors">
                        <ArrowLeft size={15} /> Tickets
                    </Link>
                    <span className="text-gray-200">/</span>
                    <span className="font-mono font-semibold text-gray-700">{ticket.ticket_number}</span>
                </div>

                <div className={clsx(
                    'rounded-2xl p-5 border',
                    isPaid ? 'bg-emerald-50 border-emerald-200'
                        : isCompleted ? 'bg-violet-50 border-violet-200'
                            : isCancelled ? 'bg-red-50 border-red-200'
                                : isPartial ? 'bg-orange-50 border-orange-200'
                                    : ticket.status === 'in_progress' ? 'bg-blue-50 border-blue-200'
                                        : 'bg-amber-50 border-amber-200'
                )}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-xl font-extrabold text-gray-900 font-mono">{ticket.ticket_number}</h1>
                                    {ticket.vehicle_plate && (
                                        <span className="inline-flex items-center px-3 py-1 rounded border-2 border-gray-700
                                                     bg-white font-mono font-bold text-gray-900 text-sm tracking-widest shadow-sm">
                                            {ticket.vehicle_plate}
                                        </span>
                                    )}
                                    <StatusBadge status={ticket.status} size="lg" />
                                    {ticket.is_prepaid && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            <CreditCard size={12} /> Prépayé
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    {ticket.vehicle_brand && <span className="font-medium">{ticket.vehicle_brand} </span>}
                                    Créé le {formatDateTime(ticket.created_at)}
                                    {ticket.creator && ` · par ${ticket.creator.name}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {actions.map(a => (
                                <button key={a.to} onClick={() => doTransition(a.to)} disabled={processing}
                                    className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm', BTN_COLORS[a.color])}>
                                    <a.icon size={16} /> {a.label}
                                </button>
                            ))}
                            {isCompleted && (
                                <button onClick={() => setShowPayment(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700
                                           text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                                    <Banknote size={16} /> Encaisser
                                </button>
                            )}
                            {isPartial && (
                                <button onClick={() => setShowPayment(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600
                                           text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                                    <Banknote size={16} /> Encaisser le solde ({formatMAD(ticket.balance_due_cents)})
                                </button>
                            )}
                            {['pending', 'in_progress'].includes(ticket.status) && (
                                <button onClick={() => setShowPayment(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600
                                           text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                                    <CreditCard size={16} /> Prépayer
                                </button>
                            )}
                            {!isPaid && !isCancelled && (
                                <Link href={route('caissier.tickets.edit', ticket.ulid)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-blue-50
                                           border border-blue-200 text-blue-600 rounded-xl text-sm font-medium transition-all">
                                    <Pencil size={15} /> Modifier
                                </Link>
                            )}
                            {canCancel && (
                                <button onClick={() => setShowCancel(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-red-50
                                           border border-red-200 text-red-600 rounded-xl text-sm font-medium transition-all">
                                    <XCircle size={15} /> Annuler
                                </button>
                            )}
                            <button onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white
                                       border border-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-all no-print">
                                <Printer size={15} /> {isPaid ? 'Reçu' : 'Imprimer'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="space-y-4">

                        <InfoCard title="Véhicule">
                            {ticket.vehicleBrand?.logo_url && (
                                <img
                                    src={ticket.vehicleBrand.logo_url}
                                    alt={ticket.vehicle_brand ?? ''}
                                    className="h-8 object-contain mb-2"
                                />
                            )}
                            {ticket.vehicle_brand
                                ? <p className="text-base font-bold text-gray-900">{ticket.vehicle_brand}{ticket.vehicle_model ? ` ${ticket.vehicle_model}` : ''}</p>
                                : null}
                            {ticket.vehicle_plate
                                ? <span className="inline-block mt-1 px-3 py-1 rounded border-2 border-gray-600 font-mono font-bold text-gray-800 text-sm tracking-widest">
                                    {ticket.vehicle_plate}
                                </span>
                                : null}
                            {ticket.vehicle_type?.name && (
                                <p className="text-xs text-gray-400 mt-1">{ticket.vehicle_type.name}</p>
                            )}
                            {!ticket.vehicle_brand && !ticket.vehicle_plate && (
                                <p className="text-gray-300 text-sm">—</p>
                            )}
                        </InfoCard>

                        {ticket.client && (
                            <InfoCard title="Client">
                                <p className="font-semibold text-gray-900">{ticket.client.name}</p>
                                {ticket.client.phone && <p className="text-sm text-gray-500 mt-0.5">{ticket.client.phone}</p>}
                                {ticket.client.email && <p className="text-xs text-gray-400">{ticket.client.email}</p>}
                            </InfoCard>
                        )}

                        <InfoCard title="Opérateur (Laveur)">
                            {ticket.assignedTo ? (
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold text-sm
                                                flex items-center justify-center shrink-0 uppercase">
                                        {ticket.assignedTo.name?.charAt(0) ?? '?'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 leading-tight">{ticket.assignedTo.name}</p>
                                        <p className="text-xs text-purple-500 font-medium capitalize mt-0.5">
                                            {ticket.assignedTo.role === 'laveur' ? '🧹 Laveur' : ticket.assignedTo.role}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5 text-gray-400">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                        <UserX size={18} className="text-gray-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-400">Non assigné</p>
                                        <p className="text-xs text-gray-300 mt-0.5">Aucun laveur affecté</p>
                                    </div>
                                </div>
                            )}
                        </InfoCard>

                        <InfoCard title="Chronologie">
                            <div className="space-y-2">
                                {[
                                    { label: 'Créé', value: ticket.created_at },
                                    { label: 'Démarré', value: ticket.started_at },
                                    { label: 'Terminé', value: ticket.completed_at },
                                    { label: 'Payé', value: ticket.paid_at },
                                    { label: 'Livraison prévue', value: ticket.due_at },
                                ].filter(t => t.value).map(t => (
                                    <div key={t.label} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">{t.label}</span>
                                        <span className="text-gray-700 font-medium tabular-nums text-xs">{formatDateTime(t.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </InfoCard>
                    </div>

                    <div className="lg:col-span-2 space-y-4">

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Services</h3>
                                <span className="text-2xl font-extrabold text-slate-800 tabular-nums">{formatMAD(ticket.total_cents)}</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                        <th className="text-left px-5 py-2.5">Service</th>
                                        <th className="text-center px-3 py-2.5">Qté</th>
                                        <th className="text-right px-3 py-2.5">P.U.</th>
                                        <th className="text-right px-5 py-2.5">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {ticket.services?.map(line => (
                                        <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 font-medium text-gray-800">{line.service_name}</td>
                                            <td className="px-3 py-3 text-center text-gray-500">{line.quantity}</td>
                                            <td className="px-3 py-3 text-right text-gray-500 tabular-nums">{formatMAD(line.unit_price_cents)}</td>
                                            <td className="px-5 py-3 text-right font-bold text-gray-900 tabular-nums">{formatMAD(line.line_total_cents)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {(ticket.discount_cents > 0) && (
                                    <tfoot className="border-t border-gray-200">
                                        <tr>
                                            <td colSpan={3} className="px-5 py-2 text-sm text-gray-500">Remise</td>
                                            <td className="px-5 py-2 text-right text-red-600 font-medium">−{formatMAD(ticket.discount_cents)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* Produits vendus */}
                        {ticket.products?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Produits</h3>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                            <th className="text-left px-5 py-2.5">Produit</th>
                                            <th className="text-center px-3 py-2.5">Qté</th>
                                            <th className="text-right px-3 py-2.5">P.U.</th>
                                            <th className="text-right px-5 py-2.5">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {ticket.products.map(line => (
                                            <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3 font-medium text-gray-800">
                                                    {line.product_name}
                                                    {line.is_free && (
                                                        <span className="ml-2 text-[10px] font-semibold text-purple-600 bg-purple-100 rounded-full px-1.5 py-0.5">Gratuit</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center text-gray-500">{line.quantity}</td>
                                                <td className="px-3 py-3 text-right text-gray-500 tabular-nums">{formatMAD(line.unit_price_cents)}</td>
                                                <td className="px-5 py-3 text-right font-bold tabular-nums">
                                                    {line.is_free
                                                        ? <span className="text-purple-600 font-semibold">Offert</span>
                                                        : <span className="text-gray-900">{formatMAD(line.line_total_cents)}</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {ticket.payment ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                                <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">✓ Paiement encaissé</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    <PayInfo label="Mode" value={METHOD_LABELS_PRINT[ticket.payment.method] ?? ticket.payment.method} />
                                    {ticket.payment.amount_cash_cents > 0 && <PayInfo label="Espèces" value={formatMAD(ticket.payment.amount_cash_cents)} />}
                                    {ticket.payment.amount_card_cents > 0 && <PayInfo label="Carte" value={formatMAD(ticket.payment.amount_card_cents)} />}
                                    {ticket.payment.amount_mobile_cents > 0 && <PayInfo label="Mobile" value={formatMAD(ticket.payment.amount_mobile_cents)} />}
                                    {(ticket.payment.amount_wire_cents ?? 0) > 0 && <PayInfo label="Virement" value={formatMAD(ticket.payment.amount_wire_cents)} />}
                                    {(ticket.payment.change_given_cents ?? 0) > 0 && (
                                        <PayInfo label="Rendu monnaie" value={formatMAD(ticket.payment.change_given_cents)} accent />
                                    )}
                                    {ticket.payment.processed_by && (
                                        <PayInfo label="Encaissé par" value={ticket.payment.processed_by.name} />
                                    )}
                                    {ticket.paid_at && <PayInfo label="Le" value={formatDateTime(ticket.paid_at)} />}
                                </div>
                            </div>
                        ) : isPartial && ticket.balance_due_cents > 0 ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                                <h3 className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-3">⏳ Solde restant dû</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    <PayInfo label="Total ticket" value={formatMAD(ticket.total_cents)} />
                                    {ticket.payment && <PayInfo label="Déjà encaissé" value={formatMAD(ticket.payment.amount_cents)} />}
                                    <PayInfo label="Reste dû" value={formatMAD(ticket.balance_due_cents)} accent />
                                </div>
                            </div>
                        ) : ticket.payment_mode ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                                <Banknote size={20} className="text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Mode de paiement prévu</p>
                                    <p className="font-semibold text-amber-900 mt-0.5">
                                        {METHOD_LABELS_PRINT[ticket.payment_mode] ?? ticket.payment_mode}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {isCancelled && ticket.cancelled_reason && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                                <h3 className="text-xs font-bold text-red-700 uppercase tracking-widest mb-2">Raison d'annulation</h3>
                                <p className="text-sm text-red-800">{ticket.cancelled_reason}</p>
                            </div>
                        )}

                        {ticket.notes && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                                <h3 className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-2">Notes</h3>
                                <p className="text-sm text-yellow-900">{ticket.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* --- Helpers --- */
function InfoCard({ title, children }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{title}</h3>
            {children}
        </div>
    );
}

function PayInfo({ label, value, accent }) {
    return (
        <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={clsx('font-semibold mt-0.5', accent ? 'text-emerald-700' : 'text-gray-800')}>{value}</p>
        </div>
    );
}
