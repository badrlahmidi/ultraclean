import AppLayout from '@/Layouts/AppLayout';
import { formatMAD, formatDate } from '@/utils/format';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Ticket, CheckCircle2, XCircle, Clock, BarChart3, FileDown, Sheet } from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
const STATUS_LABELS = { pending: 'En attente', in_progress: 'En cours', completed: 'Terminé', paid: 'Payé', cancelled: 'Annulé' };
const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', paid: '#059669', cancelled: '#ef4444' };
const METHOD_LABELS = { cash: 'Espèces', card: 'Carte', mobile: 'Mobile', mixed: 'Mixte' };

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
    const cls = {
        blue: 'bg-blue-50  text-blue-700  dark:bg-blue-900/20  dark:text-blue-300',
        green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
        red: 'bg-red-50   text-red-700   dark:bg-red-900/20   dark:text-red-300',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    };
    return (
        <div className={clsx('rounded-2xl border border-transparent p-5', cls[color] ?? cls.blue)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
                </div>
                {Icon && <Icon size={22} className="opacity-40 mt-1" />}
            </div>
        </div>
    );
}

function MadTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>{p.name} : {p.name === 'CA' ? formatMAD(p.value) : p.value}</p>
            ))}
        </div>
    );
}

const PERIODS = [
    { id: 'today', label: "Aujourd'hui" },
    { id: 'week', label: 'Semaine' },
    { id: 'month', label: 'Mois' },
    { id: 'year', label: 'Année' },
];

