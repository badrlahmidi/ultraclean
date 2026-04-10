import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Tag, ChevronLeft, CheckCircle2, XCircle, Clock, TrendingUp, Ticket, BarChart2 } from 'lucide-react';
import { formatMAD, formatDate } from '@/utils/format';
import clsx from 'clsx';
import { TICKET_STATUS } from '@/utils/constants';

/* ── Statut promo ────────────────────────────────────────────────── */
function PromoStatusBadge({ promo }) {
    const now = new Date();
    const from = promo.valid_from ? new Date(promo.valid_from) : null;
    const until = promo.valid_until ? new Date(promo.valid_until) : null;
    const exhausted = promo.max_uses && promo.usages_count >= promo.max_uses;

    if (!promo.is_active)
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"><XCircle size={12} /> Désactivé</span>;
    if (exhausted)
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700"><Clock size={12} /> Épuisé</span>;
    if (until && now > until)
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700"><XCircle size={12} /> Expiré</span>;
    if (from && now < from)
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700"><Clock size={12} /> Planifié</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700"><CheckCircle2 size={12} /> Actif</span>;
}

/* ── Ticket status badge ─────────────────────────────────────────── */
function TicketStatusBadge({ status }) {
    const cfg = TICKET_STATUS[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600' };
    return <span className={clsx('inline-block text-xs font-semibold px-2 py-0.5 rounded-full', cfg.cls)}>{cfg.label}</span>;
}

/* ── Stat card ───────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function PromotionShow({ promotion, usages, revenueGenerated, monthlyUsage }) {
    const maxBarValue = Math.max(...(monthlyUsage?.map(m => m.count) ?? [1]), 1);

    return (
        <AppLayout title={`Promotion — ${promotion.code}`}>
            <Head title={`Promotion : ${promotion.code}`} />

            <div className="space-y-6">
                {/* Back */}
                <Link
                    href={route('admin.promotions.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ChevronLeft size={16} /> Retour aux promotions
                </Link>

                {/* Hero */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start gap-5 flex-wrap">
                        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Tag size={28} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-widest">{promotion.code}</h1>
                                <PromoStatusBadge promo={promotion} />
                            </div>
                            {promotion.label && (
                                <p className="text-gray-500 mt-1">{promotion.label}</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                                <span className="font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                                    {promotion.type === 'percent' ? `${promotion.value}% de remise` : `${formatMAD(promotion.value)} de remise`}
                                </span>
                                {promotion.min_amount_cents > 0 && (
                                    <span className="bg-gray-50 px-2.5 py-1 rounded-lg">
                                        Panier min : {formatMAD(promotion.min_amount_cents)}
                                    </span>
                                )}
                                {promotion.valid_from && (
                                    <span className="bg-gray-50 px-2.5 py-1 rounded-lg">
                                        Du {formatDate(promotion.valid_from)}
                                    </span>
                                )}
                                {promotion.valid_until && (
                                    <span className="bg-gray-50 px-2.5 py-1 rounded-lg">
                                        Au {formatDate(promotion.valid_until)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={Ticket}
                        label="Utilisations totales"
                        value={promotion.usages_count ?? 0}
                        sub={promotion.max_uses ? `sur ${promotion.max_uses} max` : 'illimitées'}
                        color="blue"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="CA généré (tickets payés)"
                        value={formatMAD(revenueGenerated ?? 0)}
                        color="green"
                    />
                    <StatCard
                        icon={BarChart2}
                        label="Taux d'épuisement"
                        value={promotion.max_uses
                            ? `${Math.round(((promotion.usages_count ?? 0) / promotion.max_uses) * 100)}%`
                            : '—'
                        }
                        color="purple"
                    />
                    <StatCard
                        icon={Tag}
                        label="Remise totale accordée"
                        value={formatMAD(
                            usages.reduce((sum, u) => sum + (u.discount_cents ?? 0), 0)
                        )}
                        color="amber"
                    />
                </div>

                {/* Tendance mensuelle */}
                {monthlyUsage && monthlyUsage.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <BarChart2 size={16} className="text-blue-500" />
                            Utilisations sur 6 mois
                        </h2>
                        <div className="flex items-end gap-2 h-24">
                            {monthlyUsage.map(m => (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-semibold text-gray-600">{m.count}</span>
                                    <div
                                        className="w-full bg-purple-400 rounded-t-lg transition-all"
                                        style={{ height: `${Math.max(4, (m.count / maxBarValue) * 72)}px` }}
                                    />
                                    <span className="text-xs text-gray-400 tabular-nums">{m.month.slice(5)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Historique utilisations */}
                <div className="bg-white rounded-2xl border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Ticket size={16} className="text-purple-500" />
                        <h2 className="text-sm font-semibold text-gray-700">
                            Tickets associés ({usages.length})
                        </h2>
                    </div>

                    {usages.length === 0 ? (
                        <div className="p-12 text-center">
                            <Tag size={36} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-400 text-sm">Aucune utilisation enregistrée.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {usages.map(u => (
                                <div key={u.id} className="flex items-center gap-4 px-6 py-3">
                                    <div className="flex-1 min-w-0">
                                        {u.ticket ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    href={route('caissier.tickets.show', u.ticket.ulid ?? u.ticket.id)}
                                                    className="font-mono font-semibold text-sm text-blue-600 hover:underline"
                                                >
                                                    #{u.ticket.ticket_number}
                                                </Link>
                                                <TicketStatusBadge status={u.ticket.status} />
                                                <span className="text-xs text-gray-400">
                                                    {u.ticket.total_cents != null ? formatMAD(u.ticket.total_cents) : '—'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Ticket supprimé</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 tabular-nums">
                                        {u.created_at
                                            ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
