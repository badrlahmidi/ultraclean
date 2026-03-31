import { Head } from '@inertiajs/react';
import { Car, CheckCircle2, Clock, Wrench, CreditCard, Waves, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_CONFIG = {
    pending: {
        label: 'En attente',
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: Clock,
        description: 'Votre véhicule est en file d\'attente et sera pris en charge sous peu.',
        step: 1,
    },
    in_progress: {
        label: 'En cours de lavage',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Wrench,
        description: 'Votre véhicule est en cours de lavage. Merci de patienter.',
        step: 2,
    },
    completed: {
        label: 'Lavage terminé',
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: CheckCircle2,
        description: 'Le lavage est terminé ! Rendez-vous à la caisse pour régler.',
        step: 3,
    },
    paid: {
        label: 'Payé — Terminé',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CreditCard,
        description: 'Paiement confirmé. Merci pour votre visite !',
        step: 4,
    },
    cancelled: {
        label: 'Annulé',
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle,
        description: 'Ce ticket a été annulé.',
        step: 0,
    },
};

function formatMAD(cents) {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format((cents ?? 0) / 100);
}
function formatTime(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Barre de progression ─── */
const STEPS = [
    { step: 1, label: 'En attente' },
    { step: 2, label: 'En lavage' },
    { step: 3, label: 'Terminé' },
    { step: 4, label: 'Payé' },
];

function ProgressBar({ currentStep }) {
    if (currentStep === 0) return null;
    return (
        <div className="flex items-center justify-between w-full mt-6 px-2">
            {STEPS.map((s, i) => {
                const done = currentStep > s.step;
                const active = currentStep === s.step;
                return (
                    <div key={s.step} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                            <div className={[
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                                done ? 'bg-green-500 text-white' :
                                    active ? 'bg-blue-500 text-white ring-4 ring-blue-100' :
                                        'bg-gray-100 text-gray-400'
                            ].join(' ')}>
                                {done ? '✓' : s.step}
                            </div>
                            <span className={[
                                'text-[10px] mt-1 font-medium whitespace-nowrap hidden sm:block',
                                done ? 'text-green-600' : active ? 'text-blue-600' : 'text-gray-400'
                            ].join(' ')}>
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={[
                                'flex-1 h-1 mx-1 rounded transition-all',
                                currentStep > s.step ? 'bg-green-400' : 'bg-gray-100'
                            ].join(' ')} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function ClientPortal({ ticket }) {
    const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = cfg.icon;
    const ticketUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/ticket/${ticket.ulid}`
        : `/ticket/${ticket.ulid}`;

    return (
        <>
            <Head title={`Ticket ${ticket.ticket_number} — Suivi`} />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-start py-8 px-4">

                {/* Header marque */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                        <Waves size={22} className="text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-800">UltraClean</span>
                </div>

                <div className="w-full max-w-md space-y-4">

                    {/* Carte statut principal */}
                    <div className={['rounded-2xl border-2 p-6', cfg.color].join(' ')}>
                        <div className="flex items-center gap-3 mb-3">
                            <StatusIcon size={28} className="flex-shrink-0" />
                            <div>
                                <p className="font-bold text-lg leading-tight">{cfg.label}</p>
                                <p className="text-xs opacity-70 font-mono">{ticket.ticket_number}</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-80">{cfg.description}</p>
                        <ProgressBar currentStep={cfg.step} />
                    </div>

                    {/* Infos véhicule */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Car size={16} className="text-gray-500" />
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Véhicule</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-400">Plaque</p>
                                <p className="font-bold text-gray-900">{ticket.vehicle_plate ?? '—'}</p>
                            </div>
                            {ticket.vehicle_brand && (
                                <div>
                                    <p className="text-xs text-gray-400">Marque / Modèle</p>
                                    <p className="font-medium text-gray-900">
                                        {ticket.vehicle_brand}{ticket.vehicle_model ? ` ${ticket.vehicle_model}` : ''}
                                    </p>
                                </div>
                            )}
                            {ticket.vehicle_type && (
                                <div>
                                    <p className="text-xs text-gray-400">Catégorie</p>
                                    <p className="font-medium text-gray-900">{ticket.vehicle_type}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-gray-400">Date</p>
                                <p className="font-medium text-gray-900">{formatDate(ticket.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Chronologie */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Chronologie</h3>
                        <div className="space-y-2 text-sm">
                            {[
                                { label: 'Arrivée', time: ticket.created_at },
                                { label: 'Lavage démarré', time: ticket.started_at },
                                { label: 'Lavage terminé', time: ticket.completed_at },
                                { label: 'Paiement', time: ticket.paid_at },
                            ].map(({ label, time }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-gray-500">{label}</span>
                                    <span className={['font-medium tabular-nums', time ? 'text-gray-900' : 'text-gray-300'].join(' ')}>
                                        {formatTime(time)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Services */}
                    {ticket.services?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Prestations</h3>
                            <div className="space-y-2">
                                {ticket.services.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700">{s.name}</span>
                                        <span className="font-medium text-gray-900 tabular-nums">{formatMAD(s.price)}</span>
                                    </div>
                                ))}
                                <div className="border-t border-gray-100 pt-2 mt-2 flex items-center justify-between font-bold">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-blue-700 text-base">{formatMAD(ticket.total_cents)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* QR code */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col items-center gap-3">
                        <QRCodeSVG value={ticketUrl} size={100} level="M"
                            bgColor="#ffffff" fgColor="#1e293b"
                            imageSettings={{ excavate: true }} />
                        <p className="text-xs text-gray-400 text-center">Partagez ce QR code pour retrouver ce ticket</p>
                    </div>

                    <p className="text-center text-xs text-gray-400 pb-4">
                        Ce lien est public — ne partagez qu'avec des personnes de confiance.
                    </p>
                </div>
            </div>
        </>
    );
}
