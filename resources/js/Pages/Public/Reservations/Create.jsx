import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import {
    Waves, Calendar, Clock, Car, User as UserIcon, Phone, Mail,
    CheckCircle2, AlertCircle, ChevronRight, ArrowRight, LogIn, MapPin,
} from 'lucide-react';
import clsx from 'clsx';
import InputError from '@/Components/InputError';

/**
 * Page publique — Réservation en ligne.
 *
 * Flux :
 *   1. Le visiteur choisit un service
 *   2. Puis une date
 *   3. Puis une heure (la page interroge /api/reservations/availability
 *      pour masquer les créneaux déjà réservés — règle "1 service/heure")
 *   4. Il remplit ses coordonnées et valide
 */

function formatMAD(cents) {
    if (cents == null || cents === 0) return '—';
    return `${(cents / 100).toFixed(2)} MAD`;
}

/** Retourne les 14 prochains jours (aujourd'hui inclus). */
function nextDays(count = 14) {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < count; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
    }
    return days;
}

function toISODate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function dayLabel(d) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ReservationCreate({ services = [], settings = {}, openHour = 8, closeHour = 21 }) {
    const { data, setData, post, processing, errors } = useForm({
        service_id: '',
        scheduled_date: '',
        scheduled_hour: '',
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        vehicle_plate: '',
        vehicle_brand: '',
        notes: '',
    });

    const [step, setStep] = useState(1); // 1=service, 2=date/heure, 3=coords
    const [availability, setAvailability] = useState(null); // [{hour, label, available, reason}]
    const [loadingSlots, setLoadingSlots] = useState(false);

    const selectedService = useMemo(
        () => services.find(s => String(s.id) === String(data.service_id)),
        [services, data.service_id]
    );

    const days = useMemo(() => nextDays(14), []);

    // ── Fetch available slots whenever service + date change ───────────────
    useEffect(() => {
        if (!data.service_id || !data.scheduled_date) {
            setAvailability(null);
            return;
        }
        let cancelled = false;
        setLoadingSlots(true);
        fetch(
            `/api/reservations/availability?service_id=${data.service_id}&date=${data.scheduled_date}`,
            { headers: { Accept: 'application/json' } }
        )
            .then(r => r.json())
            .then(json => { if (!cancelled) setAvailability(json.slots ?? []); })
            .catch(() => { if (!cancelled) setAvailability([]); })
            .finally(() => { if (!cancelled) setLoadingSlots(false); });
        return () => { cancelled = true; };
    }, [data.service_id, data.scheduled_date]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('reservations.store'));
    };

    const canAdvanceToStep2 = !!data.service_id;
    const canAdvanceToStep3 = !!data.service_id && !!data.scheduled_date && data.scheduled_hour !== '';

    return (
        <>
            <Head title="Réserver un lavage" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                {/* ── Header ── */}
                <header className="bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-20">
                    <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                        <Link href="/reservations" className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                                <Waves size={18} className="text-white" />
                            </div>
                            <div className="leading-tight">
                                <p className="text-[15px] font-bold text-gray-900">{settings.center_name || 'Lavage Auto'}</p>
                                <p className="text-[11px] text-gray-500">Réservation en ligne</p>
                            </div>
                        </Link>
                        <Link
                            href={route('login')}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            <LogIn size={14} />
                            <span className="hidden sm:inline">Espace pro</span>
                        </Link>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 py-6 md:py-10">
                    {/* ── Hero ── */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Réservez votre lavage en ligne
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
                            Choisissez votre service, votre créneau horaire, et nous vous attendons.
                            <br />
                            <span className="text-xs text-gray-500">Un seul service par heure — pensez à réserver tôt.</span>
                        </p>
                    </div>

                    {/* ── Stepper ── */}
                    <Stepper step={step} />

                    <form onSubmit={handleSubmit} className="mt-6 space-y-6">

                        {/* ─── Étape 1 : service ─── */}
                        <Card active={step === 1} done={step > 1}>
                            <CardHeader
                                icon={Waves}
                                title="1. Quel service ?"
                                subtitle={selectedService ? `Choisi : ${selectedService.name}` : 'Sélectionnez un service'}
                                onEdit={step > 1 ? () => setStep(1) : null}
                            />
                            {step === 1 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    {services.map(svc => (
                                        <button
                                            key={svc.id}
                                            type="button"
                                            onClick={() => { setData('service_id', String(svc.id)); }}
                                            className={clsx(
                                                'p-4 border-2 rounded-xl text-left transition-all',
                                                String(data.service_id) === String(svc.id)
                                                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                {svc.color && (
                                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: svc.color }} />
                                                )}
                                                <span className="font-semibold text-gray-900 text-sm">{svc.name}</span>
                                            </div>
                                            {svc.description && (
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{svc.description}</p>
                                            )}
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-gray-500">
                                                    <Clock size={11} />
                                                    {svc.duration_minutes ?? 30} min
                                                </span>
                                                {svc.base_price_cents > 0 && (
                                                    <span className="font-bold text-blue-700">
                                                        {formatMAD(svc.base_price_cents)}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                    <InputError message={errors.service_id} className="col-span-full mt-1" />
                                    <div className="col-span-full flex justify-end mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            disabled={!canAdvanceToStep2}
                                            className={clsx(
                                                'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
                                                canAdvanceToStep2
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow shadow-blue-200'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            )}
                                        >
                                            Continuer <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* ─── Étape 2 : date + heure ─── */}
                        <Card active={step === 2} done={step > 2} disabled={step < 2}>
                            <CardHeader
                                icon={Calendar}
                                title="2. Quand ?"
                                subtitle={
                                    data.scheduled_date && data.scheduled_hour !== ''
                                        ? `Le ${new Date(data.scheduled_date).toLocaleDateString('fr-FR')} à ${String(data.scheduled_hour).padStart(2, '0')}h00`
                                        : 'Choisissez une date et une heure'
                                }
                                onEdit={step > 2 ? () => setStep(2) : null}
                            />
                            {step === 2 && (
                                <div className="mt-4 space-y-4">
                                    {/* Jours */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                            Date
                                        </label>
                                        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                                            {days.map(d => {
                                                const iso = toISODate(d);
                                                const selected = data.scheduled_date === iso;
                                                return (
                                                    <button
                                                        key={iso}
                                                        type="button"
                                                        onClick={() => {
                                                            setData('scheduled_date', iso);
                                                            setData('scheduled_hour', '');
                                                        }}
                                                        className={clsx(
                                                            'py-2 px-1 text-xs font-medium rounded-lg border-2 transition-all',
                                                            selected
                                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                                        )}
                                                    >
                                                        {dayLabel(d)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <InputError message={errors.scheduled_date} className="mt-1" />
                                    </div>

                                    {/* Créneaux */}
                                    {data.scheduled_date && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                                Créneau horaire
                                            </label>
                                            {loadingSlots ? (
                                                <p className="text-sm text-gray-400 italic py-4">
                                                    Chargement des créneaux disponibles…
                                                </p>
                                            ) : availability && availability.length > 0 ? (
                                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                                    {availability.map(slot => {
                                                        const selected = String(data.scheduled_hour) === String(slot.hour);
                                                        return (
                                                            <button
                                                                key={slot.hour}
                                                                type="button"
                                                                disabled={!slot.available}
                                                                onClick={() => setData('scheduled_hour', slot.hour)}
                                                                title={
                                                                    slot.reason === 'taken'
                                                                        ? 'Créneau déjà réservé'
                                                                        : slot.reason === 'past'
                                                                            ? 'Créneau passé'
                                                                            : ''
                                                                }
                                                                className={clsx(
                                                                    'py-2 px-1 text-sm font-medium rounded-lg border-2 transition-all',
                                                                    !slot.available
                                                                        ? 'border-gray-100 bg-gray-50 text-gray-300 line-through cursor-not-allowed'
                                                                        : selected
                                                                            ? 'border-blue-600 bg-blue-600 text-white'
                                                                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                                                )}
                                                            >
                                                                {slot.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic py-4">
                                                    Aucun créneau disponible ce jour-là.
                                                </p>
                                            )}
                                            <InputError message={errors.scheduled_hour} className="mt-1" />
                                            {/* Rappel règle métier */}
                                            <p className="mt-3 text-[11px] text-gray-500 flex items-start gap-1.5">
                                                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                                Les créneaux <span className="line-through">barrés</span> sont déjà réservés par un autre client. Un seul service est acceptable par heure.
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-between mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                                        >
                                            ← Retour
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            disabled={!canAdvanceToStep3}
                                            className={clsx(
                                                'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
                                                canAdvanceToStep3
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow shadow-blue-200'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            )}
                                        >
                                            Continuer <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* ─── Étape 3 : coordonnées ─── */}
                        <Card active={step === 3} disabled={step < 3}>
                            <CardHeader
                                icon={UserIcon}
                                title="3. Vos coordonnées"
                                subtitle="Nous vous contacterons pour confirmer votre rendez-vous"
                            />
                            {step === 3 && (
                                <div className="mt-4 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field
                                            icon={UserIcon}
                                            label="Nom complet *"
                                            value={data.guest_name}
                                            onChange={v => setData('guest_name', v)}
                                            error={errors.guest_name}
                                            placeholder="Mohammed Alami"
                                            autoComplete="name"
                                        />
                                        <Field
                                            icon={Phone}
                                            label="Téléphone *"
                                            value={data.guest_phone}
                                            onChange={v => setData('guest_phone', v)}
                                            error={errors.guest_phone}
                                            placeholder="06 12 34 56 78"
                                            type="tel"
                                            autoComplete="tel"
                                        />
                                    </div>
                                    <Field
                                        icon={Mail}
                                        label="Email (optionnel)"
                                        value={data.guest_email}
                                        onChange={v => setData('guest_email', v)}
                                        error={errors.guest_email}
                                        placeholder="mohammed@example.com"
                                        type="email"
                                        autoComplete="email"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field
                                            icon={Car}
                                            label="Plaque d'immatriculation"
                                            value={data.vehicle_plate}
                                            onChange={v => setData('vehicle_plate', v)}
                                            error={errors.vehicle_plate}
                                            placeholder="123-A-45"
                                        />
                                        <Field
                                            icon={Car}
                                            label="Marque du véhicule"
                                            value={data.vehicle_brand}
                                            onChange={v => setData('vehicle_brand', v)}
                                            error={errors.vehicle_brand}
                                            placeholder="Renault, Dacia…"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                            Remarques (optionnel)
                                        </label>
                                        <textarea
                                            value={data.notes}
                                            onChange={e => setData('notes', e.target.value)}
                                            placeholder="Demandes particulières…"
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 outline-none"
                                        />
                                        <InputError message={errors.notes} className="mt-1" />
                                    </div>

                                    {/* Recap */}
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                                        <p className="font-semibold text-blue-900 mb-1.5">Récapitulatif</p>
                                        <p className="text-blue-800">
                                            <strong>{selectedService?.name}</strong>
                                            {' — '}
                                            {data.scheduled_date && new Date(data.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            {' à '}
                                            <strong>{String(data.scheduled_hour).padStart(2, '0')}h00</strong>
                                        </p>
                                    </div>

                                    <div className="flex justify-between mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                                        >
                                            ← Retour
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow shadow-emerald-200 disabled:opacity-60"
                                        >
                                            {processing ? 'Envoi…' : 'Confirmer la réservation'}
                                            {!processing && <CheckCircle2 size={15} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>

                    </form>

                    {/* ── Footer ── */}
                    <footer className="mt-10 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 space-y-1">
                        {settings.center_address && (
                            <p className="flex items-center justify-center gap-1"><MapPin size={11} /> {settings.center_address}</p>
                        )}
                        {settings.center_phone && (
                            <p className="flex items-center justify-center gap-1"><Phone size={11} /> {settings.center_phone}</p>
                        )}
                        <p className="pt-2">© {new Date().getFullYear()} {settings.center_name || 'Lavage Auto'}</p>
                    </footer>
                </main>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Stepper({ step }) {
    const items = [
        { n: 1, label: 'Service' },
        { n: 2, label: 'Créneau' },
        { n: 3, label: 'Coordonnées' },
    ];
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3">
            {items.map((it, i) => (
                <div key={it.n} className="flex items-center gap-2 sm:gap-3">
                    <div className={clsx(
                        'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                        step === it.n ? 'bg-blue-600 text-white'
                            : step > it.n ? 'bg-emerald-500 text-white'
                                : 'bg-gray-200 text-gray-500'
                    )}>
                        {step > it.n ? <CheckCircle2 size={14} /> : it.n}
                    </div>
                    <span className={clsx(
                        'text-xs sm:text-sm font-medium hidden sm:inline',
                        step === it.n ? 'text-blue-600' : step > it.n ? 'text-emerald-600' : 'text-gray-400'
                    )}>
                        {it.label}
                    </span>
                    {i < items.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
                </div>
            ))}
        </div>
    );
}

function Card({ active, done, disabled, children }) {
    return (
        <div className={clsx(
            'rounded-2xl border p-5 transition-all',
            disabled ? 'bg-gray-50/50 border-gray-100 opacity-60' :
                active ? 'bg-white border-blue-200 shadow-sm' :
                    done ? 'bg-white border-emerald-100 shadow-sm' :
                        'bg-white border-gray-200'
        )}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, title, subtitle, onEdit }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-bold text-gray-900 leading-tight">{title}</h2>
                <p className="text-xs text-gray-500 leading-snug mt-0.5 truncate">{subtitle}</p>
            </div>
            {onEdit && (
                <button type="button" onClick={onEdit} className="text-xs font-medium text-blue-600 hover:underline flex-shrink-0">
                    Modifier
                </button>
            )}
        </div>
    );
}

function Field({ icon: Icon, label, value, onChange, error, placeholder, type = 'text', autoComplete }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <div className="relative">
                {Icon && (
                    <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                )}
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={clsx(
                        'w-full py-2 text-sm border-2 rounded-lg outline-none transition-colors',
                        Icon ? 'pl-9 pr-3' : 'px-3',
                        error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    )}
                />
            </div>
            <InputError message={error} className="mt-1" />
        </div>
    );
}
