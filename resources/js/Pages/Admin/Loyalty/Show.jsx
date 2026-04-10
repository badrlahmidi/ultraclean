import AppLayout from '@/Layouts/AppLayout';
import { router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, Gift, Star, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { formatMAD } from '@/utils/format';

const TIER_CONFIG = {
    standard: { label: 'Standard', bar: 'bg-gray-400',    text: 'text-gray-600 dark:text-gray-400'    },
    silver:   { label: 'Silver',   bar: 'bg-slate-400',   text: 'text-slate-600 dark:text-slate-300'  },
    gold:     { label: 'Gold',     bar: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400'  },
    platinum: { label: 'Platinum', bar: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-400'},
};

const TYPE_CONFIG = {
    earned:   { label: 'Gagné',   color: 'text-emerald-600 dark:text-emerald-400', sign: '+' },
    redeemed: { label: 'Utilisé', color: 'text-rose-600 dark:text-rose-400',       sign: ''  },
    adjusted: { label: 'Ajusté',  color: 'text-blue-600 dark:text-blue-400',       sign: ''  },
    expired:  { label: 'Expiré',  color: 'text-gray-400 dark:text-gray-500',       sign: '-' },
};

function ProgressToNext({ client, tiers }) {
    const tier = client.loyalty_tier;
    const cfg = TIER_CONFIG[tier];
    const tierData = tiers[tier];
    if (!tierData?.next) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <Star size={16} className="text-violet-500 fill-violet-400" />
                <span className="font-semibold text-violet-700 dark:text-violet-300">Palier maximum atteint 🎉</span>
            </div>
        );
    }
    const nextKey = Object.keys(tiers).find(k => tiers[k].min_visits === tierData.next);
    const prevMin = tierData.min_visits;
    const nextMin = tierData.next;
    const progress = Math.min(100, Math.round(((client.total_visits - prevMin) / (nextMin - prevMin)) * 100));

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
                <span className={cfg.text}>{cfg.label}</span>
                <span className="text-gray-500 dark:text-gray-400">
                    {nextMin - client.total_visits} visite{nextMin - client.total_visits > 1 ? 's' : ''} pour {TIER_CONFIG[nextKey]?.label}
                </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', cfg.bar)} style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
                <span>{prevMin}</span><span>{nextMin} visites</span>
            </div>
        </div>
    );
}

export default function LoyaltyShow({ client, transactions, tiers }) {
    const [delta, setDelta] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function submit(e) {
        e.preventDefault();
        if (!delta || !note) return;
        setSubmitting(true);
        router.post(
            route('admin.loyalty.adjust', client.id),
            { delta: parseInt(delta), note },
            {
                onSuccess: () => { setDelta(''); setNote(''); },
                onFinish: () => setSubmitting(false),
            }
        );
    }

    const cfg = TIER_CONFIG[client.loyalty_tier] ?? TIER_CONFIG.standard;

    return (
        <AppLayout title={`Fidélité — ${client.name}`}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Back */}
                <Link href={route('admin.loyalty.index')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <ArrowLeft size={16} /> Retour fidélité
                </Link>

                {/* Client header */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{client.phone ?? ''} {client.email ? `· ${client.email}` : ''}</p>
                            <span className={clsx('inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-bold', cfg.text, 'bg-gray-50 dark:bg-slate-700')}>
                                <Gift size={14} /> {cfg.label}
                            </span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <div className="text-center">
                                <p className="text-3xl font-black text-amber-500">{client.loyalty_points.toLocaleString('fr-FR')}</p>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Points</p>
                                <p className="text-xs text-gray-400">≈ {formatMAD(client.loyalty_points * 100)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black text-blue-500">{client.total_visits}</p>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Visites</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black text-emerald-500">{formatMAD(client.total_spent_cents)}</p>
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">CA total</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <ProgressToNext client={client} tiers={tiers} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Adjust form */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <TrendingUp size={15} /> Ajustement manuel
                        </h2>
                        <form onSubmit={submit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Points (+ ou −)</label>
                                <input
                                    type="number"
                                    value={delta}
                                    onChange={e => setDelta(e.target.value)}
                                    placeholder="ex : 50 ou -20"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    min="-9999" max="9999"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Motif</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="Raison de l'ajustement…"
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                    maxLength={255}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !delta || !note}
                                className="w-full py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all"
                            >
                                {submitting ? 'Enregistrement…' : 'Appliquer'}
                            </button>
                        </form>
                        <p className="text-xs text-gray-400 mt-3 flex items-start gap-1">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            1 point = 1 MAD de réduction. 1 000 centimes = 1 point gagné.
                        </p>
                    </div>

                    {/* Transaction history */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Calendar size={15} /> Historique des transactions
                        </h2>
                        {transactions.data.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">Aucune transaction</p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.data.map(tx => {
                                    const tcfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjusted;
                                    const sign = tx.points > 0 ? '+' : '';
                                    return (
                                        <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-slate-700 last:border-0">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded', tcfg.color, 'bg-current/10')}>
                                                        {tcfg.label}
                                                    </span>
                                                    {tx.ticket && (
                                                        <span className="font-mono text-xs text-gray-500">#{tx.ticket.ticket_number}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.note ?? '—'}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={clsx('font-black text-base tabular-nums', tcfg.color)}>
                                                    {sign}{tx.points.toLocaleString('fr-FR')} pts
                                                </p>
                                                <p className="text-xs text-gray-400">solde: {tx.balance_after.toLocaleString('fr-FR')}</p>
                                                <p className="text-xs text-gray-300 dark:text-gray-600">
                                                    {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {transactions.last_page > 1 && (
                            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-50 dark:border-slate-700">
                                {transactions.links.map((link, i) => (
                                    <button
                                        key={i}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        className={clsx(
                                            'px-2.5 py-1 rounded-lg text-xs font-semibold',
                                            link.active ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700',
                                            !link.url && 'opacity-30 cursor-not-allowed'
                                        )}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
