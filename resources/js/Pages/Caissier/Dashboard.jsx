import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Ticket, TrendingUp, Clock, CheckCircle, Plus, ChevronRight, Banknote, Wallet, ShoppingCart, ReceiptText } from 'lucide-react';
import { formatMAD } from '@/utils/format';
import StatusBadge from '@/Components/StatusBadge';

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
}

export default function CaissierDashboard({ stats, recentTickets, activeShift }) {
    return (
        <AppLayout title="Caisse">
            <Head title="Tableau de bord Caissier" />

            <div className="space-y-5">
                {/* Alerte shift */}
                {!activeShift && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-yellow-800">Aucun shift ouvert</p>
                            <p className="text-xs text-yellow-600 mt-0.5">Ouvrez un shift pour commencer à encaisser.</p>
                        </div>
                        <Link href={route('caissier.shift.index')}
                            className="flex-shrink-0 text-xs font-semibold text-yellow-700 hover:text-yellow-900 flex items-center gap-1">
                            Gérer le shift <ChevronRight size={14} />
                        </Link>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Tickets aujourd'hui" value={stats.tickets_today} icon={Ticket} color="bg-blue-500" />
                    <StatCard label="CA aujourd'hui" value={formatMAD(stats.revenue_today)} icon={TrendingUp} color="bg-emerald-500" />
                    <StatCard label="En attente" value={stats.tickets_pending} icon={Clock} color="bg-yellow-500" />
                    <StatCard label="En cours" value={stats.tickets_wip} icon={CheckCircle} color="bg-purple-500" />
                </div>

                {/* Stats shift (si shift actif) */}
                {activeShift && stats.revenue_shift !== null && (
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard
                            label="CA du shift"
                            value={formatMAD(stats.revenue_shift)}
                            icon={Banknote}
                            color="bg-teal-500"
                        />
                        <StatCard
                            label="Dépenses shift"
                            value={formatMAD(stats.expenses_shift)}
                            icon={Banknote}
                            color="bg-orange-400"
                        />
                        <StatCard
                            label="CA net shift"
                            value={formatMAD(stats.net_shift)}
                            icon={Wallet}
                            color={stats.net_shift >= 0 ? 'bg-green-500' : 'bg-red-500'}
                        />
                    </div>
                )}

                {/* Actions rapides */}
                <div className="flex gap-3 flex-wrap">
                    <Link href={route('caissier.tickets.create')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <Plus size={16} /> Nouveau ticket
                    </Link>
                    <Link href={route('caissier.pos.create')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
                        <ShoppingCart size={16} /> Point de Vente
                    </Link>
                    <Link href={route('caissier.tickets.index')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
                        Voir tous les tickets
                    </Link>
                </div>

                {/* Stats POS */}
                {(stats.pos_sales_today > 0 || stats.pos_revenue_today > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Ventes POS aujourd'hui"
                            value={stats.pos_sales_today}
                            icon={ShoppingCart}
                            color="bg-emerald-500"
                        />
                        <StatCard
                            label="CA POS aujourd'hui"
                            value={formatMAD(stats.pos_revenue_today)}
                            icon={ReceiptText}
                            color="bg-teal-500"
                        />
                    </div>
                )}

                {/* Tickets récents */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Tickets récents — aujourd'hui</h2>
                        <Link href={route('caissier.tickets.index', { today: 1 })}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Tout voir →
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentTickets.map(t => (
                            <Link key={t.id} href={route('caissier.tickets.show', t.ulid)}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">{t.ticket_number}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {t.vehicle_type?.name}
                                        {t.vehicle_plate && ` — ${t.vehicle_plate}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <StatusBadge status={t.status} />
                                    <p className="text-xs text-gray-500 mt-1">{formatMAD(t.total_cents)}</p>
                                </div>
                            </Link>
                        ))}
                        {recentTickets.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                Aucun ticket créé aujourd'hui
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
