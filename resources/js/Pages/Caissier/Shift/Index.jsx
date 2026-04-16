import AppLayout from '@/Layouts/AppLayout';
import { formatMAD, formatDateTime } from '@/utils/format';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, History, Printer, ShoppingCart, Smartphone, Wifi } from 'lucide-react';
import clsx from 'clsx';

/* ─── Carte statistique (reserved for future use) ─── */
function _StatCard({ label, value, sub, color = 'slate', icon: Icon }) {
    const colors = {
        slate: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
        red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    };
    return (
        <div className={clsx('rounded-2xl border p-5', colors[color])}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
                </div>
                {Icon && <Icon size={22} className="opacity-40 mt-1" />}
            </div>
        </div>
    );
}

/* ─── POS récap (ventes express du shift) ─── */
function POSBreakdown({ pd }) {
    if (!pd) return null;

    const count    = pd.pos_count ?? 0;
    const revenue  = pd.pos_revenue_cents ?? 0;
    const cash     = pd.pos_cash_cents ?? 0;
    const card     = pd.pos_card_cents ?? 0;
    const mobile   = pd.pos_mobile_cents ?? 0;
    const wire     = pd.pos_wire_cents ?? 0;

    if (count === 0) return null;

    const rows = [
        { icon: Banknote,   label: 'Espèces',  color: 'text-green-600',  bg: 'bg-green-50',  value: cash },
        { icon: CreditCard, label: 'Carte',    color: 'text-blue-600',   bg: 'bg-blue-50',   value: card },
        { icon: Smartphone, label: 'Mobile',   color: 'text-violet-600', bg: 'bg-violet-50', value: mobile },
        { icon: Wifi,       label: 'Virement', color: 'text-cyan-600',   bg: 'bg-cyan-50',   value: wire },
    ].filter(r => r.value > 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
                <ShoppingCart size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ventes POS du shift
                </h3>
                <span className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full px-2 py-0.5">
                    {count} vente{count > 1 ? 's' : ''}
                </span>
            </div>
            <div className="space-y-2">
                {rows.map(({ icon: Icon, label, color, bg, value }) => (
                    <div key={label} className={clsx('flex items-center justify-between rounded-xl px-4 py-2.5', bg)}>
                        <div className="flex items-center gap-2.5">
                            <Icon size={15} className={color} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                        </div>
                        <span className={clsx('text-sm font-bold', color)}>{formatMAD(value)}</span>
                    </div>
                ))}
                <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-emerald-700 mt-1">
                    <span className="text-sm font-bold text-white">Total POS encaissé</span>
                    <span className="text-base font-bold text-white">{formatMAD(revenue)}</span>
                </div>
            </div>
        </div>
    );
}

/* ─── Formulaire ouverture shift ─── */
function OpenShiftForm() {
    const { data, setData, post, processing, errors } = useForm({
        opening_cash_cents: 0,
    });

    function submit(e) {
        e.preventDefault();
        post(route('caissier.shift.store'));
    } return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Ouvrir un shift</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Saisissez le fond de caisse de départ en centimes.</p>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="opening_cash" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fond de caisse initial
                    </label>
                    <div className="relative">
                        <input
                            id="opening_cash"
                            type="number" min={0} step={100}
                            value={data.opening_cash_cents}
                            onChange={e => setData('opening_cash_cents', parseInt(e.target.value) || 0)}
                            className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 pr-16 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">MAD</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">= {formatMAD(data.opening_cash_cents)}</p>
                    {errors.opening_cash_cents && <p className="text-xs text-red-600 mt-1">{errors.opening_cash_cents}</p>}
                    {errors.shift && <p className="text-xs text-red-600 mt-1">{errors.shift}</p>}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                    {processing ? 'Ouverture…' : '▶ Ouvrir le shift'}
                </button>
            </form>
        </div>
    );
}

