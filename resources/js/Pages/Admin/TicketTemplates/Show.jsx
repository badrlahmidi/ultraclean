import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    RefreshCw, ChevronLeft, Clock, User, Car, Ticket,
    Play, Power, Calendar, Wrench,
} from 'lucide-react';
import { formatMAD, formatDateTime } from '@/utils/format';
import clsx from 'clsx';
import { TICKET_STATUS } from '@/utils/constants';

/* ── Badge ─────────────────────────────────────────────────────── */
function ActiveBadge({ active }) {
    return active
        ? <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Actif
        </span>
        : <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            Pausé
        </span>;
}

const TICKET_STATUS_CFG = TICKET_STATUS;

function TicketStatusBadge({ status }) {
    const cfg = TICKET_STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600' };
    return (
        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.cls)}>
            {cfg.label}
        </span>
    );
}

/* ── Info row ────────────────────────────────────────────────────── */
function InfoRow({ label, children }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <span className="text-xs font-semibold text-gray-500 w-40 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-gray-800 flex-1">{children ?? <span className="text-gray-400 italic">—</span>}</span>
        </div>
    );
}

function formatNext(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function TicketTemplateShow({ template, generatedTickets, services }) {
    function handleToggle() {
        router.post(route('admin.ticket-templates.toggle', template.id), {}, {
            preserveScroll: true,
        });
    }

    function handleRunNow() {
        if (!confirm(`Créer un ticket maintenant pour ce template ?`)) return;
        router.post(route('admin.ticket-templates.run-now', template.id), {}, {
            preserveScroll: true,
        });
    }

    const totalRevenue = generatedTickets
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + (t.total_cents ?? 0), 0);

    return (
        <AppLayout title={`Template — ${template.label || template.client?.name || `#${template.id}`}`}>
            <Head title={`Template récurrent : ${template.label || `#${template.id}`}`} />

            <div className="space-y-6">
                {/* Back */}
                <Link
                    href={route('admin.ticket-templates.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ChevronLeft size={16} /> Retour aux templates
                </Link>

                {/* Hero */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start gap-5 flex-wrap">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <RefreshCw size={28} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900">
                                    {template.label || template.client?.name || `Template #${template.id}`}
                                </h1>
                                <ActiveBadge active={template.is_active} />
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                                {template.client && (
                                    <span className="flex items-center gap-1">
                                        <User size={13} /> {template.client.name}
                                    </span>
                                )}
                                {template.vehicle_plate && (
                                    <span className="flex items-center gap-1 font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                        <Car size={12} /> {template.vehicle_plate}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Clock size={13} /> {template.estimated_duration} min
                                </span>
                                <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                    {template.recurrence_rule}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={handleRunNow}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-sm font-semibold transition"
                                title="Créer ticket maintenant"
                            >
                                <Play size={14} /> Créer ticket
                            </button>
                            <button
                                onClick={handleToggle}
                                className={clsx(
                                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition',
                                    template.is_active
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                )}
                            >
                                <Power size={14} />
                                {template.is_active ? 'Désactiver' : 'Activer'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Tickets générés',
                            value: generatedTickets.length,
                            icon: Ticket,
                            color: 'blue',
                        },
                        {
                            label: 'CA total (tickets payés)',
                            value: formatMAD(totalRevenue),
                            icon: Ticket,
                            color: 'green',
                        },
                        {
                            label: 'Prochain déclenchement',
                            value: formatNext(template.next_run_at),
                            icon: Calendar,
                            color: 'purple',
                        },
                        {
                            label: 'Dernier déclenchement',
                            value: template.last_run_at ? formatNext(template.last_run_at) : '—',
                            icon: Clock,
                            color: 'amber',
                        },
                    ].map(({ label, value, icon: Icon, color }) => {
                        const colors = {
                            blue: 'bg-blue-50 text-blue-600',
                            green: 'bg-green-50 text-green-600',
                            purple: 'bg-purple-50 text-purple-600',
                            amber: 'bg-amber-50 text-amber-600',
                        };
                        return (
                            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                                <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
                                    <Icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-bold text-gray-900 truncate">{value}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Configuration */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <RefreshCw size={15} className="text-blue-500" />
                            Configuration du template
                        </h2>
                        <InfoRow label="Libellé">{template.label}</InfoRow>
                        <InfoRow label="Règle cron">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{template.recurrence_rule}</span>
                        </InfoRow>
                        <InfoRow label="Durée estimée">{template.estimated_duration} min</InfoRow>
                        {template.vehicle_plate && <InfoRow label="Plaque">{template.vehicle_plate}</InfoRow>}
                        {template.vehicle_brand && <InfoRow label="Marque">{template.vehicle_brand}</InfoRow>}
                        {template.vehicle_type && <InfoRow label="Catégorie">{template.vehicle_type.name}</InfoRow>}
                        {template.assignedToUser && <InfoRow label="Laveur préféré">{template.assignedToUser.name}</InfoRow>}
                        {template.notes && (
                            <InfoRow label="Notes">
                                <span className="whitespace-pre-wrap">{template.notes}</span>
                            </InfoRow>
                        )}
                    </div>

                    {/* Services + Client */}
                    <div className="space-y-4">
                        {/* Client */}
                        {template.client && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User size={15} className="text-blue-500" /> Client
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600">
                                        {template.client.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{template.client.name}</p>
                                        {template.client.phone && (
                                            <p className="text-xs text-gray-400">{template.client.phone}</p>
                                        )}
                                    </div>
                                </div>
                                <Link
                                    href={route('admin.clients.show', template.client.id)}
                                    className="text-xs text-blue-600 hover:underline mt-3 block"
                                >
                                    Voir le profil client →
                                </Link>
                            </div>
                        )}

                        {/* Services */}
                        {services?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Wrench size={15} className="text-blue-500" /> Services ({services.length})
                                </h2>
                                <ul className="space-y-2">
                                    {services.map(s => (
                                        <li key={s.id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">{s.name}</span>
                                            <span className="font-semibold text-gray-900">{formatMAD(s.base_price_cents)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tickets générés */}
                <div className="bg-white rounded-2xl border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Ticket size={15} className="text-blue-500" />
                            <h2 className="text-sm font-semibold text-gray-700">
                                Tickets générés ({generatedTickets.length})
                            </h2>
                        </div>
                        {generatedTickets.length > 0 && (
                            <span className="text-xs text-gray-400">30 derniers</span>
                        )}
                    </div>

                    {generatedTickets.length === 0 ? (
                        <div className="p-12 text-center">
                            <RefreshCw size={36} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-400 text-sm">Aucun ticket généré pour l'instant.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {generatedTickets.map(t => (
                                <div key={t.id} className="flex items-center gap-4 px-6 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link
                                                href={route('caissier.tickets.show', t.ulid ?? t.id)}
                                                className="font-mono font-bold text-sm text-blue-600 hover:underline"
                                            >
                                                #{t.ticket_number}
                                            </Link>
                                            <TicketStatusBadge status={t.status} />
                                            {t.total_cents != null && (
                                                <span className="text-xs text-gray-500">{formatMAD(t.total_cents)}</span>
                                            )}
                                        </div>
                                        {t.assigned_to?.name && (
                                            <p className="text-xs text-gray-400 mt-0.5">{t.assigned_to.name}</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                                        {t.created_at
                                            ? new Date(t.created_at).toLocaleDateString('fr-FR', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })
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
