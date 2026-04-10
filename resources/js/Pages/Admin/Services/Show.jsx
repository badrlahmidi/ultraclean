import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Wrench, ChevronLeft, BarChart3, Tag, Clock } from 'lucide-react';
import { formatMAD } from '@/utils/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from 'clsx';

export default function ServiceShow({ service, usageStats, monthlyTrend }) {
    const chartData = monthlyTrend.map(m => ({
        month: m.month,
        Utilisations: m.count,
        CA: Math.round(m.revenue / 100),
    }));

    return (
        <AppLayout title={`Service — ${service.name}`}>
            <Head title={`Service : ${service.name}`} />

            <div className="space-y-6">
                {/* Back */}
                <Link href={route('admin.services.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <ChevronLeft size={16} /> Retour aux services
                </Link>

                {/* Hero */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start gap-5 flex-wrap">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: service.color ?? '#3B82F6' }}>
                            <Wrench size={24} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900">{service.name}</h1>
                                {!service.is_active && (
                                    <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-semibold">Inactif</span>
                                )}
                                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
                                    {service.price_type === 'fixed' ? 'Prix fixe' : 'Prix par catégorie'}
                                </span>
                            </div>
                            {service.description && (
                                <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><Clock size={13} /> {service.duration_minutes} min</span>
                                {service.price_type === 'fixed' && service.base_price_cents != null && (
                                    <span className="flex items-center gap-1">
                                        <Tag size={13} /> {formatMAD(service.base_price_cents)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Usage KPIs */}
                    {usageStats && (
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-800">{usageStats.total_uses ?? 0}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Utilisations totales</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-800">{formatMAD(usageStats.total_revenue ?? 0)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">CA total généré</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Grille tarifaire par catégorie de véhicule */}
                    {service.prices?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <Tag size={16} className="text-blue-500" />
                                Grille tarifaire
                            </h2>
                            <div className="space-y-2">
                                {service.prices.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                                        <span className="text-sm text-gray-700 font-medium">
                                            {p.vehicle_type?.name ?? `Catégorie #${p.vehicle_type_id}`}
                                        </span>
                                        <span className="text-sm font-bold text-gray-800">{formatMAD(p.price_cents)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tendance 6 mois */}
                    {chartData.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <BarChart3 size={16} className="text-emerald-500" />
                                Tendance 6 derniers mois
                            </h2>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip formatter={(v, name) => [name === 'CA' ? `${v} MAD` : v, name]} />
                                    <Bar dataKey="Utilisations" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
