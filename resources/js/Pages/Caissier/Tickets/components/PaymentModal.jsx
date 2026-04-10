import { useForm, usePage, router } from '@inertiajs/react';
import {
    XCircle, Banknote, CreditCard, Smartphone, Receipt, AlertTriangle, ArrowRightLeft, Wallet, Clock3, Star,
} from 'lucide-react';
import { formatMAD } from '@/utils/format';
import clsx from 'clsx';

// Points gagnés : 1 pt / 10 MAD — doit rester en sync avec LoyaltyService::CENTS_PER_POINT_EARNED
const CENTS_PER_POINT = 1000;

/**
 * Modal de paiement réutilisable.
 * Props :
 *   ticket   — { id, ticket_number, total_cents }
 *   onClose  — fn()  — appelé après succès OU sur fermeture
 */
export default function PaymentModal({ ticket, onClose }) {
    const { enabledPaymentMethods } = usePage().props;

    // For partial tickets collecting their balance, use balance_due; otherwise full total
    const isBalanceCollection = ticket.status === 'partial' && (ticket.balance_due_cents ?? 0) > 0;
    const amountDueCents = isBalanceCollection ? ticket.balance_due_cents : ticket.total_cents;

    const ALL_METHODS = [
        { id: 'cash', label: 'Espèces', icon: Banknote },
        { id: 'card', label: 'Carte', icon: CreditCard },
        { id: 'mobile', label: 'Mobile', icon: Smartphone },
        { id: 'wire', label: 'Virement', icon: ArrowRightLeft },
        { id: 'mixed', label: 'Mixte', icon: Receipt },
        { id: 'advance', label: 'Avance', icon: Wallet },
        { id: 'credit', label: 'Crédit', icon: Clock3 },
    ];

    // Filter by enabled methods; also hide advance/credit when collecting a balance
    const methods = ALL_METHODS.filter(m => {
        if (enabledPaymentMethods && !enabledPaymentMethods.includes(m.id)) return false;
        if (isBalanceCollection && ['advance', 'credit'].includes(m.id)) return false;
        return true;
    });

    // Quick-bill amounts based on what's actually due
    const totalMAD = amountDueCents / 100;
    const rawQuick = [
        totalMAD,
        Math.ceil(totalMAD / 50) * 50,
        Math.ceil(totalMAD / 100) * 100,
        Math.ceil(totalMAD / 200) * 200,
    ];
    const quickAmounts = [...new Set(rawQuick)].slice(0, 4);

    const { data, setData, processing, errors } = useForm({
        method: methods[0]?.id ?? 'cash',
        amount_cash_cents: amountDueCents,
        amount_card_cents: 0,
        amount_mobile_cents: 0,
        amount_wire_cents: 0,
        note: '',
    });

    const isCredit = data.method === 'credit';
    const isAdvance = data.method === 'advance';
    const isMixed = data.method === 'mixed';
    const isCash = data.method === 'cash';

    const totalPaidCents = isCredit ? 0
        : isMixed ? data.amount_cash_cents + data.amount_card_cents + data.amount_mobile_cents + data.amount_wire_cents
            : isCash ? data.amount_cash_cents
                : data.method === 'card' ? data.amount_card_cents
                    : data.method === 'mobile' ? data.amount_mobile_cents
                        : data.method === 'wire' ? data.amount_wire_cents
                            : isAdvance ? data.amount_cash_cents
                                : 0;

    const changeCents = Math.max(0, totalPaidCents - amountDueCents);
    const insufficient = !isCredit && !isAdvance && totalPaidCents < amountDueCents;
    const canSubmit = !insufficient && (isCredit || totalPaidCents > 0);

    // Will this payment fully close the ticket?
    const isAdvancePartial = isAdvance && totalPaidCents > 0 && totalPaidCents < amountDueCents;
    const willFinalize = !isCredit && !isAdvancePartial && canSubmit;

    // Loyalty preview — only for clients, only on finalizing payments (not credit / partial advance)
    const estimatedPoints = (ticket.client_id && willFinalize)
        ? Math.floor(ticket.total_cents / CENTS_PER_POINT)
        : 0;

    function handleMethodChange(method) {
        setData(d => ({
            ...d,
            method,
            amount_cash_cents: (method === 'cash' || method === 'advance' || method === 'mixed') ? amountDueCents : 0,
            amount_card_cents: method === 'card' ? amountDueCents : 0,
            amount_mobile_cents: method === 'mobile' ? amountDueCents : 0,
            amount_wire_cents: method === 'wire' ? amountDueCents : 0,
        }));
    }

    function submit(e) {
        e.preventDefault();
        router.post(route('caissier.tickets.pay', ticket.ulid), {
            method: data.method,
            amount_cash_cents: data.amount_cash_cents,
            amount_card_cents: data.amount_card_cents,
            amount_mobile_cents: data.amount_mobile_cents,
            amount_wire_cents: data.amount_wire_cents,
            note: data.note,
        }, { onSuccess: onClose });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {isBalanceCollection ? 'Encaisser le solde' : 'Encaisser'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">{ticket.ticket_number}</p>
                    </div>
                    <button onClick={onClose} className="p-3 -mr-1 rounded-xl hover:bg-gray-100 text-gray-400 touch-manipulation">
                        <XCircle size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="p-5 space-y-4">
                    {/* Montant dû */}
                    <div className="bg-slate-800 rounded-2xl p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                            {isBalanceCollection ? 'Solde restant dû' : 'Montant à encaisser'}
                        </p>
                        <p className="text-4xl font-black text-white tabular-nums">{formatMAD(amountDueCents)}</p>
                        {isBalanceCollection && (
                            <p className="text-xs text-slate-400 mt-1">Total ticket : {formatMAD(ticket.total_cents)}</p>
                        )}
                    </div>

                    {/* Méthodes */}
                    <div className="grid grid-cols-4 gap-2">
                        {methods.map(m => (
                            <button key={m.id} type="button" onClick={() => handleMethodChange(m.id)}
                                className={clsx(
                                    'flex flex-col items-center gap-1.5 py-3 min-h-[44px] rounded-xl text-xs font-semibold border-2 transition-all touch-manipulation',
                                    data.method === m.id
                                        ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                )}>
                                <m.icon size={18} />
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Crédit */}
                    {isCredit && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                            <strong>Crédit (paiement différé)</strong> — Le ticket sera marqué comme payé mais le montant reste dû.
                        </div>
                    )}

                    {/* Espèces / Avance */}
                    {!isCredit && (isCash || isAdvance || isMixed) && (
                        <AmountField
                            label={isAdvance ? "Montant de l'avance (MAD)" : 'Espèces reçues (MAD)'}
                            valueCents={data.amount_cash_cents}
                            onChange={v => setData('amount_cash_cents', v)}
                            quickAmounts={isCash ? quickAmounts : undefined}
                        />
                    )}

                    {/* Carte */}
                    {(data.method === 'card' || isMixed) && (
                        <AmountField
                            label="Carte bancaire (MAD)"
                            valueCents={data.amount_card_cents}
                            onChange={v => setData('amount_card_cents', v)}
                            quickAmounts={data.method === 'card' ? quickAmounts : undefined}
                        />
                    )}

                    {/* Virement */}
                    {(data.method === 'wire' || isMixed) && (
                        <AmountField
                            label="Virement (MAD)"
                            valueCents={data.amount_wire_cents}
                            onChange={v => setData('amount_wire_cents', v)}
                        />
                    )}

                    {/* Mobile */}
                    {(data.method === 'mobile' || isMixed) && (
                        <AmountField
                            label="Paiement mobile (MAD)"
                            valueCents={data.amount_mobile_cents}
                            onChange={v => setData('amount_mobile_cents', v)}
                            quickAmounts={data.method === 'mobile' ? quickAmounts : undefined}
                        />
                    )}

                    {/* Reste dû avance */}
                    {isAdvance && data.amount_cash_cents > 0 && data.amount_cash_cents < amountDueCents && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <span className="text-amber-800">
                                Reste dû : <strong>{formatMAD(amountDueCents - data.amount_cash_cents)}</strong>
                            </span>
                        </div>
                    )}

                    {/* Rendu monnaie */}
                    {changeCents > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                            <p className="text-xs text-emerald-600 font-medium mb-0.5">Rendu monnaie</p>
                            <p className="text-2xl font-bold text-emerald-700">{formatMAD(changeCents)}</p>
                        </div>
                    )}

                    {errors.amount && (
                        <p className="text-sm text-red-600 flex items-center gap-1.5">
                            <AlertTriangle size={14} /> {errors.amount}
                        </p>
                    )}
                    {errors.payment && (
                        <p className="text-sm text-red-600 flex items-center gap-1.5">
                            <AlertTriangle size={14} /> {errors.payment}
                        </p>
                    )}

                    <textarea
                        placeholder="Note optionnelle…"
                        value={data.note}
                        onChange={e => setData('note', e.target.value)}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm
                                   focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50"
                    />

                    {/* Points fidélité estimés */}
                    {estimatedPoints > 0 && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <Star size={16} className="text-amber-500 shrink-0 fill-amber-400" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-800">Points fidélité</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    Ce client gagnera <strong>+{estimatedPoints} pts</strong> après ce paiement
                                </p>
                            </div>
                            <span className="text-base font-black text-amber-600">+{estimatedPoints}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={processing || !canSubmit}
                        className={clsx(
                            'w-full py-4 rounded-2xl text-sm font-bold transition-all',
                            canSubmit && !processing
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98]'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        )}
                    >
                        {processing
                            ? 'Enregistrement…'
                            : isCredit ? '✓ Enregistrer en crédit'
                                : isAdvance ? "✓ Enregistrer l'avance"
                                    : isBalanceCollection ? `✓ Solder · ${formatMAD(Math.min(totalPaidCents, amountDueCents))}`
                                        : `✓ Confirmer · ${formatMAD(Math.min(totalPaidCents, amountDueCents))}`}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ─── Champ montant avec coupures rapides ─── */
function AmountField({ label, valueCents, onChange, quickAmounts }) {
    const valueMAD = valueCents / 100;

    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>

            {quickAmounts && quickAmounts.length > 0 && (
                <div className="flex gap-1.5 mb-2">
                    {quickAmounts.map(a => (<button
                        key={a}
                        type="button"
                        onClick={() => onChange(Math.round(a * 100))}
                        className={clsx(
                            'flex-1 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold border transition-all touch-manipulation',
                            valueMAD === a
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'
                        )}
                    >
                        {a} MAD
                    </button>
                    ))}
                </div>
            )}

            <div className="relative">
                <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={valueMAD || ''}
                    onChange={e => onChange(Math.round((parseFloat(e.target.value) || 0) * 100))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold
                               text-right focus:outline-none focus:border-blue-500 bg-white tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                    MAD
                </span>
            </div>
        </div>
    );
}
