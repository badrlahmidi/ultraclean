import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Calendar, Clock, Car, User as UserIcon, Phone, Waves, ArrowRight } from 'lucide-react';

/**
 * Page publique de confirmation de réservation.
 * Accessible par ULID après un POST /reservations réussi.
 */
export default function ReservationConfirmation({ appointment }) {
    const scheduled = appointment.scheduled_at ? new Date(appointment.scheduled_at) : null;

    return (
        <>
            <Head title="Réservation confirmée" />

            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
                <header className="bg-white/90 backdrop-blur border-b border-gray-200">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                            <Waves size={18} className="text-white" />
                        </div>
                        <p className="text-[15px] font-bold text-gray-900">Réservation</p>
                    </div>
                </header>

                <main className="max-w-2xl mx-auto px-4 py-10">
                    {/* Success header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                            <CheckCircle2 size={32} className="text-emerald-600" strokeWidth={2} />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Réservation enregistrée !
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                            Votre demande est en attente de confirmation. Nous vous contacterons par téléphone pour la valider.
                        </p>
                    </div>

                    {/* Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">

                        <DetailRow
                            icon={Waves}
                            label="Service"
                            value={appointment.service?.name ?? '—'}
                        />

                        <DetailRow
                            icon={Calendar}
                            label="Date"
                            value={scheduled
                                ? scheduled.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                : '—'}
                        />

                        <DetailRow
                            icon={Clock}
                            label="Heure"
                            value={scheduled
                                ? `${scheduled.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (durée ~ ${appointment.estimated_duration} min)`
                                : '—'}
                        />

                        <div className="border-t border-gray-100 pt-4 space-y-4">
                            <DetailRow
                                icon={UserIcon}
                                label="Nom"
                                value={appointment.guest_name ?? '—'}
                            />

                            <DetailRow
                                icon={Phone}
                                label="Téléphone"
                                value={appointment.guest_phone ?? '—'}
                            />

                            {appointment.vehicle_plate && (
                                <DetailRow
                                    icon={Car}
                                    label="Véhicule"
                                    value={appointment.vehicle_plate}
                                />
                            )}
                        </div>

                        {/* Status badge */}
                        <div className="pt-4 border-t border-gray-100">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-xs font-semibold text-yellow-800">
                                <Clock size={12} />
                                En attente de confirmation
                            </div>
                        </div>
                    </div>

                    {/* Reference */}
                    <p className="mt-4 text-center text-xs text-gray-500">
                        Référence : <code className="font-mono text-gray-700">{appointment.ulid}</code>
                    </p>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href={route('reservations.create')}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300"
                        >
                            Nouvelle réservation
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow shadow-blue-200"
                        >
                            Retour à l'accueil <ArrowRight size={14} />
                        </Link>
                    </div>
                </main>
            </div>
        </>
    );
}

function DetailRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
            </div>
        </div>
    );
}
