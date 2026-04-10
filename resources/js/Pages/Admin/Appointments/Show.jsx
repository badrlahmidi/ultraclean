import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays, ChevronLeft, Clock, User, Car, Ticket,
    CheckCircle2, XCircle, AlertCircle, Phone, MapPin,
    ArrowRightLeft,
} from 'lucide-react';
import { formatDateTime, formatDate } from '@/utils/format';
import clsx from 'clsx';
import { useState } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { APPT_STATUS, TICKET_STATUS } from '@/utils/constants';

/* ── Status config ──────────────────────────────────────────────── */

// Icon map — kept local because icons are not part of the shared data model
const APPT_STATUS_ICONS = {
    pending: Clock, confirmed: CheckCircle2, arrived: CheckCircle2,
    in_progress: AlertCircle, completed: CheckCircle2,
    cancelled: XCircle, no_show: XCircle,
};

const COLOR_CLASSES = {
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }) {
    const cfg = APPT_STATUS[status] ?? APPT_STATUS.pending;
    const Icon = APPT_STATUS_ICONS[status] ?? Clock;
    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
            COLOR_CLASSES[cfg.color]
        )}>
            <Icon size={12} />
            {cfg.label}
        </span>
    );
}

const SOURCE_LABELS = {
    walk_in: 'Passage',
    phone: 'Téléphone',
    online: 'En ligne',
    whatsapp: 'WhatsApp',
    admin: 'Admin',
};

/* ── Info row ────────────────────────────────────────────────────── */
function InfoRow({ label, children }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <span className="text-xs font-semibold text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-gray-800 flex-1">{children ?? <span className="text-gray-400 italic">—</span>}</span>
        </div>
    );
}

