import AppLayout from '@/Layouts/AppLayout';
import Badge from '@/Components/Badge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
    List, CalendarRange, Plus, Ticket, ChevronLeft, ChevronRight, Clock, User,
} from 'lucide-react';
import { APPT_STATUS, APPT_STATUS_LABELS, APPT_STATUS_CALENDAR_CLS } from '@/utils/constants';

/* ── Tab de navigation Liste ↔ Calendrier ─────────────────────────── */
function AppointmentViewTabs({ active = 'calendar' }) {
    return (
        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
            <a
                href={route('admin.appointments.index')}
                className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active === 'list'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
            >
                <List size={13} />
                Liste
            </a>
            <a
                href={route('admin.appointments.calendar')}
                className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    active === 'calendar'
                        ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
            >
                <CalendarRange size={13} />
                Calendrier
            </a>
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

const STATUS_COLORS = APPT_STATUS_CALENDAR_CLS;
const STATUS_LABELS = APPT_STATUS_LABELS;

/* Maps color names for legend badges (blocs calendar keep STATUS_COLORS) */
const STATUS_BADGE_COLOR = Object.fromEntries(
    Object.entries(APPT_STATUS).map(([k, v]) => [k, v.color])
);

/** Retourne minutes depuis minuit */
function toMinutes(isoString) {
    const d = new Date(isoString);
    return d.getHours() * 60 + d.getMinutes();
}

/** Formatte HH:MM */
function fmtHM(isoOrMinutes) {
    if (typeof isoOrMinutes === 'number') {
        const h = Math.floor(isoOrMinutes / 60);
        const m = isoOrMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const d = new Date(isoOrMinutes);
    return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
    return new Intl.DateTimeFormat('fr-MA', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr + 'T12:00:00'));
}

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

/* ── Bloc RDV dans la grille ──────────────────────────────────────── */

function AppointmentBlock({ appt, pxPerMin, onConvert }) {
    const startMin = toMinutes(appt.scheduled_at);
    const duration = appt.estimated_duration;
    const top = startMin * pxPerMin;
    const height = Math.max(duration * pxPerMin, 28); // min 28px

    return (
        <div
            style={{ top, height, left: 2, right: 2 }}
            className={clsx(
                'absolute rounded-lg border-l-4 px-2 py-1 cursor-default overflow-hidden',
                'text-xs leading-tight shadow-sm',
                STATUS_COLORS[appt.status] ?? STATUS_COLORS.pending,
            )}
        >
            <div className="font-semibold truncate">{appt.client_name}</div>
            {appt.vehicle_plate && (
                <div className="font-mono opacity-80 truncate">{appt.vehicle_plate}</div>
            )}
            <div className="opacity-70">{fmtHM(appt.scheduled_at)} · {duration}min</div>            {/* Actions rapides */}
            <div className="flex gap-1 mt-1 flex-wrap">
                {appt.is_convertible && (
                    <button
                        onClick={() => onConvert(appt.id)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/80 hover:bg-white rounded text-[10px] font-medium border border-current"
                        title="Créer ticket direct"
                    >
                        <Ticket size={10} />
                        Ticket
                    </button>
                )}
                {appt.is_convertible && (
                    <a
                        href={route('caissier.tickets.create') + '?prefill_appointment=' + appt.ulid}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/80 hover:bg-white rounded text-[10px] font-medium border border-current"
                        title="Créer ticket avec services"
                    >
                        <Plus size={10} />
                        + Services
                    </a>
                )}
            </div>
        </div>
    );
}

/* ── Colonne laveur ───────────────────────────────────────────────── */

function WasherColumn({ washer, appointments, openHour, closeHour, pxPerMin, totalMin, onConvert }) {
    const hourSlots = Array.from(
        { length: closeHour - openHour + 1 },
        (_, i) => openHour + i
    );

    return (
        <div className="flex flex-col min-w-[160px] sm:min-w-[200px] flex-1">
            {/* En-tête laveur */}
            <div className="sticky top-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-3 text-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center mx-auto mb-1">
                    {washer.name[0]?.toUpperCase()}
                </div>
                <div className="text-xs font-semibold text-gray-700 truncate">{washer.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{appointments.length} RDV</div>
            </div>

            {/* Grille temporelle */}
            <div
                className="relative border-r border-gray-200 bg-gray-50"
                style={{ height: totalMin * pxPerMin }}
            >
                {/* Lignes horaires */}
                {hourSlots.map(h => (
                    <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-gray-200"
                        style={{ top: (h - openHour) * 60 * pxPerMin }}
                    />
                ))}

                {/* Demi-heures (traits plus légers) */}
                {hourSlots.map(h => (
                    <div
                        key={`${h}-30`}
                        className="absolute left-0 right-0 border-t border-dashed border-gray-100"
                        style={{ top: ((h - openHour) * 60 + 30) * pxPerMin }}
                    />
                ))}

                {/* Blocs RDV */}
                {appointments.map(appt => (
                    <AppointmentBlock
                        key={appt.id}
                        appt={appt}
                        pxPerMin={pxPerMin}
                        onConvert={onConvert}
                    />
                ))}
            </div>
        </div>
    );
}

/* ── Page principale ──────────────────────────────────────────────── */

export default function AppointmentsCalendar({
    date,
    washers,
    appointmentsByWasher,
    washerQueues,
    openHour,
    closeHour,
}) {
    const pxPerMin = 1.4;
    const totalMin = (closeHour - openHour + 1) * 60;
    const [confirmConvertId, setConfirmConvertId] = useState(null);

    const hourSlots = Array.from(
        { length: closeHour - openHour + 1 },
        (_, i) => openHour + i
    );

    function navigate(delta) {
        router.get(route('admin.appointments.calendar'), { date: addDays(date, delta) });
    } function handleConvert(id) {
        setConfirmConvertId(id);
    }
    function doConvert() {
        router.post(route('admin.appointments.convert', confirmConvertId), {}, {
            onSuccess: () => { toast.success('Ticket créé !'); setConfirmConvertId(null); },
            onError: () => { toast.error('Conversion impossible'); setConfirmConvertId(null); },
        });
    }

    // Résumé : total RDV du jour
    const totalAppts = Object.values(appointmentsByWasher).reduce((s, a) => s + a.length, 0);

    return (<AppLayout title="Calendrier RDV">
        <Head title="Calendrier RDV" />
        <ConfirmDialog
            open={!!confirmConvertId}
            title="Convertir en ticket"
            message="Convertir ce RDV en ticket de caisse ? Un ticket sera créé immédiatement."
            confirmLabel="Convertir"
            variant="info"
            onConfirm={doConvert}
            onCancel={() => setConfirmConvertId(null)}
        />

        <div className="space-y-4">            {/* Barre de navigation */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => navigate(-1)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 shrink-0">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold text-gray-900 capitalize truncate">{fmtDate(date)}</h1>
                        <p className="text-xs text-gray-500">{totalAppts} rendez-vous</p>
                    </div>
                    <button onClick={() => navigate(1)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600 shrink-0">
                        <ChevronRight size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <AppointmentViewTabs active="calendar" />
                    <button
                        onClick={() => router.get(route('admin.appointments.calendar'), { date: new Date().toISOString().slice(0, 10) })}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap">
                        Aujourd'hui
                    </button>
                    <a href={route('admin.appointments.index')}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium whitespace-nowrap">
                        <Plus size={15} />
                        Nouveau RDV
                    </a>
                </div>
            </div>{/* Légende statuts */}
            <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(STATUS_LABELS).slice(0, 5).map(([k, lbl]) => (
                    <Badge key={k} color={STATUS_BADGE_COLOR[k] ?? 'gray'}>{lbl}</Badge>
                ))}
            </div>

            {/* Grille calendrier */}
            {washers.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                    <User size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">Aucun laveur actif</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-auto" style={{ maxHeight: '75vh' }}>
                    <div className="flex">
                        {/* Colonne horaires */}
                        <div className="flex-shrink-0 w-14 sm:w-16">
                            <div className="sticky top-0 z-20 bg-white border-b border-r border-gray-200 h-[72px]" />
                            <div className="relative border-r border-gray-200 bg-white" style={{ height: totalMin * pxPerMin }}>
                                {hourSlots.map(h => (
                                    <div
                                        key={h}
                                        className="absolute right-2 text-[10px] text-gray-400 font-mono leading-none"
                                        style={{ top: (h - openHour) * 60 * pxPerMin - 6 }}
                                    >
                                        {String(h).padStart(2, '0')}:00
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Colonnes laveurs */}
                        <div className="flex flex-1 overflow-x-auto">
                            {washers.map(w => (
                                <WasherColumn
                                    key={w.id}
                                    washer={w}
                                    appointments={appointmentsByWasher[w.id] ?? []}
                                    openHour={openHour}
                                    closeHour={closeHour}
                                    pxPerMin={pxPerMin}
                                    totalMin={totalMin}
                                    onConvert={handleConvert}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Résumé disponibilités laveurs */}
            {washers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Clock size={15} className="text-blue-500" />
                        File d'attente live
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {washers.map(w => {
                            const q = washerQueues[w.id] ?? {};
                            const overflow = q.overflow === true;
                            return (
                                <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                        {w.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-medium text-gray-800 truncate">{w.name}</div>
                                        <div className={clsx('text-xs', overflow ? 'text-red-500 font-semibold' : 'text-gray-400')}>
                                            {q.due_at
                                                ? `Dispo ${new Date(q.due_at).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}${overflow ? ' 🔴' : ''}`
                                                : 'Disponible'}
                                        </div>
                                    </div>
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
