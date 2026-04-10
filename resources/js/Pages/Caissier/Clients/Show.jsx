import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Car, Ticket, Star, Gift } from 'lucide-react';
import clsx from 'clsx';
import { formatMAD } from '@/utils/format';
import { TICKET_STATUS } from '@/utils/constants';

const TIER_CONFIG = {
    standard: { label: 'Standard', bar: 'bg-gray-400', text: 'text-gray-500', dot: 'bg-gray-400' },
    silver: { label: 'Silver', bar: 'bg-slate-400', text: 'text-slate-500', dot: 'bg-slate-400' },
    gold: { label: 'Gold', bar: 'bg-amber-400', text: 'text-amber-600', dot: 'bg-amber-400' },
    platinum: { label: 'Platinum', bar: 'bg-violet-500', text: 'text-violet-700', dot: 'bg-violet-500' },
};

const STATUS_COLOR = Object.fromEntries(
    Object.entries(TICKET_STATUS).map(([k, v]) => [k, v.cls])
);
const STATUS_LABEL = Object.fromEntries(
    Object.entries(TICKET_STATUS).map(([k, v]) => [k, v.label])
);

const TYPE_CONFIG = {
    earned: { label: '+pts', color: 'text-emerald-600 dark:text-emerald-400' },
    redeemed: { label: '-pts', color: 'text-rose-500 dark:text-rose-400' },
    adjusted: { label: 'Ajusté', color: 'text-blue-500 dark:text-blue-400' },
    expired: { label: 'Exp.', color: 'text-gray-400' },
};

function PointsBar({ client, tiers }) {
    const tier = client.loyalty_tier;
    const tierData = tiers[tier];
    const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.standard;
    if (!tierData?.next) {
        return <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">🎖️ Palier Platinum atteint !</p>;
    }
    const progress = Math.min(100, Math.round(((client.total_visits - tierData.min_visits) / (tierData.next - tierData.min_visits)) * 100));
    const nextKey = Object.keys(tiers).find(k => tiers[k].min_visits === tierData.next);
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
                <span className={clsx('font-bold', cfg.text)}>{cfg.label}</span>
                <span>{tierData.next - client.total_visits} visite{tierData.next - client.total_visits > 1 ? 's' : ''} pour {TIER_CONFIG[nextKey]?.label}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full', cfg.bar)} style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

export default function ClientShow({ client, recentTickets, transactions, tiers }) {
    const cfg = TIER_CONFIG[client.loyalty_tier] ?? TIER_CONFIG.standard;

    return (
        <AppLayout title={`Client — ${client.name}`}>
            <div className="max-w-3xl mx-auto space-y-6">
                <Link href={route('caissier.clients.index')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <ArrowLeft size={16} /> Retour clients
                </Link>

                {/* Header card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {client.phone ?? ''}{client.email ? ` · ${client.email}` : ''}
                            </p>
                            {client.vehicle_plate && (
                                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                                    <Car size={12} />{client.vehicle_plate}
                                </span>
                            )}
                        </div>
                        {/* Stats */}
                        <div className="flex gap-4 flex-wrap sm:text-right">
                            <div>
                                <p className="text-2xl font-black text-amber-500">{client.loyalty_points}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Points</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-blue-500">{client.total_visits}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Visites</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-emerald-500">{formatMAD(client.total_spent_cents)}</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">CA total</p>
                            </div>
                        </div>
                    </div>

                    {/* Loyalty badge + progress */}
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Gift size={16} className={cfg.text} />
                            <span className={clsx('text-sm font-bold', cfg.text)}>{cfg.label}</span>
                            <span className="text-xs text-gray-400">· {client.loyalty_points} pts ≈ {formatMAD(client.loyalty_points * 100)} de réduction</span>
                        </div>
                        <PointsBar client={client} tiers={tiers} />
                    </div>
                </div>

                {/* Recent tickets */}
                {recentTickets.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Ticket size={14} /> Derniers tickets
                        </h2>
                        <div className="space-y-2">
                            {recentTickets.map(t => (
                                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{t.ticket_number}</span>
                                            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_COLOR[t.status])}>
                                                {STATUS_LABEL[t.status]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(t.created_at).toLocaleDateString('fr-FR')}
                                            {t.loyalty_points_earned > 0 && <span className="ml-2 text-amber-500 font-semibold">+{t.loyalty_points_earned} pts</span>}
                                        </p>
                                    </div>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums text-sm">{formatMAD(t.total_cents)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loyalty transactions */}
                {transactions.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                            <Star size={14} /> Historique fidélité
                        </h2>
                        <div className="space-y-2">
                            {transactions.map(tx => {
                                const tcfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjusted;
                                return (
                                    <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{tx.note ?? tcfg.label}</p>
                                            <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={clsx('font-black tabular-nums', tcfg.color)}>
                                                {tx.points > 0 ? '+' : ''}{tx.points} pts
                                            </p>
                                            <p className="text-xs text-gray-400">solde: {tx.balance_after}</p>
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
