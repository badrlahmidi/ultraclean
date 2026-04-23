import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Printer, XCircle, CheckCircle2, ShoppingCart } from 'lucide-react';
import { formatMAD, formatDate, formatDateTime } from '@/utils/format';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';

const PAYMENT_LABELS = {
    cash:   'Espèces',
    card:   'Carte bancaire',
    mobile: 'Paiement mobile',
    wire:   'Virement',
    mixed:  'Mixte',
};

const STATUS_COLORS = {
    paid:      'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-600',
};
const STATUS_LABELS = {
    paid:      'Payée',
    cancelled: 'Annulée',
};

/** Modal d'annulation */
function CancelModal({ sale, onClose }) {
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    function submit(e) {
        e.preventDefault();
        if (!reason.trim()) return;
        setProcessing(true);
        router.post(route('caissier.pos.cancel', sale.ulid), { reason }, {
            onError: () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Annuler la vente</h2>
                <p className="text-sm text-gray-500">
                    Le stock des produits sera restitué automatiquement.
                </p>
                <form onSubmit={submit} className="space-y-3">
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder="Motif d'annulation (requis)…"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                        required
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !reason.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Annulation…' : 'Confirmer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function POSShow({ sale, settings }) {
    const [showCancelModal, setShowCancelModal] = useState(false);

    const isPaid      = sale.status === 'paid';
    const isCancelled = sale.status === 'cancelled';

    // Public receipt URL (using ulid)
    const receiptUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/caisse/pos/${sale.ulid}`
        : '';

    return (
        <AppLayout>
            <Head title={`Vente ${sale.sale_number}`} />

            {showCancelModal && (
                <CancelModal sale={sale} onClose={() => setShowCancelModal(false)} />
            )}

            {/* Actions (screen only) */}
            <div className="flex items-center justify-between mb-4 print:hidden">
                <Link
                    href={route('caissier.pos.index')}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                    <ArrowLeft size={15} /> Retour aux ventes
                </Link>

                <div className="flex gap-2">
                    {isPaid && (
                        <button
                            onClick={() => setShowCancelModal(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                        >
                            <XCircle size={14} /> Annuler
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                        <Printer size={15} /> Imprimer
                    </button>
                    <Link
                        href={route('caissier.pos.create')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                        <ShoppingCart size={15} /> Nouvelle vente
                    </Link>
                </div>
            </div>

            {/* Statut annulation (screen only) */}
            {isCancelled && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 print:hidden">
                    <p className="text-sm font-semibold text-red-700">Vente annulée</p>
                    {sale.cancelled_reason && (
                        <p className="text-xs text-red-600 mt-1">{sale.cancelled_reason}</p>
                    )}
                </div>
            )}

            {/*
             * ─── REÇU DE VENTE ────────────────────────────────────────────────────
             * Cette section est imprimable (@media print).
             * Elle imite la mise en page d'un ticket de caisse.
             */}
            <div className="max-w-md mx-auto">
                <div
                    id="receipt"
                    className={clsx(
                        'bg-white rounded-2xl border border-gray-200 p-6 space-y-4',
                        'print:rounded-none print:border-none print:shadow-none print:p-4'
                    )}
                >
                    {/* En-tête centre */}
                    <div className="text-center space-y-1">
                        {settings?.center_logo && (
                            <img
                                src={settings.center_logo}
                                alt="Logo"
                                className="h-12 mx-auto object-contain mb-2"
                            />
                        )}
                        <h2 className="font-bold text-lg text-gray-900">
                            {settings?.center_name || 'Centre de lavage auto'}
                        </h2>
                        {settings?.center_address && (
                            <p className="text-xs text-gray-500">{settings.center_address}</p>
                        )}
                        {settings?.center_phone && (
                            <p className="text-xs text-gray-500">Tél : {settings.center_phone}</p>
                        )}
                    </div>

                    <hr className="border-dashed border-gray-300" />

                    {/* Numéro & date */}
                    <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                            REÇU DE VENTE
                        </p>
                        <p className="text-lg font-black text-gray-800 font-mono mt-1">
                            {sale.sale_number}
                        </p>
                        <div className="flex justify-center gap-4 text-xs text-gray-500 mt-1">
                            <span>Date : {formatDateTime(sale.paid_at ?? sale.created_at)}</span>
                        </div>
                        {sale.creator && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                Caissier : {sale.creator.name}
                            </p>
                        )}
                    </div>

                    {/* Client */}
                    {sale.client && (
                        <>
                            <hr className="border-dashed border-gray-300" />
                            <div className="text-sm">
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Client</p>
                                <p className="font-medium text-gray-800">{sale.client.name}</p>
                                {sale.client.phone && (
                                    <p className="text-xs text-gray-500">{sale.client.phone}</p>
                                )}
                            </div>
                        </>
                    )}

                    <hr className="border-dashed border-gray-300" />

                    {/* Lignes */}
                    <div>
                        <div className="grid grid-cols-12 text-[10px] font-semibold uppercase text-gray-400 mb-2 gap-1">
                            <span className="col-span-5">Article</span>
                            <span className="col-span-2 text-center">Qté</span>
                            <span className="col-span-2 text-right">P.U.</span>
                            <span className="col-span-3 text-right">Total</span>
                        </div>
                        <div className="space-y-1.5">
                            {sale.lines.map(line => (
                                <div key={line.id} className="grid grid-cols-12 text-sm gap-1 items-baseline">
                                    <span className="col-span-5 text-gray-800 text-xs leading-snug truncate" title={line.product_name}>
                                        {line.product_name}
                                        {line.product_sku && (
                                            <span className="block text-[9px] text-gray-400">{line.product_sku}</span>
                                        )}
                                    </span>
                                    <span className="col-span-2 text-center text-xs text-gray-600">
                                        {line.quantity % 1 === 0 ? line.quantity : line.quantity.toFixed(2)}
                                    </span>
                                    <span className="col-span-2 text-right text-xs text-gray-600">
                                        {(line.unit_price_cents / 100).toFixed(2)}
                                    </span>
                                    <span className="col-span-3 text-right text-xs font-semibold text-gray-800">
                                        {line.is_free
                                            ? <span className="text-emerald-600">Offert</span>
                                            : `${(line.line_total_cents / 100).toFixed(2)}`
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <hr className="border-dashed border-gray-300" />

                    {/* Totaux */}
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Sous-total</span>
                            <span>{formatMAD(sale.subtotal_cents)}</span>
                        </div>
                        {sale.discount_cents > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>
                                    Remise
                                    {sale.discount_type === 'percent' && sale.discount_value
                                        ? ` (${sale.discount_value}%)`
                                        : ''}
                                </span>
                                <span>−{formatMAD(sale.discount_cents)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                            <span>TOTAL</span>
                            <span>{formatMAD(sale.total_cents)}</span>
                        </div>
                    </div>

                    <hr className="border-dashed border-gray-300" />

                    {/* Paiement */}
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span className="text-xs font-semibold uppercase text-gray-500">Paiement</span>
                            <span className="font-medium">
                                {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method ?? '—'}
                            </span>
                        </div>
                        {sale.paid_at && (
                            <div className="flex justify-between text-gray-500 text-xs">
                                <span>Payé le</span>
                                <span>{formatDateTime(sale.paid_at)}</span>
                            </div>
                        )}
                        {sale.payment_reference && (
                            <div className="flex justify-between text-gray-500 text-xs">
                                <span>Référence</span>
                                <span className="font-mono">{sale.payment_reference}</span>
                            </div>
                        )}
                    </div>

                    {sale.notes && (
                        <>
                            <hr className="border-dashed border-gray-300" />
                            <p className="text-xs text-gray-500 italic">{sale.notes}</p>
                        </>
                    )}

                    <hr className="border-dashed border-gray-300" />

                    {/* Pied de page */}
                    <div className="text-center space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Merci de votre visite !</p>
                        {receiptUrl && (
                            <div className="flex justify-center">
                                <QRCodeSVG value={receiptUrl} size={64} />
                            </div>
                        )}
                        {isCancelled && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">ANNULÉE</p>
                                {sale.cancelled_reason && (
                                    <p className="text-xs text-red-600 mt-0.5">{sale.cancelled_reason}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #receipt, #receipt * { visibility: visible; }
                    #receipt {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        font-size: 11px;
                    }
                }
            `}</style>
        </AppLayout>
    );
}
