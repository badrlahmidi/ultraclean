import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { Users, ChevronLeft, ShieldCheck, Ticket, Clock } from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import clsx from 'clsx';

const ROLE_CONFIG = {
    admin: { label: 'Administrateur', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    caissier: { label: 'Caissier', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    laveur: { label: 'Laveur', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

function actionColor(action = '') {
    if (action.includes('created')) return 'text-emerald-600 bg-emerald-50';
    if (action.includes('updated')) return 'text-blue-600 bg-blue-50';
    if (action.includes('deleted')) return 'text-red-500 bg-red-50';
    if (action.includes('login')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-500 bg-gray-50';
}

export default function UserShow({ user, activity, ticketStats }) {
    const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.laveur;

    return (
        <AppLayout title={`Utilisateur — ${user.name}`}>
            <Head title={`Utilisateur : ${user.name}`} />

            <div className="space-y-6">
                {/* Back */}
                <Link href={route('admin.users.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <ChevronLeft size={16} /> Retour aux utilisateurs
                </Link>

                {/* Hero card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start gap-5 flex-wrap">
                        <div className={clsx(
                            'w-16 h-16 rounded-2xl font-bold text-2xl flex items-center justify-center flex-shrink-0 text-white',
                            user.role === 'admin' ? 'bg-purple-500' : user.role === 'caissier' ? 'bg-blue-500' : 'bg-green-500'
                        )}>
                            {user.name?.charAt(0)?.toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
                                <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', roleCfg.color)}>
                                    <span className={clsx('w-1.5 h-1.5 rounded-full', roleCfg.dot)} />
                                    {roleCfg.label}
                                </span>
                                {!user.is_active && (
                                    <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-semibold">Inactif</span>
                                )}
                                {user.deleted_at && (
                                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-semibold">Supprimé</span>
                                )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                <span>✉️ {user.email}</span>
                                {user.phone && <span>📞 {user.phone}</span>}
                                {user.last_login_at && (
                                    <span className="flex items-center gap-1">
                                        <Clock size={13} /> Connexion: {formatDateTime(user.last_login_at)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ticket stats */}
                    {ticketStats && (
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-800">{ticketStats.total ?? 0}</p>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                                    <Ticket size={11} /> Tickets traités
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-800">{formatMAD(ticketStats.revenue ?? 0)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">CA généré</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Journal d'activité */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-purple-500" />
                        Activité récente
                        <Link href={route('admin.activity-log.index', { user_id: user.id })}
                            className="ml-auto text-xs text-blue-600 hover:underline font-normal">
                            Voir tout →
                        </Link>
                    </h2>

                    {activity.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Aucune activité enregistrée</p>
                    ) : (
                        <div className="space-y-2">
                            {activity.map(log => (
                                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    <span className={clsx('flex-shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mt-0.5', actionColor(log.action))}>
                                        {log.action}
                                    </span>
                                    {log.properties && Object.keys(log.properties).length > 0 && (
                                        <span className="text-xs text-gray-500 truncate flex-1 font-mono">
                                            {JSON.stringify(log.properties)}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap ml-auto">
                                        {formatDateTime(log.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
