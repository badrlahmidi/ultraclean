import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { BarChart2, Ticket, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function StatCard({ label, value, icon: Icon, color, sub }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
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

export default function AdminDashboard({ stats, revenueTrend, statusBreakdown, topServices }) {
    const trendData = revenueTrend.map(r => ({
        date: new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: 'short' }).format(new Date(r.date)),
        CA: Math.round(r.total / 100),
    }));

    return (
        <AppLayout title="Tableau de bord Admin">
            <Head title="Dashboard Admin" />

            <div className="space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Tickets aujourd'hui" value={stats.tickets_today} icon={Ticket} color="bg-blue-500" />
                    <StatCard label="CA aujourd'hui" value={formatMAD(stats.revenue_today)} icon={TrendingUp} color="bg-emerald-500" />
                    <StatCard label="En attente" value={stats.tickets_pending} icon={Clock} color="bg-yellow-500" />
                    <StatCard label="En cours" value={stats.tickets_wip} icon={CheckCircle} color="bg-purple-500" />
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Graphique CA 7 jours */}
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

                    {/* Top services */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">
                            Top services ce mois
                        </h2>
                        <div className="space-y-3">
                            {topServices.map((s, i) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm text-gray-700 truncate">{s.service_name}</span>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="text-xs font-semibold text-gray-800">{formatMAD(s.revenue)}</p>
                                        <p className="text-xs text-gray-400">{s.count}×</p>
                                    </div>
                                </div>
                            ))}
                            {topServices.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">Aucune donnée ce mois</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Répartition statuts */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Répartition tickets aujourd'hui</h2>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(statusBreakdown).map(([status, count]) => (
                            <div key={status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-sm font-medium text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                                <span className="text-sm font-bold text-blue-600">{count}</span>
                            </div>
                        ))}
                        {Object.keys(statusBreakdown).length === 0 && (
                            <p className="text-sm text-gray-400">Aucun ticket aujourd'hui</p>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
