import AppLayout from '@/Layouts/AppLayout';
import { formatMAD, formatDate } from '@/utils/format';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Ticket, Clock, TrendingUp, Award, Zap } from 'lucide-react';
import clsx from 'clsx';

const PERIODS = [
    { id: 'today', label: "Aujourd'hui" },
    { id: 'week', label: 'Semaine' },
    { id: 'month', label: 'Mois' },
    { id: 'year', label: 'Année' },
];

const WASHER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function MetricBadge({ value, label, icon: Icon, color = 'blue' }) {
    const cls = {
        blue: 'bg-blue-50 text-blue-700   dark:bg-blue-900/20 dark:text-blue-300',
        green: 'bg-green-50 text-green-700  dark:bg-green-900/20 dark:text-green-300',
        amber: 'bg-amber-50 text-amber-700  dark:bg-amber-900/20 dark:text-amber-300',
        purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
    };
    return (
        <div className={clsx('rounded-xl px-3 py-2 flex items-center gap-2', cls[color] ?? cls.blue)}>
            {Icon && <Icon size={14} className="flex-shrink-0 opacity-70" />}
            <div>
                <p className="text-xs font-bold leading-none">{value ?? '—'}</p>
                <p className="text-[10px] opacity-60 mt-0.5 leading-none">{label}</p>
            </div>
        </div>
    );
}

function RankBadge({ rank }) {
    if (rank === 1) return <span className="text-base">🥇</span>;
    if (rank === 2) return <span className="text-base">🥈</span>;
    if (rank === 3) return <span className="text-base">🥉</span>;
    return <span className="text-sm text-gray-400 font-bold">#{rank}</span>;
}

export default function EmployeesIndex({ washers, trend, filters }) {
    const [from, setFrom] = useState(filters?.from ?? '');
    const [to, setTo] = useState(filters?.to ?? '');
    const [sortBy, setSortBy] = useState('revenue_cents');

    function go(period) {
        router.get(route('admin.employees.index'), { period }, { preserveState: true });
    }
    function submitCustom(e) {
        e.preventDefault();
        router.get(route('admin.employees.index'), { period: 'custom', from, to }, { preserveState: true });
    }

    // Sort washers
    const sorted = [...(washers ?? [])].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));

    // Trend data: pivot by washer name
    const washerNames = [...new Set((trend ?? []).map(t => t.name))];
    const trendByDay = (trend ?? []).reduce((acc, row) => {
        const existing = acc.find(d => d.day === row.day);
        if (existing) { existing[row.name] = row.tickets; }
        else { acc.push({ day: row.day, [row.name]: row.tickets }); }
        return acc;
    }, []);

    // Bar chart data for top metrics
    const barData = sorted.map(w => ({
        name: w.name.split(' ')[0], // first name only for readability
        fullName: w.name,
        tickets: w.tickets_completed,
        revenue: Math.round((w.revenue_cents ?? 0) / 100),
        avg_min: w.avg_duration_minutes,
        per_hour: w.tickets_per_hour,
    }));

    const SORT_OPTIONS = [
        { key: 'revenue_cents', label: 'CA généré' },
        { key: 'tickets_completed', label: 'Tickets' },
        { key: 'tickets_per_hour', label: 'Tickets/h' },
        { key: 'avg_duration_minutes', label: 'Durée moy.' },
    ];

    return (
        <AppLayout title="Performance laveurs">
            <div className="space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Performance des laveurs</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Du <strong>{formatDate(filters?.from)}</strong> au <strong>{formatDate(filters?.to)}</strong>
                    </p>
                </div>

                {/* Période */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Période :</span>
                    <div className="flex flex-wrap gap-1.5">
                        {PERIODS.map(p => (
                            <button key={p.id} onClick={() => go(p.id)}
                                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    filters?.period === p.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                )}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={submitCustom} className="flex items-center gap-2 ml-auto flex-wrap">
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                            className="border dark:border-gray-600 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" />
                        <span className="text-gray-400 text-xs">→</span>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)}
                            className="border dark:border-gray-600 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200" />
                        <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
                            Filtrer
                        </button>
                    </form>
                </div>

                {/* Classement */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <Award size={16} className="text-amber-500" /> Classement
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Trier par :</span>
                            <div className="flex gap-1 flex-wrap">
                                {SORT_OPTIONS.map(opt => (
                                    <button key={opt.key} onClick={() => setSortBy(opt.key)}
                                        className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                                            sortBy === opt.key
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        )}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {sorted.length === 0 ? (
                        <p className="text-center text-gray-400 py-12 text-sm">Aucun laveur trouvé</p>
                    ) : (
                        <div className="space-y-3">
                            {sorted.map((w, i) => (
                                <div key={w.id}
                                    className="flex flex-wrap items-center gap-4 p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">

                                    {/* Rank + Name */}
                                    <div className="flex items-center gap-3 min-w-[160px]">
                                        <div className="w-8 text-center flex-shrink-0"><RankBadge rank={i + 1} /></div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{w.name}</p>
                                            <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                                w.deleted_at ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                                    : w.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            )}>
                                                {w.deleted_at ? 'Supprimé' : w.is_active ? 'Actif' : 'Inactif'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="flex flex-wrap gap-2 flex-1">
                                        <MetricBadge
                                            value={formatMAD(w.revenue_cents ?? 0)}
                                            label="CA généré"
                                            icon={TrendingUp}
                                            color="green"
                                        />
                                        <MetricBadge
                                            value={w.tickets_completed}
                                            label="Tickets terminés"
                                            icon={Ticket}
                                            color="blue"
                                        />
                                        <MetricBadge
                                            value={w.avg_duration_minutes != null ? `${w.avg_duration_minutes} min` : '—'}
                                            label="Durée moy."
                                            icon={Clock}
                                            color="amber"
                                        />
                                        <MetricBadge
                                            value={w.tickets_per_hour != null ? `${w.tickets_per_hour}/h` : '—'}
                                            label="Cadence"
                                            icon={Zap}
                                            color="purple"
                                        />
                                    </div>

                                    {/* Progress bar (relative to top performer) */}
                                    {sorted[0]?.tickets_completed > 0 && (
                                        <div className="w-full mt-1">
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.round(((w.tickets_completed ?? 0) / (sorted[0].tickets_completed || 1)) * 100)}%`,
                                                        background: WASHER_COLORS[i % WASHER_COLORS.length],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Bar chart: tickets by washer */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Tickets terminés par laveur</h2>
                        {barData.length === 0
                            ? <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée</p>
                            : <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={barData} margin={{ left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(val, name, props) => [val, props.payload.fullName]} />
                                    <Bar dataKey="tickets" name="Tickets" radius={[4, 4, 0, 0]}>
                                        {barData.map((_, i) => <Cell key={i} fill={WASHER_COLORS[i % WASHER_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    </div>

                    {/* Bar chart: revenue by washer */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">CA généré par laveur (MAD)</h2>
                        {barData.length === 0
                            ? <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée</p>
                            : <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={barData} margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} />
                                    <Tooltip formatter={(val, name, props) => [`${val} MAD`, props.payload.fullName]} />
                                    <Bar dataKey="revenue" name="CA (MAD)" radius={[4, 4, 0, 0]}>
                                        {barData.map((_, i) => <Cell key={i} fill={WASHER_COLORS[i % WASHER_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    </div>

                    {/* Trend line: tickets par jour par laveur */}
                    {trendByDay.length > 0 && (
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Activité quotidienne par laveur</h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={trendByDay}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    {washerNames.map((name, i) => (
                                        <Line
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            stroke={WASHER_COLORS[i % WASHER_COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