/* ─── Breakdown récap par mode de paiement ─── */
function PaymentBreakdown({ bd }) {
    if (!bd) return null;

    const cash = bd.cash_cents ?? 0;
    const card = bd.card_cents ?? 0;
    const mobile = bd.mobile_cents ?? 0;
    const wire = bd.wire_cents ?? 0;
    const credit = bd.credit_deferred_cents ?? 0;
    const creditCount = bd.credit_count ?? 0;
    const totalCollected = cash + card + mobile + wire;
    const pendingBalance = bd.pending_balance_cents ?? 0;

    const rows = [
        { icon: Banknote, label: 'Espèces', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', value: cash },
        { icon: CreditCard, label: 'Carte', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', value: card },
        { icon: Smartphone, label: 'Mobile', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', value: mobile },
        { icon: Wifi, label: 'Virement', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20', value: wire },
    ].filter(r => r.value > 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                Récap encaissements du shift
            </h3>

            {rows.length === 0 && !creditCount ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    Aucun paiement enregistré pour ce shift.
                </p>
            ) : (
                <div className="space-y-2">
                    {rows.map(({ icon: Icon, label, color, bg, value }) => (
                        <div key={label} className={clsx('flex items-center justify-between rounded-xl px-4 py-2.5', bg)}>
                            <div className="flex items-center gap-2.5">
                                <Icon size={15} className={color} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                            </div>
                            <span className={clsx('text-sm font-bold', color)}>{formatMAD(value)}</span>
                        </div>
                    ))}

                    {/* Crédit différé — hors encaissement */}
                    {creditCount > 0 && (
                        <div className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-orange-50 dark:bg-orange-900/20">
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle size={15} className="text-orange-500 dark:text-orange-400" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Crédit différé
                                    <span className="ml-1.5 text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-full px-1.5 py-0.5">
                                        {creditCount}×
                                    </span>
                                </span>
                            </div>
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                {formatMAD(credit)} <span className="text-xs font-normal opacity-70">non encaissé</span>
                            </span>
                        </div>
                    )}

                    {/* Soldes en attente (tickets partial) */}
                    {pendingBalance > 0 && (
                        <div className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Soldes restants (partial)</span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                {formatMAD(pendingBalance)} <span className="text-xs font-normal opacity-70">dû</span>
                            </span>
                        </div>
                    )}

                    {/* Total collecté */}
                    <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-gray-900 dark:bg-slate-600 mt-1">
                        <span className="text-sm font-bold text-white">Total encaissé</span>
                        <span className="text-base font-bold text-white">{formatMAD(totalCollected)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Formulaire fermeture shift ─── */
function CloseShiftForm({ shift, breakdown }) {
    const [confirm, setConfirm] = useState(false);
    const { data, setData, patch, processing, errors } = useForm({
        closing_cash_cents: 0,
        notes: '',
    });

    function submit(e) {
        e.preventDefault();
        patch(route('caissier.shift.close', shift.id));
    }

    const diff = data.closing_cash_cents - (shift.expected_cash_cents ?? 0);
    const openedAt = new Date(shift.opened_at);
    const duration = Math.floor((Date.now() - openedAt.getTime()) / 60000);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return (<div className="space-y-6">
        {/* Shift actif — résumé */}
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Shift en cours</p>
                <p className="text-sm text-green-700 dark:text-green-400">
                    Ouvert à {formatDateTime(shift.opened_at)} ·{' '}
                    fond initial {formatMAD(shift.opening_cash_cents)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                    Durée : {hours > 0 ? `${hours}h ` : ''}{minutes}min
                </p>
            </div>
        </div>

        {/* Récap paiements */}
        <PaymentBreakdown bd={breakdown} />

        {/* Formulaire clôture */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Clôturer le shift</h2>

            {!confirm ? (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="closing_cash" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Caisse réelle comptée
                        </label>
                        <div className="relative">
                            <input
                                id="closing_cash"
                                type="number" min={0} step={100}
                                value={data.closing_cash_cents}
                                onChange={e => setData('closing_cash_cents', parseInt(e.target.value) || 0)}
                                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 pr-16 text-lg font-semibold focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">MAD</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            = {formatMAD(data.closing_cash_cents)}
                            {breakdown && (
                                <span className="ml-2 text-gray-300 dark:text-gray-500">
                                    · Espèces attendues : {formatMAD((shift.opening_cash_cents ?? 0) + (breakdown.cash_cents ?? 0))}
                                </span>
                            )}
                        </p>
                        {errors.closing_cash_cents && <p className="text-xs text-red-600 mt-1">{errors.closing_cash_cents}</p>}
                    </div>

                    <textarea
                        placeholder="Notes (optionnel)…"
                        value={data.notes}
                        onChange={e => setData('notes', e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
                    />

                    <button
                        type="button"
                        onClick={() => setConfirm(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        Vérifier & Clôturer
                    </button>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    {/* Récapitulatif */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Fond initial</p>
                            <p className="font-bold text-gray-900 dark:text-white">{formatMAD(shift.opening_cash_cents)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Comptée</p>
                            <p className="font-bold text-gray-900 dark:text-white">{formatMAD(data.closing_cash_cents)}</p>
                        </div>
                        {breakdown && (breakdown.card_cents > 0 || breakdown.mobile_cents > 0 || breakdown.wire_cents > 0) && (
                            <>
                                {breakdown.card_cents > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                                        <p className="text-blue-500 dark:text-blue-400 text-xs">Carte</p>
                                        <p className="font-bold text-blue-700 dark:text-blue-300">{formatMAD(breakdown.card_cents)}</p>
                                    </div>
                                )}
                                {breakdown.mobile_cents > 0 && (
                                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
                                        <p className="text-violet-500 dark:text-violet-400 text-xs">Mobile</p>
                                        <p className="font-bold text-violet-700 dark:text-violet-300">{formatMAD(breakdown.mobile_cents)}</p>
                                    </div>
                                )}
                                {breakdown.wire_cents > 0 && (
                                    <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-3">
                                        <p className="text-cyan-500 dark:text-cyan-400 text-xs">Virement</p>
                                        <p className="font-bold text-cyan-700 dark:text-cyan-300">{formatMAD(breakdown.wire_cents)}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {diff !== 0 && (
                        <div className={clsx(
                            'rounded-xl p-4 flex items-center gap-3',
                            diff > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                        )}>
                            <AlertTriangle size={20} className={diff > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />
                            <div>
                                <p className={clsx('font-semibold text-sm', diff > 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300')}>
                                    {diff > 0 ? `Excédent de ${formatMAD(Math.abs(diff))}` : `Déficit de ${formatMAD(Math.abs(diff))}`}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Vérifiez avant de confirmer</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setConfirm(false)} className="flex-1 border border-gray-300 dark:border-slate-600 dark:text-gray-300 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                            Retour
                        </button>
                        <button type="submit" disabled={processing} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-50">
                            {processing ? 'Fermeture…' : '✕ Confirmer la clôture'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    </div>
    );
}

/* ─── Page principale ─── */
export default function ShiftIndex({ activeShift, paymentBreakdown, posBreakdown, history }) {
    return (
        <AppLayout title="Shift / Caisse">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift & Caisse</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez l'ouverture et la fermeture de votre caisse.</p>
                    </div>
                    <Link
                        href={route('caissier.shift.history')}
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <History size={15} />
                        Historique complet
                    </Link>
                </div>

                {activeShift ? (
                    <CloseShiftForm shift={activeShift} breakdown={paymentBreakdown} />
                ) : (
                    <OpenShiftForm />
                )}

                {/* Ventes POS du shift actif */}
                {activeShift && <POSBreakdown pd={posBreakdown} />}

                {/* Historique récent */}
                {history.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Derniers shifts
                            </h2>
                            <Link href={route('caissier.shift.history')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                Voir tout →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {history.map(s => {
                                const diff = (s.difference_cents ?? 0);
                                return (
                                    <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0 gap-4 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                                {formatDateTime(s.opened_at)} → {formatDateTime(s.closed_at)}
                                            </p>
                                            <p className="text-gray-400 dark:text-gray-500 text-xs">
                                                Fond : {formatMAD(s.opening_cash_cents)} · Clôture : {formatMAD(s.closing_cash_cents)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={clsx(
                                                'text-xs font-bold px-2.5 py-1 rounded-full',
                                                diff === 0 ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300' :
                                                    diff > 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :
                                                        'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                            )}>
                                                {diff === 0 ? 'OK' : diff > 0 ? `+${formatMAD(diff)}` : formatMAD(diff)}
                                            </span>
                                            <Link
                                                href={route('caissier.shift.rapport', s.id)}
                                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                title="Rapport Z"
                                            >
                                                <Printer size={12} /> Z
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
