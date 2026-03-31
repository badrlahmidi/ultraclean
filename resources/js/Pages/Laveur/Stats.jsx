import AppLayout from '@/Layouts/AppLayout';
import { router, usePage } from '@inertiajs/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Trophy, Ticket, Timer, TrendingUp, Car } from 'lucide-react';
import clsx from 'clsx';
import { formatMAD, formatDateTime } from '@/utils/format';

const PERIODS = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'year', label: 'Cette année' },
];

const STATUS_COLOR = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};
const STATUS_LABEL = {
    pending: 'En attente', in_progress: 'En lavage', completed: 'Terminé',
    paid: 'Payé', cancelled: 'Annulé',
};

function KPICard({ label, value, sub, icon: Icon, accent }) {
    return (
        <div className={clsx(
            'rounded-2xl border p-5 flex items-start gap-4',
            accent
                ? 'bg-blue-600 border-blue-700 text-white'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
        )}>
            <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                accent ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/30'
            )}>
                <Icon size={20} className={accent ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />
            </div>
            <div>
                <p className={clsx('text-xs font-semibold uppercase tracking-wider', accent ? 'text-white/70' : 'text-gray-500 dark:text-gray-400')}>{label}</p>
                <p className={clsx('text-2xl font-bold mt-0.5', accent ? 'text-white' : 'text-gray-900 dark:text-white')}>{value}</p>
                {sub && <p className={clsx('text-xs mt-0.5', accent ? 'text-white/70' : 'text-gray-400 dark:text-gray-500')}>{sub}</p>}
            </div>
        </div>
    );
}

export default function LaveurStats({ period, kpis, dailyTrend, recentTickets }) {
    const { auth } = usePage().props;

    function setPeriod(p) {
        router.get(route('laveur.stats'), { period: p }, { preserveState: true, replace: true });
    }

    const chartData = dailyTrend.map(d => ({
        day: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        tickets: d.count,
        ca: Math.round((d.revenue ?? 0) / 100),
    }));

    const rankText = kpis.rank
        ? `#${kpis.rank} / ${kpis.rank_total} laveurs`
        : '—';
    const rankMedal = kpis.rank === 1 ? '🥇' : kpis.rank === 2 ? '🥈' : kpis.rank === 3 ? '🥉' : null;

    return (
        <AppLayout title="Mes statistiques">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Mes performances {rankMedal}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Bonjour {auth.user?.name} · classement global : <span className="font-semibold text-blue-600 dark:text-blue-400">{rankText}</span>
                        </p>
                    </div>

                    {/* Sélecteur période */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
                        {PERIODS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => setPeriod(p.key)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                    period === p.key
                                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <KPICard
                        label="Tickets"
                        value={kpis.total_tickets}
                        icon={Ticket}
                        accent
                    />
                    <KPICard
                        label="CA généré"
                        value={formatMAD(kpis.total_revenue)}
                        icon={TrendingUp}
                    />
                    <KPICard
                        label="Durée moy."
                        value={kpis.avg_duration ? `${kpis.avg_duration} min` : '—'}
                        icon={Timer}
                    />
                    <KPICard
                        label="Classement"
                        value={kpis.rank ? `#${kpis.rank}` : '—'}
                        sub={kpis.rank_total ? `sur ${kpis.rank_total}` : undefined}
                        icon={Trophy}
                    />
                </div>

                {/* Graphiques */}
                {chartData.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Tickets par jour */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Tickets / jour</p>
                            <ResponsiveContainer width="100%" height={140}>
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                        formatter={v => [v, 'Tickets']}
                                    />
                                    <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* CA par jour */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">CA (MAD) / jour</p>
                            <ResponsiveContainer width="100%" height={140}>
                                <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                                    <Tooltip
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                        formatter={v => [`${v} MAD`, 'CA']}
                                    />
                                    <Line dataKey="ca" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {chartData.length === 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-10 text-center">
                        <TrendingUp size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">Aucune donnée pour cette période</p>
                    </div>
                )}

                {/* Tickets récents */}
                {recentTickets.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
                            Mes derniers véhicules lavés
                        </h2>
                        <div className="space-y-2">
                            {recentTickets.map(t => {
                                const durationMin = t.started_at && t.completed_at
                                    ? Math.round((new Date(t.completed_at) - new Date(t.started_at)) / 60000)
                                    : null;
                                return (
                                    <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                            <Car size={15} className="text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{t.ticket_number}</span>
                                                <span className={clsx('text-xs font-medium px-1.5 py-0.5 rounded-full', STATUS_COLOR[t.status])}>
                                                    {STATUS_LABEL[t.status]}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {t.vehicle_plate ?? '—'}
                                                {t.vehicle_brand ? ` · ${t.vehicle_brand}` : ''}
                                                {durationMin !== null ? ` · ${durationMin} min` : ''}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 tabular-nums flex-shrink-0">
                                            {formatMAD(t.total_cents)}
                                        </span>
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
