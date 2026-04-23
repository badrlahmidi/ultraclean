import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    Eye, EyeOff, LogIn, Lock, User as UserIcon,
    ShieldCheck, CheckCircle2, Calendar,
} from 'lucide-react';
import InputError from '@/Components/InputError';
import clsx from 'clsx';



// ── Security trust badge ──────────────────────────────────────────────────────
function SecurityBadge() {
    return (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 select-none whitespace-nowrap">
            <ShieldCheck size={11} strokeWidth={2.5} aria-hidden="true" />
            <span className="font-semibold tracking-wide">Connexion sécurisée</span>
        </div>
    );
}

// ── Car wash SVG icon (branding fallback) ─────────────────────────────────────
function CarWashIcon({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className={className} aria-hidden="true">
            <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" />
            <path d="M9 17h6" />
            <path d="M14 7l-3-3" />
            <path d="M3 11h18" />
        </svg>
    );
}

// =============================================================================
// MAIN LOGIN — Split Screen
// =============================================================================
export default function Login({ status, centerName, centerLogo }) {
    const [showPwd, setShowPwd] = useState(false);
    const displayName = centerName || 'Centre de Lavage';

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Head title={`Connexion — ${displayName}`} />            {/* ================================================================
                LEFT PANEL — light branding
            ================================================================ */}
            <aside aria-hidden="true"
                className="hidden lg:flex lg:w-[42%] xl:w-[38%] relative flex-col items-center justify-between bg-gradient-to-br from-white via-blue-50 to-indigo-100 border-r border-indigo-100 overflow-hidden">

                {/* Subtle dot grid */}
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none"
                    style={{ backgroundImage: 'radial-gradient(circle,#6366f1 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

                {/* Decorative blobs */}
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-200/50 rounded-full blur-3xl pointer-events-none" />                {/* Top — RitajPOS logo (fixe pour toutes les installations) */}
                <div className="relative z-10 pt-8 px-8 self-start">
                    <img
                        src="/images/ritajpos-logo.png"
                        alt="RitajPOS"
                        className="h-8 w-auto object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.nextElementSibling;
                            if (fb) fb.classList.remove('hidden');
                        }}
                    />
                    {/* Fallback */}
                    <div className="hidden items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shadow-sm">
                            <span className="text-white font-black text-xs">R</span>
                        </div>
                        <span className="text-blue-700 font-bold text-sm tracking-tight">RitajPOS</span>
                    </div>
                </div>

                {/* Center — logo + features */}
                <div className="relative z-10 flex flex-col items-center text-center px-10">

                    {/* Main logo */}
                    <div className="mb-8 flex flex-col items-center">
                        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100/60 border border-blue-100/80 px-8 py-6 flex items-center justify-center mb-5">
                            <img
                                src="/images/ritajpos-logo.png"
                                alt="RitajPOS"
                                className="h-14 w-auto object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fb = e.currentTarget.nextElementSibling;
                                    if (fb) fb.classList.remove('hidden');
                                }}
                            />
                            {/* Fallback text if image missing */}
                            <div className="hidden items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow">
                                    <CarWashIcon className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-blue-700 font-black text-2xl tracking-tight">RitajPOS</span>
                            </div>
                        </div>                        {centerLogo && (
                            <div className="flex flex-col items-center gap-1.5 mt-1">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <div className="h-px w-8 bg-gray-200" />
                                    <span className="text-[9px] uppercase tracking-widest font-semibold text-gray-400">pour</span>
                                    <div className="h-px w-8 bg-gray-200" />
                                </div>
                                <img src={centerLogo} alt={displayName}
                                    className="h-10 w-auto object-contain mt-1" />
                            </div>
                        )}
                        {/* Pas de texte fallback — le logo station est configuré dans les paramètres */}
                    </div>                    {/* Features — semantic list for screen readers */}
                    <ul
                        aria-label="Fonctionnalités principales"
                        className="flex flex-col gap-3 text-left w-full max-w-[240px] list-none m-0 p-0"
                    >
                        {[
                            { text: 'Gestion des ventes en temps réel', color: 'bg-blue-100 text-blue-600' },
                            { text: 'Suivi du programme de fidélité', color: 'bg-violet-100 text-violet-600' },
                            { text: 'Rapports & statistiques détaillés', color: 'bg-emerald-100 text-emerald-600' },
                        ].map(({ text, color }) => (
                            <li key={text} className="flex items-center gap-2.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${color}`} aria-hidden="true">
                                    <CheckCircle2 size={11} strokeWidth={2.5} />
                                </div>
                                <span className="text-[12px] text-gray-600 font-medium">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>                {/* Footer — Ritaj Informatique SARL */}                <div className="relative z-10 pb-7 px-8 flex flex-col items-center gap-1">
                    <div className="h-px w-20 bg-gray-200 mb-2" />
                    <span className="text-[11px] font-bold text-gray-500 tracking-tight">
                        Ritaj Informatique SARL
                    </span>
                    <a
                        href="tel:+212708193605"
                        aria-label="Appeler Ritaj Informatique au +212 708 193 605"
                        className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors"
                    >
                        +212 708 193 605
                    </a>
                    <p className="text-[10px] text-gray-400">&copy; {new Date().getFullYear()} — Tous droits réservés</p>
                </div>
            </aside>

            {/* ================================================================
                RIGHT PANEL — login form
            ================================================================ */}
            <main className="flex-1 flex flex-col min-h-screen">                {/* Mobile top bar */}
                <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                    {/* Left — station logo or nothing */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        {centerLogo && (
                            <img src={centerLogo} alt={displayName}
                                className="h-8 w-auto object-contain" />
                        )}
                    </div>
                    {/* Right — RitajPOS logo (fixe) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <img
                            src="/images/ritajpos-logo.png"
                            alt="RitajPOS"
                            className="h-7 w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fb = e.currentTarget.nextElementSibling;
                                if (fb) fb.classList.remove('hidden');
                            }}
                        />
                        {/* Fallback */}
                        <div className="hidden items-center gap-1.5">
                            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shadow-sm">
                                <span className="text-white font-black text-xs">R</span>
                            </div>
                            <span className="text-blue-700 font-bold text-sm tracking-tight">RitajPOS Lavage</span>
                        </div>
                    </div>
                </div>

                {/* Centered content */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
                    <div className="w-full max-w-[420px]">

                        {/* Heading + security badge */}
                        <div className="mb-6 flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Connexion</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Entrez vos identifiants pour accéder au système
                                </p>
                            </div>
                            <div className="shrink-0 mt-1"><SecurityBadge /></div>
                        </div>

                        {/* Status banner */}
                        {status && (
                            <div role="status"
                                className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
                                <CheckCircle2 size={15} />{status}
                            </div>
                        )}

                        {/* Form card */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm">
                            <form onSubmit={submit} className="space-y-5" noValidate>

                                {/* Identifier — email or username */}
                                <div>
                                    <label htmlFor="login-identifier"
                                        className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Email ou nom d'utilisateur
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="login-identifier"
                                            type="text"
                                            name="email"
                                            autoComplete="username"
                                            autoFocus
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            aria-describedby={errors.email ? 'identifier-error' : undefined}
                                            aria-invalid={!!errors.email}
                                            placeholder="admin ou admin@exemple.ma"
                                            className={clsx(
                                                'w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm transition-colors',
                                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                                errors.email
                                                    ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
                                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                            )}
                                        />
                                        <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                    <InputError id="identifier-error" message={errors.email} className="mt-1.5" />
                                </div>

                                {/* Password */}
                                <div>
                                    <label htmlFor="login-password"
                                        className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Mot de passe
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="login-password"
                                            type={showPwd ? 'text' : 'password'}
                                            name="password"
                                            autoComplete="current-password"
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            aria-describedby={errors.password ? 'password-error' : undefined}
                                            aria-invalid={!!errors.password}
                                            placeholder="••••••••"
                                            className={clsx(
                                                'w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm transition-colors',
                                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                                errors.password
                                                    ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
                                                    : 'border-gray-300 bg-white hover:border-gray-400'
                                            )}
                                        />
                                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPwd(s => !s)}
                                            aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                        >
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    <InputError id="password-error" message={errors.password} className="mt-1.5" />
                                </div>

                                {/* Remember me */}
                                <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={e => setData('remember', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="group-hover:text-gray-800 transition-colors">Se souvenir de moi</span>
                                </label>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-500/25 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Connexion…
                                        </>
                                    ) : (
                                        <>
                                            <LogIn size={15} />
                                            Se connecter
                                        </>
                                    )}
                                </button>

                                {/* Lien vers la réservation publique */}
                                <div className="pt-2 text-center border-t border-gray-100 mt-4">
                                    <p className="text-xs text-gray-500 mb-2">Vous êtes un client ?</p>
                                    <Link
                                        href={route('reservations.create')}
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        <Calendar size={14} />
                                        Réserver un lavage en ligne
                                    </Link>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>                {/* Mobile footer */}
                <div className="lg:hidden py-4 text-center border-t border-gray-100 bg-white">

                    <p className="text-[10px] text-gray-600 mt-0.5">&copy; {new Date().getFullYear()} — Solution propulsée par </p>
                    <a href="tel:+212708193605"
                        className="text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-colors">
                        Ritaj Informatique SARL
                    </a>
                </div>
            </main>
        </div>
    );
}