export default function ReportsIndex({ stats, revenueTrend, statusBreakdown, topServices, paymentMethods, shifts, vehicleBreakdown, filters }) {
    const [from, setFrom] = useState(filters?.from ?? '');
    const [to, setTo] = useState(filters?.to ?? '');

    function go(period) {
        router.get(route('admin.reports.index'), { period }, { preserveState: true });
    }
    function submitCustom(e) {
        e.preventDefault();
        router.get(route('admin.reports.index'), { period: 'custom', from, to }, { preserveState: true });
    }

    function exportUrl(type) {
        const params = new URLSearchParams({ period: filters?.period ?? 'month' });
        if (filters?.period === 'custom') { params.set('from', filters.from); params.set('to', filters.to); }
        return route(`admin.reports.export.${type}`) + '?' + params.toString();
    }

    const pieData = Object.entries(statusBreakdown ?? {}).map(([status, count]) => ({
        name: STATUS_LABELS[status] ?? status,
        value: count,
        color: STATUS_COLORS[status] ?? '#94a3b8',
    }));

    const methodData = (paymentMethods ?? []).map(m => ({
        name: METHOD_LABELS[m.method] ?? m.method,
        count: m.count,
        total: m.total,
    }));

    return (
        <AppLayout title="Rapports">
            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rapports & Statistiques</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Du <strong>{formatDate(filters?.from)}</strong> au <strong>{formatDate(filters?.to)}</strong>
                        </p>
                    </div>
                    {/* Export buttons */}
                    <div className="flex gap-2">
                        <a href={exportUrl('pdf')} target="_blank" rel="noopener"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors">
                            <FileDown size={14} /> PDF
                        </a>
                        <a href={exportUrl('csv')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 transition-colors">
                            <Sheet size={14} /> CSV
                        </a>
                    </div>
                </div>                {/* Sélecteur période */}
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
                        <button type="submit"
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
                            Filtrer
                        </button>
                    </form>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard label="Tickets total" value={stats?.total_tickets ?? 0} icon={Ticket} color="blue" />
                    <StatCard label="Payés" value={stats?.paid_tickets ?? 0} icon={CheckCircle2} color="green" />
                    <StatCard label="Annulés" value={stats?.cancelled_tickets ?? 0} icon={XCircle} color="red" />
                    <StatCard label="En cours" value={stats?.pending_tickets ?? 0} icon={Clock} color="amber" />
                    <StatCard label="Chiffre d'affaires"
                        value={formatMAD(stats?.revenue ?? 0)} icon={TrendingUp} color="green"
                        sub={`Moy. ${formatMAD(Math.round(stats?.avg_ticket ?? 0))}`} />
                    <StatCard label="Taux encaissement"
                        value={(stats?.total_tickets ?? 0) > 0
                            ? `${Math.round((stats.paid_tickets / stats.total_tickets) * 100)}%`
                            : '—'}
                        icon={BarChart3} color="blue" />
                </div>                {/* Tendance CA + Donut statuts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">CA & tickets par jour</h2>
                        {(revenueTrend ?? []).length === 0
                            ? <p className="text-center text-gray-400 py-12 text-sm">Aucune donnée sur la période</p>
                            : <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                                    <YAxis yAxisId="rev" tickFormatter={v => `${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} width={55} />
                                    <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11 }} />
                                    <Tooltip content={<MadTooltip />} />
                                    <Legend />
                                    <Line yAxisId="rev" type="monotone" dataKey="revenue" name="CA" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    <Line yAxisId="cnt" type="monotone" dataKey="tickets" name="Tickets" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        }
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Statuts des tickets</h2>
                        {pieData.length === 0
                            ? <p className="text-center text-gray-400 py-12 text-sm">Aucune donnée</p>
                            : <>
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                                            {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-1.5 mt-3">
                                    {pieData.map((d, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                                                <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                                            </span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        }
                    </div>
                </div>

                {/* Top services + Modes paiement */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Top services (fréquence)</h2>
                        {(topServices ?? []).length === 0
                            ? <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée</p>
                            : <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={topServices} layout="vertical" margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Fois" radius={[0, 4, 4, 0]}>
                                        {topServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Modes de paiement</h2>
                        {methodData.length === 0
                            ? <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée</p>
                            : <>
                                <ResponsiveContainer width="100%" height={160}>
                                    <BarChart data={methodData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" name="Transactions" radius={[4, 4, 0, 0]}>
                                            {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {methodData.map((m, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 text-xs">
                                            <p className="font-semibold text-gray-700 dark:text-gray-200">{m.name}</p>
                                            <p className="text-gray-400 dark:text-gray-400 mt-0.5">{m.count} tx · {formatMAD(m.total)}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        }
                    </div>
                </div>

                {/* Véhicules + Shifts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Types de véhicules</h2>
                        {(vehicleBreakdown ?? []).length === 0
                            ? <p className="text-center text-gray-400 py-6 text-sm">Aucune donnée</p>
                            : <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b dark:border-gray-700 text-xs text-gray-400">
                                        <th className="text-left pb-2 font-medium">Type</th>
                                        <th className="text-center pb-2 font-medium">Tickets</th>
                                        <th className="text-right pb-2 font-medium">CA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {vehicleBreakdown.map((v, i) => (
                                        <tr key={i}>
                                            <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{v.name}</td>
                                            <td className="py-2 text-center text-gray-600 dark:text-gray-400">{v.count}</td>
                                            <td className="py-2 text-right font-semibold text-gray-800 dark:text-gray-200">{formatMAD(v.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        }
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm p-5">
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Shifts clôturés</h2>
                        {(shifts ?? []).length === 0
                            ? <p className="text-center text-gray-400 py-6 text-sm">Aucun shift sur la période</p>
                            : <div className="space-y-2 max-h-60 overflow-y-auto">
                                {shifts.map(s => {
                                    const diff = s.difference_cents ?? 0;
                                    return (
                                        <div key={s.id} className="flex items-center justify-between text-xs border-b dark:border-gray-700 pb-2 gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{s.user}</p>
                                                <p className="text-gray-400">{formatDate(s.opened_at)} · clôture {formatMAD(s.closing_cash_cents)}</p>
                                            </div>
                                            <span className={clsx('flex-shrink-0 font-bold px-2 py-0.5 rounded-full',
                                                diff === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                    : diff > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            )}>
                                                {diff === 0 ? 'OK' : diff > 0 ? `+${formatMAD(diff)}` : formatMAD(diff)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        }
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
