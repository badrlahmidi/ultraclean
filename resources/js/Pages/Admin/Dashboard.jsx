import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart2, Ticket, TrendingUp, Clock, CheckCircle, AlertTriangle,
    CalendarDays, FileText, Activity, Package, Users
} from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import { TICKET_STATUS, APPT_STATUS } from '@/utils/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from 'clsx';

function StatCard({ label, value, icon: Icon, color, sub }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className={clsx('flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center', color)}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function shortSubject(type) {
    if (!type) return '';
    return type.split('\\').pop();
}

function actionColor(action = '') {
    if (action.includes('created')) return 'text-emerald-600';
    if (action.includes('updated')) return 'text-blue-600';
    if (action.includes('deleted')) return 'text-red-500';
    if (action.includes('login')) return 'text-purple-600';
    return 'text-gray-500';
}

export default function AdminDashboard({
    stats, revenueTrend, statusBreakdown, topServices,
    appointmentsToday = [], stockAlertItems = [], invoicesDraft = [], recentActivity = []
}) {
    const trendData = revenueTrend.map(r => ({
        date: new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: 'short' }).format(new Date(r.date)),
        CA: Math.round(r.total / 100),
    }));

    return (
        <AppLayout title="Tableau de bord Admin">
            <Head title="Dashboard Admin" />

            <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Tickets aujourd'hui" value={stats.tickets_today} icon={Ticket} color="bg-blue-500" />
                    <StatCard label="CA aujourd'hui" value={formatMAD(stats.revenue_today)} icon={TrendingUp} color="bg-emerald-500"
                        sub={`Mois : ${formatMAD(stats.revenue_month)}`} />
                    <StatCard label="En attente" value={stats.tickets_pending} icon={Clock} color="bg-yellow-500" />
                    <StatCard label="En cours" value={stats.tickets_wip} icon={CheckCircle} color="bg-purple-500"
                        sub={`${stats.active_shifts} shift(s) ouvert(s)`} />
                </div>

                {/* CA 7j + Top services */}
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <BarChart2 size={16} className="text-blue-500" />
                            Chiffre d'affaires — 7 derniers jours
                        </h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => [`${v} MAD`, 'CA']} />
                                <Bar dataKey="CA" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Top services ce mois</h2>
                        <div className="space-y-3">
                            {topServices.map((s, i) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                        <span className="text-sm text-gray-700 truncate">{s.service_name}</span>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="text-xs font-semibold text-gray-800">{formatMAD(s.revenue)}</p>
                                        <p className="text-xs text-gray-400">{s.count}×</p>
                                    </div>
                                </div>
                            ))}
                            {topServices.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aucune donnée ce mois</p>}
                        </div>
                    </div>
                </div>

                {/* Widgets P3.4 */}
                <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-5">
                    {/* RDV du jour */}
                    <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <CalendarDays size={16} className="text-purple-500" />
                                Rendez-vous du jour
                                <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-bold">{appointmentsToday.length}</span>
                            </h2>
                            <Link href={route('admin.appointments.index')} className="text-xs text-blue-600 hover:underline">Voir tout →</Link>
                        </div>
                        {appointmentsToday.length === 0
                            ? <p className="text-sm text-gray-400 text-center py-6">Aucun rendez-vous aujourd'hui</p>
                            : <div className="space-y-2">
                                {appointmentsToday.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                                        <p className="text-xs font-bold text-gray-800 min-w-[42px]">
                                            {new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{a.client?.name ?? 'Client anonyme'}</p>
                                            {a.vehicle_plate && <p className="text-xs text-gray-400 font-mono">{a.vehicle_plate}</p>}
                                        </div>
                                        <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', APPT_STATUS[a.status]?.cls ?? 'bg-gray-100 text-gray-500')}>
                                            {APPT_STATUS[a.status]?.label ?? a.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        }
                    </div>

                    {/* Alertes stock */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Package size={16} className="text-orange-500" />
                                Stock bas
                            </h2>
                            <Link href={route('admin.stock.index')} className="text-xs text-blue-600 hover:underline">Gérer →</Link>
                        </div>
                        {stockAlertItems.length === 0
                            ? <p className="text-sm text-gray-400 text-center py-6">✅ Stock OK</p>
                            : <div className="space-y-2">
                                {stockAlertItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-800 truncate font-medium">{item.name}</p>
                                            <p className="text-xs text-gray-400">Min: {item.min_quantity} {item.unit}</p>
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 flex-shrink-0">
                                            <AlertTriangle size={10} />{item.current_quantity} {item.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        }
                    </div>

                    {/* Factures draft */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <FileText size={16} className="text-blue-500" />
                                Factures draft
                            </h2>
                            <Link href={route('admin.invoices.index')} className="text-xs text-blue-600 hover:underline">Voir →</Link>
                        </div>
                        {invoicesDraft.length === 0
                            ? <p className="text-sm text-gray-400 text-center py-6">Aucune facture en attente</p>
                            : <div className="space-y-2">
                                {invoicesDraft.map(inv => (
                                    <Link key={inv.id} href={route('admin.invoices.show', inv.id)}
                                        className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-xs font-mono font-semibold text-gray-700">{inv.invoice_number}</p>
                                            <p className="text-xs text-gray-400 truncate">{inv.client?.name ?? '—'}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{formatMAD(inv.total_cents)}</span>
                                    </Link>
                                ))}
                            </div>
                        }
                    </div>
                </div>

                {/* Statuts + Activité */}
                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Répartition tickets aujourd'hui</h2>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(statusBreakdown).map(([status, count]) => (
                                <div key={status} className={clsx('flex items-center gap-2 rounded-lg px-3 py-2', TICKET_STATUS[status]?.cls ?? 'bg-gray-50 text-gray-700')}>
                                    <span className="text-sm font-medium capitalize">{TICKET_STATUS[status]?.label ?? status.replace('_', ' ')}</span>
                                    <span className="text-sm font-bold">{count}</span>
                                </div>
                            ))}
                            {Object.keys(statusBreakdown).length === 0 && <p className="text-sm text-gray-400">Aucun ticket aujourd'hui</p>}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Activity size={16} className="text-gray-400" />
                                Activité récente
                            </h2>
                            <Link href={route('admin.activity-log.index')} className="text-xs text-blue-600 hover:underline">Journal →</Link>
                        </div>
                        <div className="space-y-2">
                            {recentActivity.length === 0 && <p className="text-sm text-gray-400">Aucune activité</p>}
                            {recentActivity.map(log => (
                                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Users size={10} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-gray-600">{log.user?.name ?? 'Système'} </span>
                                        <span className={clsx('font-mono font-semibold', actionColor(log.action))}>{log.action}</span>
                                        {log.subject_type && <span className="text-gray-400"> ({shortSubject(log.subject_type)})</span>}
                                    </div>
                                    <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
