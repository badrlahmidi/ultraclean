import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    XCircle, Banknote, CreditCard, Smartphone, ArrowRightLeft, Receipt,
} from 'lucide-react';
import { formatMAD } from '@/utils/format';
import clsx from 'clsx';

/**
 * SalePaymentModal — Modal d'encaissement pour le Point de Vente (POS).
 *
 * Plus simple que PaymentModal des tickets :
 *   - Pas de fidélité ni d'avance / crédit
 *   - Envoie les données via router.post vers caissier.pos.store
 *
 * Props :
 *   totalCents   — montant total de la vente en centimes
 *   saleData     — { client_id, products, discount_type, discount_value, notes }
 *   onClose      — fn()  appelé à la fermeture (avant soumission ou annulation)
 */
export default function SalePaymentModal({ totalCents, saleData, onClose }) {
    const { enabledPaymentMethods } = usePage().props;

    const ALL_METHODS = [
        { id: 'cash',   label: 'Espèces',   icon: Banknote },
        { id: 'card',   label: 'Carte',      icon: CreditCard },
        { id: 'mobile', label: 'Mobile',     icon: Smartphone },
        { id: 'wire',   label: 'Virement',   icon: ArrowRightLeft },
        { id: 'mixed',  label: 'Mixte',      icon: Receipt },
    ];

    const methods = ALL_METHODS.filter(m =>
        !enabledPaymentMethods || enabledPaymentMethods.includes(m.id)
    );

    const [method, setMethod] = useState(methods[0]?.id ?? 'cash');
    const [cashCents, setCashCents] = useState(totalCents);
    const [reference, setReference] = useState('');
    const [processing, setProcessing] = useState(false);

    const totalMAD = totalCents / 100;
    const cashMAD  = cashCents / 100;
    const changeCents = method === 'cash' ? Math.max(0, cashCents - totalCents) : 0;

    // Quick-amount buttons for cash
    const rawQuick = [
        totalMAD,
        Math.ceil(totalMAD / 50) * 50,
        Math.ceil(totalMAD / 100) * 100,
        Math.ceil(totalMAD / 200) * 200,
    ];
    const quickAmounts = [...new Set(rawQuick.filter(v => v > 0))].slice(0, 4);

    function handleMethodChange(m) {
        setMethod(m);
        setCashCents(totalCents);
    }

    function submit(e) {
        e.preventDefault();
        setProcessing(true);

        router.post(route('caissier.pos.store'), {
            ...saleData,
            payment_method:    method,
            payment_reference: reference || null,
        }, {
            onError: () => setProcessing(false),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Encaisser</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Point de Vente</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 -mr-1 rounded-xl hover:bg-gray-100 text-gray-400 touch-manipulation"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">

                    {/* Montant */}
                    <div className="bg-slate-800 rounded-2xl p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                            Montant à encaisser
                        </p>
                        <p className="text-4xl font-black text-white tabular-nums">
                            {formatMAD(totalCents)}
                        </p>
                    </div>

                    {/* Mode de paiement */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Mode de paiement
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {methods.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleMethodChange(m.id)}
                                    className={clsx(
                                        'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all',
                                        method === m.id
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    )}
                                >
                                    <m.icon size={18} />
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Montant espèces + rendu monnaie */}
                    {method === 'cash' && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Montant reçu
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {quickAmounts.map(q => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => setCashCents(Math.round(q * 100))}
                                        className={clsx(
                                            'px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors',
                                            cashMAD === q
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        )}
                                    >
                                        {q} MAD
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={cashMAD || ''}
                                onChange={e => setCashCents(Math.round((parseFloat(e.target.value) || 0) * 100))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                placeholder="0.00"
                            />
                            {changeCents > 0 && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                                    <p className="text-xs text-emerald-600 font-medium">Monnaie à rendre</p>
                                    <p className="text-2xl font-black text-emerald-700">{formatMAD(changeCents)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Référence (virement / mobile) */}
                    {['wire', 'mobile', 'card'].includes(method) && (
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                Référence (optionnel)
                            </label>
                            <input
                                type="text"
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                                placeholder="N° de transaction, référence…"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                        </div>
                    )}

                    {/* Bouton valider */}
                    <button
                        type="submit"
                        disabled={processing || (method === 'cash' && cashCents < totalCents)}
                        className={clsx(
                            'w-full py-3.5 rounded-xl font-bold text-sm transition-colors',
                            !processing && !(method === 'cash' && cashCents < totalCents)
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        {processing ? 'Enregistrement…' : `Confirmer l'encaissement`}
                    </button>

                    {method === 'cash' && cashCents < totalCents && cashCents > 0 && (
                        <p className="text-xs text-red-600 text-center">
                            Montant insuffisant (manque {formatMAD(totalCents - cashCents)})
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