/* ── Ticket status badge (small) ─────────────────────────────────── */
function TicketBadge({ status }) {
    const cfg = TICKET_STATUS[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600' };
    return (
        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.cls)}>
            {cfg.label}
        </span>
    );
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function AppointmentShow({ appointment, clientHistory }) {
    const ticket = appointment.ticket;
    const [showConvert, setShowConvert] = useState(false);
    const [converting, setConverting] = useState(false);

    const canConvert = ['confirmed', 'arrived'].includes(appointment.status) && !ticket;

    function doConvert() {
        setConverting(true);
        router.post(route('admin.appointments.convert', appointment.id), {}, {
            onSuccess: () => { setShowConvert(false); setConverting(false); },
            onError: () => { setShowConvert(false); setConverting(false); },
        });
    }

    return (
        <AppLayout title={`RDV — ${formatDateTime(appointment.scheduled_at)}`}>
            <Head title={`Rendez-vous : ${appointment.vehicle_plate ?? appointment.client?.name}`} />

            <div className="space-y-6">
                {/* Back */}
                <Link
                    href={route('admin.appointments.index')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ChevronLeft size={16} /> Retour aux rendez-vous
                </Link>

                {/* Hero */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="flex items-start gap-5 flex-wrap">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <CalendarDays size={28} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900">
                                    {formatDateTime(appointment.scheduled_at)}
                                </h1>
                                <StatusBadge status={appointment.status} />
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                                {appointment.client && (
                                    <span className="flex items-center gap-1">
                                        <User size={13} /> {appointment.client.name}
                                    </span>
                                )}
                                {appointment.vehicle_plate && (
                                    <span className="flex items-center gap-1 font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                        <Car size={12} /> {appointment.vehicle_plate}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Clock size={13} /> {appointment.estimated_duration} min
                                </span>
                                <span className="text-gray-400">
                                    Source : {SOURCE_LABELS[appointment.source] ?? appointment.source}
                                </span>
                            </div>                        </div>
                        {canConvert && (
                            <div className="flex-shrink-0 mt-2 sm:mt-0">
                                <button
                                    onClick={() => setShowConvert(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                                >
                                    <ArrowRightLeft size={15} />
                                    Convertir en ticket
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Détails RDV */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <CalendarDays size={15} className="text-blue-500" />
                            Détails du rendez-vous
                        </h2>
                        <InfoRow label="Statut"><StatusBadge status={appointment.status} /></InfoRow>
                        <InfoRow label="Date planifiée">{formatDateTime(appointment.scheduled_at)}</InfoRow>
                        {appointment.confirmed_at && (
                            <InfoRow label="Confirmé le">{formatDateTime(appointment.confirmed_at)}</InfoRow>
                        )}
                        <InfoRow label="Durée estimée">{appointment.estimated_duration} min</InfoRow>
                        <InfoRow label="Source">{SOURCE_LABELS[appointment.source] ?? appointment.source}</InfoRow>
                        {appointment.laveur && (
                            <InfoRow label="Laveur assigné">{appointment.assigned_to?.name}</InfoRow>
                        )}
                        {appointment.assignedTo && (
                            <InfoRow label="Laveur assigné">{appointment.assignedTo.name}</InfoRow>
                        )}
                        {appointment.vehicle_type && (
                            <InfoRow label="Catégorie">{appointment.vehicle_type.name}</InfoRow>
                        )}
                        {appointment.vehicle_brand && (
                            <InfoRow label="Marque">{appointment.vehicle_brand}</InfoRow>
                        )}
                        {appointment.cancelled_reason && (
                            <InfoRow label="Motif annulation">
                                <span className="text-red-600">{appointment.cancelled_reason}</span>
                            </InfoRow>
                        )}
                        {appointment.notes && (
                            <InfoRow label="Notes">
                                <span className="whitespace-pre-wrap">{appointment.notes}</span>
                            </InfoRow>
                        )}                        {appointment.creator && (
                            <InfoRow label="Créé par">{appointment.creator.name}</InfoRow>
                        )}
                    </div>

                    {/* Client */}
                    <div className="space-y-4">
                        {appointment.client ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <User size={15} className="text-blue-500" />
                                    Client
                                </h2>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-lg">
                                        {appointment.client.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{appointment.client.name}</p>
                                        {appointment.client.phone && (
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Phone size={11} /> {appointment.client.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Link
                                    href={route('admin.clients.show', appointment.client.id)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Voir le profil client →
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <User size={15} className="text-gray-400" /> Client
                                </h2>
                                <p className="text-sm text-gray-400 italic">Client non renseigné</p>
                            </div>
                        )}

                        {/* Ticket lié */}
                        {ticket ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Ticket size={15} className="text-purple-500" />
                                    Ticket associé
                                </h2>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Link
                                            href={route('caissier.tickets.show', ticket.ulid ?? ticket.id)}
                                            className="font-mono font-bold text-blue-600 hover:underline text-base"
                                        >
                                            #{ticket.ticket_number}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1">
                                            <TicketBadge status={ticket.status} />
                                        </div>
                                    </div>
                                </div>
                                {ticket.ticket_services?.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">Services</p>
                                        <ul className="space-y-1">
                                            {ticket.ticket_services.map(ts => (
                                                <li key={ts.id} className="text-xs text-gray-600 flex justify-between">
                                                    <span>{ts.service?.name ?? `Service #${ts.service_id}`}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Ticket size={15} className="text-gray-400" /> Ticket
                                </h2>
                                <p className="text-sm text-gray-400 italic">Aucun ticket généré pour ce RDV.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Historique RDV du client */}
                {clientHistory?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <CalendarDays size={15} className="text-blue-500" />
                            <h2 className="text-sm font-semibold text-gray-700">
                                Autres RDV de ce client
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {clientHistory.map(h => (
                                <div key={h.id} className="flex items-center gap-4 px-6 py-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700">
                                                {formatDateTime(h.scheduled_at)}
                                            </span>
                                            <StatusBadge status={h.status} />
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                                            {h.vehicle_plate && (
                                                <span className="font-mono">{h.vehicle_plate}</span>
                                            )}
                                            {h.assigned_to?.name && (
                                                <span>· {h.assigned_to.name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        href={route('admin.appointments.show', h.id)}
                                        className="text-xs text-blue-600 hover:underline flex-shrink-0"
                                    >
                                        Voir →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}            </div>

            <ConfirmDialog
                open={showConvert}
                title="Convertir en ticket"
                message="Convertir ce rendez-vous en ticket de caisse ? Un ticket sera créé immédiatement et le RDV passera en statut « En cours »."
                confirmLabel={converting ? 'Conversion...' : 'Convertir'}
                onConfirm={doConvert}
                onCancel={() => setShowConvert(false)}
            />
        </AppLayout>
    );
}
